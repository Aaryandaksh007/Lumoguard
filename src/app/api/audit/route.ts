import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { VerificationOrchestrator } from "@/lib/orchestrator";
import { ensureSeeded, loadCanon } from "@/lib/seed";
import type { VisualMeta } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/audit — Run the Two-Stage Pre-Publication Audit.
 * body: { assetId: string, airGapped?: boolean, simulateLlmFailure?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { assetId, airGapped = false, simulateLlmFailure = false } = body ?? {};
    if (!assetId) return NextResponse.json({ error: "assetId is required" }, { status: 400 });

    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const canon = await loadCanon();
    const visualMeta: VisualMeta | null = asset.visualMeta
      ? JSON.parse(asset.visualMeta)
      : null;

    const orchestrator = new VerificationOrchestrator(canon);
    const result = await orchestrator.runPreflightAudit({
      title: asset.title,
      content: asset.content,
      assetType: asset.assetType,
      visualMeta,
      assetId: asset.id,
      airGapped,
      simulateLlmFailure,
    });

    // Persist the run
    const run = await db.auditRun.create({
      data: {
        runId: result.runId,
        assetId: asset.id,
        scrubbedContent: result.scrubbedContent,
        tokenMap: JSON.stringify(result.tokenMap),
        readinessScore: result.readinessScore,
        stage1LatencyMs: result.stage1LatencyMs,
        stage2LatencyMs: result.stage2LatencyMs,
        totalLatencyMs: result.totalLatencyMs,
        llmStatus: result.llmStatus,
        llmModel: result.llmModel,
        promptVersion: result.promptVersion,
        paypalStatus: result.paypalStatus ?? null,
        paypalLatencyMs: result.paypalLatencyMs ?? null,
        findingsByPillar: JSON.stringify(result.findingsByPillar),
        findingsBySeverity: JSON.stringify(result.findingsBySeverity),
      },
    });

    // Persist the PayPal order receipts (Checkout Truth Engine evidence)
    if (result.paypalOrders && result.paypalOrders.length > 0) {
      await db.paypalOrder.createMany({
        data: result.paypalOrders.map((o) => ({
          orderId: o.orderId,
          runId: run.id,
          purpose: o.purpose,
          environment: o.environment,
          status: o.status,
          amountValue: o.amountValue,
          currencyCode: o.currencyCode,
          itemSku: o.itemSku ?? null,
          breakdown: JSON.stringify(o.breakdown),
        })),
      });
    }

    // Persist findings
    if (result.findings.length > 0) {
      await db.finding.createMany({
        data: result.findings.map((f, i) => ({
          findingId: `find-${run.id.slice(-6)}-${i}`,
          runId: run.id,
          pillar: f.pillar,
          ruleId: f.ruleId,
          severity: f.severity,
          verdict: f.verdict ?? null,
          originalSpan: f.originalSpan,
          charStart: f.charStart,
          charEnd: f.charEnd,
          suggestedDiff: f.suggestedDiff ?? null,
          explanation: f.explanation,
          provenance: JSON.stringify(f.provenance),
          intentPreservation: f.intentPreservation,
        })),
      });
    }

    // Update asset status (DRAFT → PREFLIGHT_CHECKED; keep review states intact)
    if (asset.status === "DRAFT" || asset.status === "CHANGES_REQUESTED") {
      await db.asset.update({
        where: { id: asset.id },
        data: { status: "PREFLIGHT_CHECKED" },
      });
    }

    // Increment telemetry trigger counters per rule
    const byRule = new Map<string, number>();
    for (const f of result.findings) {
      if (f.severity === "INFO") continue;
      byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1);
    }
    for (const [ruleId, count] of byRule) {
      const existing = await db.guidelineTelemetry.findUnique({ where: { ruleId } });
      if (existing) {
        await db.guidelineTelemetry.update({
          where: { ruleId },
          data: { triggersCount: { increment: count } },
        });
      } else {
        const name =
          RULE_NAMES[ruleId] ??
          result.findings.find((f) => f.ruleId === ruleId)?.pillar ??
          "Unnamed Rule";
        await db.guidelineTelemetry.create({
          data: {
            ruleId,
            ruleName: name,
            pillar: result.findings.find((f) => f.ruleId === ruleId)?.pillar ?? "TERMINOLOGY",
            triggersCount: count,
          },
        });
      }
    }

    // Override carry-forward: identical (ruleId + span) findings that a human
    // previously overrode with a recorded justification stay resolved — the
    // prior sign-off carries into this run instead of re-litigating the flag.
    const priorOverrides = await db.finding.findMany({
      where: { status: "OVERRIDDEN", run: { assetId: asset.id } },
      include: { actions: true },
    });
    const overrideKeys = new Set(priorOverrides.map((o) => `${o.ruleId}::${o.originalSpan}`));
    if (overrideKeys.size > 0) {
      const newFindings = await db.finding.findMany({ where: { runId: run.id } });
      for (const nf of newFindings) {
        if (overrideKeys.has(`${nf.ruleId}::${nf.originalSpan}`) && nf.status === "PENDING") {
          const prior = priorOverrides.find(
            (o) => `${o.ruleId}::${o.originalSpan}` === `${nf.ruleId}::${nf.originalSpan}`
          );
          await db.finding.update({
            where: { id: nf.id },
            data: {
              status: "OVERRIDDEN",
              explanation:
                nf.explanation +
                " [Carried forward: a reviewer previously overrode this exact flag with a recorded justification — the sign-off persists until the canon or the content materially changes.]",
            },
          });
          if (prior) {
            await db.reviewAction.create({
              data: {
                actionId: `rev-carry-${nf.id.slice(-8)}`,
                findingId: nf.id,
                action: "OVERRIDE",
                actorRole: prior.actions[0]?.actorRole ?? "BRAND_MANAGER",
                overrideReason: prior.actions[0]?.overrideReason ?? "APPROVED_EXCEPTION",
                comment: `Carried forward from ${prior.findingId}: ${prior.actions[0]?.comment ?? "(original justification on record)"}`,
              },
            });
          }
        }
      }
    }

    await db.auditLog.create({
      data: {
        action: "PREFLIGHT_AUDIT_RUN",
        actor: "CREATOR",
        details: JSON.stringify({
          assetId: asset.id,
          runId: run.id,
          findings: result.findings.length,
          readiness: result.readinessScore,
          stage1Ms: result.stage1LatencyMs,
          stage2Ms: result.stage2LatencyMs,
          llmStatus: result.llmStatus,
          paypal: {
            status: result.paypalStatus,
            latencyMs: result.paypalLatencyMs,
            orders: result.paypalOrders?.map((o) => ({
              orderId: o.orderId,
              sku: o.itemSku,
              amount: `${o.amountValue} ${o.currencyCode}`,
              environment: o.environment,
            })) ?? [],
          },
          airGapped,
        }),
      },
    });

    const persistedRun = await db.auditRun.findUnique({
      where: { id: run.id },
      include: {
        findings: true,
        paypalOrders: true,
      },
    });

    persistedRun!.findings.sort(
      (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
    );

    return NextResponse.json({
      run: {
        ...persistedRun,
        findingsByPillar: JSON.parse(persistedRun!.findingsByPillar),
        findingsBySeverity: JSON.parse(persistedRun!.findingsBySeverity),
        tokenMap: JSON.parse(persistedRun!.tokenMap),
        paypalOrders: persistedRun!.paypalOrders.map((o) => ({
          orderId: o.orderId,
          purpose: o.purpose,
          environment: o.environment,
          status: o.status,
          amountValue: o.amountValue,
          currencyCode: o.currencyCode,
          itemSku: o.itemSku,
        })),
        findings: persistedRun!.findings.map((f) => ({
          ...f,
          provenance: JSON.parse(f.provenance),
          diffChunks: [],
        })),
      },
    });
  } catch (err) {
    console.error("[api/audit POST]", err);
    return NextResponse.json({ error: "Audit orchestration failed" }, { status: 500 });
  }
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

const RULE_NAMES: Record<string, string> = {
  "RULE-TERM-001": "Standard Mark Casing (Inkloom AI, never InkLoom)",
  "RULE-VOICE-CLICHE": "Anti-Formulaic LLM Cliché Ban",
  "RULE-VOICE-PASSIVE": "Active Construction Mandate",
  "RULE-VOICE-READABILITY": "Readability Band Conformance",
  "RULE-FACT-SUPERSEDED": "Current Enterprise Pricing Tier Substantiation",
  "RULE-FACT-ASPIRATIONAL": "Roadmap vs Released Capability Distinction",
  "RULE-PROMO-UNSUBSTANTIATED": "Promotional Claim Substantiation (FTC §5)",
  "RULE-DISCLAIMER-MANDATORY": "Mandatory Regulatory Disclaimer Attachment",
  "RULE-PALETTE-DRIFT": "Primary Palette Consistency (CIEDE2000 ΔE00 < 3.0)",
  "RULE-LOGO-ASPECT-RATIO": "Logo Construction & Proportions",
  "RULE-LOGO-CLEAR-SPACE": "Minimum Clear-Space Isolation Margin",
  "RULE-WCAG-CONTRAST": "Strict WCAG 2.2 AA Contrast Ratio (≥ 4.5:1)",
  "RULE-WCAG-IMG-ALT": "Meaningful Alt Text (SC 1.1.1)",
  "RULE-WCAG-LINK-PURPOSE": "Link Purpose in Context (SC 2.4.4)",
  "RULE-WCAG-HEADING-HIERARCHY": "Heading Outline Hierarchy (SC 1.3.1)",
  "RULE-WCAG-INPUT-LABEL": "Programmatic Input Labels (SC 1.3.1)",
  "RULE-WCAG-EMPTY-BUTTON": "Accessible Button Names (SC 4.1.2)",
  "RULE-CONFIDENTIAL-DENYLIST": "Confidential Codename Deny-List",
  "RULE-CONFIDENTIAL-PII": "PII Transmission Masking",
  "RULE-PAY-AD-CHARGE-MISMATCH": "Advertised = Charged (PayPal Orders API v2)",
  "RULE-PAY-NO-PURCHASABLE-SKU": "Monetary Offer Maps to a Purchasable SKU",
  "RULE-PAY-OFFER-VERIFIED": "Checkout Truth Verified (PayPal Order on Record)",
};
