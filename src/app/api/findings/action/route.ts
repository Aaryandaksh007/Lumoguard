import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeIntentPreservation, generateInlineDiffChunks } from "@/lib/engines/diff-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/findings/action — Accept a surgical diff or Override with a
 * structured justification. Accepting applies the minimal-span edit to the
 * asset content (append-only: the prior text stays in the run history).
 * Overriding routes the asset to the appropriate review queue and
 * increments ambiguity telemetry (the GAS engine's raw material).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      findingId,
      action,
      actorRole = "CREATOR",
      overrideReason,
      comment,
    } = body ?? {};

    if (!findingId || !action || !["ACCEPT", "OVERRIDE"].includes(action)) {
      return NextResponse.json({ error: "findingId and action (ACCEPT|OVERRIDE) required" }, { status: 400 });
    }

    const finding = await db.finding.findUnique({
      where: { findingId },
      include: { run: { include: { asset: true } } },
    });
    if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    if (finding.status !== "PENDING") {
      return NextResponse.json(
        { error: `Finding already ${finding.status.toLowerCase()} — state transitions are append-only` },
        { status: 409 }
      );
    }

    const review = await db.reviewAction.create({
      data: {
        actionId: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        findingId: finding.id,
        action,
        actorRole,
        overrideReason: action === "OVERRIDE" ? (overrideReason ?? "INTENTIONAL_STYLE") : null,
        comment: comment ?? null,
      },
    });

    if (action === "ACCEPT") {
      // Apply the surgical diff to the asset content.
      // Offsets recorded at audit time go stale as earlier accepts shift the
      // text, so every application re-locates its span exactly:
      //  - Insertions (charStart === charEnd, e.g. footer disclaimers) append
      //    at the current end of the document.
      //  - Replacements locate the exact original span and splice minimally.
      let newContent = finding.run.asset.content;
      if (finding.suggestedDiff) {
        const isInsertion = finding.charStart >= 0 && finding.charStart === finding.charEnd;
        if (isInsertion) {
          newContent = newContent + finding.suggestedDiff;
        } else {
          const idx = newContent.indexOf(finding.originalSpan);
          if (idx >= 0) {
            newContent =
              newContent.slice(0, idx) +
              finding.suggestedDiff +
              newContent.slice(idx + finding.originalSpan.length);
          }
        }
      }

      // Visual token fixes also snap the attached visual metadata so the
      // proofing canvas re-renders with the on-brand token
      let visualMeta = finding.run.asset.visualMeta;
      if (finding.suggestedDiff && visualMeta) {
        try {
          const meta = JSON.parse(visualMeta);
          if (/^#[0-9A-Fa-f]{6}$/i.test(finding.suggestedDiff)) {
            if (finding.ruleId === "RULE-WCAG-CONTRAST" && Array.isArray(meta.colorPairs)) {
              for (const pair of meta.colorPairs) {
                if (finding.originalSpan.toUpperCase().includes(pair.fg.toUpperCase())) {
                  pair.fg = finding.suggestedDiff;
                }
              }
            }
            if (finding.ruleId === "RULE-PALETTE-DRIFT" && Array.isArray(meta.extractedColors)) {
              const match = finding.originalSpan.match(/#[0-9A-Fa-f]{6}/);
              if (match) {
                for (const color of meta.extractedColors) {
                  if (color.hex.toUpperCase() === match[0].toUpperCase()) {
                    color.hex = finding.suggestedDiff;
                  }
                }
              }
            }
          }
          // Logo geometry auto-fix: snap the detected box to canonical proportions
          if (finding.ruleId === "RULE-LOGO-ASPECT-RATIO" && meta.logoBox) {
            meta.logoBox.width = Math.round(meta.logoBox.height * 4.0);
          }
          if (finding.ruleId === "RULE-LOGO-CLEAR-SPACE" && meta.logoBox) {
            meta.logoBox.adjacentTextDist = Math.max(
              meta.logoBox.adjacentTextDist,
              Math.round(meta.logoBox.height * 0.25 * 10) / 10
            );
          }
          visualMeta = JSON.stringify(meta);
        } catch {
          /* keep original meta on parse failure */
        }
      }

      await db.asset.update({
        where: { id: finding.run.assetId },
        data: {
          content: newContent,
          ...(visualMeta !== finding.run.asset.visualMeta ? { visualMeta } : {}),
        },
      });

      await db.finding.update({ where: { id: finding.id }, data: { status: "ACCEPTED" } });
      await db.auditLog.create({
        data: {
          action: "SURGICAL_DIFF_ACCEPTED",
          actor: actorRole,
          details: JSON.stringify({
            findingId,
            ruleId: finding.ruleId,
            span: finding.originalSpan.slice(0, 80),
            appliedDiff: finding.suggestedDiff?.slice(0, 80) ?? null,
          }),
        },
      });
    } else {
      await db.finding.update({ where: { id: finding.id }, data: { status: "OVERRIDDEN" } });

      // Route to the correct review queue per the RBAC matrix
      const needsLegal =
        finding.verdict === "UNSUBSTANTIATED_PROMOTIONAL_CLAIM" ||
        finding.verdict === "MISSING_MANDATORY_DISCLAIMER" ||
        finding.pillar === "CONFIDENTIALITY";
      const needsBrandManager =
        finding.pillar === "VOICE" || finding.pillar === "VISUAL_GEOMETRY" || finding.pillar === "TERMINOLOGY";

      const asset = await db.asset.update({
        where: { id: finding.run.assetId },
        data: {
          status: "IN_REVIEW",
          assigneeRole: needsLegal ? "LEGAL_COMPLIANCE" : needsBrandManager ? "BRAND_MANAGER" : "BRAND_MANAGER",
        },
      });

      // Ambiguity telemetry: overrides + disputes feed the GAS engine
      const telemetry = await db.guidelineTelemetry.findUnique({ where: { ruleId: finding.ruleId } });
      if (telemetry) {
        await db.guidelineTelemetry.update({
          where: { ruleId: finding.ruleId },
          data: {
            overridesCount: { increment: 1 },
            disputesCount: comment && comment.length > 40 ? { increment: 1 } : undefined,
          },
        });
      } else {
        await db.guidelineTelemetry.create({
          data: {
            ruleId: finding.ruleId,
            ruleName: `${finding.pillar} rule ${finding.ruleId}`,
            pillar: finding.pillar,
            triggersCount: 1,
            overridesCount: 1,
          },
        });
      }

      await db.auditLog.create({
        data: {
          action: "FLAG_OVERRIDDEN",
          actor: actorRole,
          details: JSON.stringify({
            findingId,
            ruleId: finding.ruleId,
            reason: overrideReason ?? "INTENTIONAL_STYLE",
            comment: comment ?? null,
            routedTo: asset.assigneeRole,
          }),
        },
      });
    }

    // Return the updated finding with diff context for instant UI feedback
    const updated = await db.finding.findUnique({ where: { id: finding.id } });
    const diffChunks =
      updated?.suggestedDiff && updated.originalSpan
        ? generateInlineDiffChunks(updated.originalSpan, updated.suggestedDiff)
        : [];
    const intent = updated?.suggestedDiff
      ? computeIntentPreservation(updated.originalSpan, updated.suggestedDiff)
      : 1;

    return NextResponse.json({
      review,
      finding: updated ? { ...updated, provenance: JSON.parse(updated.provenance), diffChunks, intent } : null,
    });
  } catch (err) {
    console.error("[api/findings/action POST]", err);
    return NextResponse.json({ error: "Failed to record review action" }, { status: 500 });
  }
}
