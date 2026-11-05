// ============================================================
// Two-Stage Hybrid Verification Orchestrator
// Stage 1 (<50ms): deterministic math, lexicon, geometry,
//   WCAG, and the Presidio-style reversible privacy scrub.
// Stage 2: retrieval-grounded semantic pass via the external
//   LLM (z-ai-web-dev-sdk, backend-only). Executes on the
//   SCRUBBED payload ("Sandwich Pattern") and de-anonymizes
//   the response longest-placeholder-first. Graceful
//   degradation: deterministic findings always return, even
//   when the external AI service is down or air-gapped.
// ============================================================

import { ai, getAiModel } from "@/lib/ai";
import { ClaimGroundingEngine, decomposeClaims } from "@/lib/engines/claims";
import { CheckoutTruthEngine } from "@/lib/engines/offer-verify";
import { ConfidentialityShield } from "@/lib/engines/confidentiality";
import { computeIntentPreservation, expandToSentence, generateInlineDiffChunks } from "@/lib/engines/diff-engine";
import { TerminologyEngine } from "@/lib/engines/terminology";
import { AccessibilityEngine } from "@/lib/engines/wcag";
import { VisualGeometryEngine } from "@/lib/engines/visual-geometry";
import { VoiceToneEngine } from "@/lib/engines/voice-tone";
import {
  PROMPT_VERSION,
  type AuditResult,
  type FactData,
  type LogoRules,
  type RawFinding,
  type SwatchData,
  type TerminologyRuleData,
  type VisualMeta,
  type VoiceSpecData,
} from "@/lib/types";

export interface OrchestratorCanon {
  terms: TerminologyRuleData[];
  voice: VoiceSpecData;
  facts: FactData[];
  swatches: SwatchData[];
  logoRules: LogoRules;
  codenames: string[];
}

export interface OrchestratorOptions {
  title: string;
  content: string;
  assetType: string;
  visualMeta?: VisualMeta | null;
  assetId?: string | null;
  airGapped?: boolean;
  /** Deterministic grace test hook: simulate external AI downtime. */
  simulateLlmFailure?: boolean;
}

const INTENT_GATE = 0.75;
const INTENT_GATE_CLAIM = 0.55; // corrective rewrites legitimately change numbers/superlatives
const LLM_TIMEOUT_MS = 60_000;

export class VerificationOrchestrator {
  private termEngine: TerminologyEngine;
  private voiceEngine: VoiceToneEngine;
  private claimEngine: ClaimGroundingEngine;
  private visualEngine: VisualGeometryEngine;
  private wcagEngine: AccessibilityEngine;
  private shield: ConfidentialityShield;
  private checkoutEngine: CheckoutTruthEngine;

  constructor(private canon: OrchestratorCanon) {
    this.termEngine = new TerminologyEngine(canon.terms);
    this.voiceEngine = new VoiceToneEngine(canon.voice);
    this.claimEngine = new ClaimGroundingEngine(canon.facts);
    this.visualEngine = new VisualGeometryEngine(canon.swatches, canon.logoRules);
    this.wcagEngine = new AccessibilityEngine(canon.swatches);
    this.shield = new ConfidentialityShield(canon.codenames);
    this.checkoutEngine = new CheckoutTruthEngine();
  }

  async runPreflightAudit(opts: OrchestratorOptions): Promise<AuditResult> {
    const t0 = performance.now();
    const { title, content, assetType, visualMeta } = opts;
    const airGapped = opts.airGapped ?? false;
    // ---------------- STAGE 1: Deterministic passes (<50ms) ----------------
    const tS1 = performance.now();

    // 1. Reversible Confidentiality Shield (runs first — everything downstream is safe)
    const { scrubbed, tokenMap } = this.shield.redactAndTokenize(content);
    const confidentialityFindings = this.shield.auditConfidentiality(content);

    // 2. Terminology & Brand Lexicon
    const terminologyFindings = this.termEngine.auditText(content);

    // 3. Tone, Voice & Messaging
    const voiceFindings = this.voiceEngine.auditText(content);

    // 4. Deterministic claim pre-scan (numeric/date verification)
    const deterministicClaimFindings = this.claimEngine.auditText(content);

    // 5. Visual geometry & palette (if visual metadata provided)
    const visualFindings = visualMeta ? this.visualEngine.auditVisualAsset(visualMeta) : [];

    // 6. WCAG 2.2 structural + contrast
    const wcagFindings = this.wcagEngine.auditStructure(content);
    for (const pair of visualMeta?.colorPairs ?? []) {
      const f = this.wcagEngine.auditColorPair(pair);
      if (f) wcagFindings.push(f);
    }

    const stage1LatencyMs = Math.round((performance.now() - tS1) * 100) / 100;

    // ---------------- STAGE 2 + PayPal Checkout Truth pass (parallel) ----------------
    // The grounded semantic pass (external LLM, scrubbed payload) and the
    // Checkout Truth Engine (AI offer enrichment + PayPal Orders API v2
    // equivalence checks) run concurrently — both inherit the reversible
    // confidentiality shield and both degrade deterministically on failure.
    const tS2 = performance.now();
    let llmStatus = "SKIPPED";
    let llmFindings: RawFinding[] = [];

    const semanticTask = airGapped
      ? Promise.resolve({ status: "AIR_GAPPED" as const, findings: [] as RawFinding[] })
      : this.runSemanticPass(content, scrubbed, tokenMap, title, opts.simulateLlmFailure);
    const checkoutTask = this.checkoutEngine.verify({
      content,
      scrubbed,
      tokenMap,
      assetId: opts.assetId ?? null,
      airGapped,
      simulateLlmFailure: opts.simulateLlmFailure,
    });

    const [semanticResult, checkoutReport] = await Promise.all([semanticTask, checkoutTask]);
    llmStatus = semanticResult.status;
    llmFindings = semanticResult.findings;

    const stage2LatencyMs = Math.round((performance.now() - tS2) * 100) / 100;
    const totalLatencyMs = Math.round((performance.now() - t0) * 100) / 100;

    // ---------------- Merge, dedupe & enrich ----------------
    const merged = this.mergeFindings(
      [
        ...confidentialityFindings,
        ...terminologyFindings,
        ...voiceFindings,
        ...deterministicClaimFindings,
        ...visualFindings,
        ...wcagFindings,
        ...checkoutReport.findings,
      ],
      llmFindings
    );

    for (const f of merged) {
      f.diffChunks =
        f.suggestedDiff && f.originalSpan && f.suggestedDiff !== f.originalSpan
          ? generateInlineDiffChunks(f.originalSpan, f.suggestedDiff)
          : [];
      if (f.suggestedDiff && f.originalSpan && f.suggestedDiff !== f.originalSpan) {
        // The intent gate guards free-text rewrites only — DOM attribute fixes,
        // token swaps and visual geometry fixes are inherently surgical spans.
        const isFreeTextRewrite =
          (f.pillar === "TERMINOLOGY" || f.pillar === "VOICE" || f.pillar === "FACT_CLAIM") &&
          !f.originalSpan.trimStart().startsWith("<");
        const isClaimCorrection = f.pillar === "FACT_CLAIM";
        if (!isFreeTextRewrite) {
          f.intentPreservation = Math.max(f.intentPreservation, 0.95);
        } else {
          // Compare the full containing sentence before/after — approximates the
          // spec's embedding-cosine intent check at the sentence level.
          const sentence = expandToSentence(content, f.charStart, f.charEnd);
          if (sentence.start >= 0 && sentence.end > sentence.start) {
            const originalSentence = content.slice(sentence.start, sentence.end);
            const spanStartInSentence = Math.max(sentence.start, f.charStart) - sentence.start;
            const spanEndInSentence = Math.min(sentence.end, f.charEnd) - sentence.start;
            const proposedSentence =
              originalSentence.slice(0, spanStartInSentence) +
              f.suggestedDiff +
              originalSentence.slice(spanEndInSentence);
            const score = computeIntentPreservation(originalSentence, proposedSentence, {
              numericCorrectionsExpected: isClaimCorrection,
            });
            const gate = isClaimCorrection ? INTENT_GATE_CLAIM : INTENT_GATE;
            if (score < gate) {
              // Intent Preservation Gate: withhold the automatic diff, request human review
              f.explanation += ` [Intent Preservation Gate: automatic diff withheld — sentence-level preservation ${score} < ${gate}; a lighter-touch manual edit is required.]`;
              f.suggestedDiff = null;
              f.diffChunks = [];
              f.intentPreservation = score;
            } else {
              f.intentPreservation = Math.max(f.intentPreservation, score);
            }
          } else {
            f.intentPreservation = Math.max(f.intentPreservation, 0.95);
          }
        }
      }
      f.provenance.airGappedMode = airGapped;
    }

    const findingsByPillar: Record<string, number> = {};
    const findingsBySeverity: Record<string, number> = {};
    for (const f of merged) {
      findingsByPillar[f.pillar] = (findingsByPillar[f.pillar] ?? 0) + 1;
      findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
    }
    const readiness = Math.max(
      0,
      100 -
        ((findingsBySeverity.CRITICAL ?? 0) * 25 +
          (findingsBySeverity.HIGH ?? 0) * 10 +
          (findingsBySeverity.MEDIUM ?? 0) * 5)
    );

    return {
      runId: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      readinessScore: readiness,
      stage1LatencyMs,
      stage2LatencyMs,
      totalLatencyMs,
      llmStatus,
      llmModel: llmStatus === "OK" ? getAiModel() : null,
      promptVersion: llmStatus === "OK" ? PROMPT_VERSION : null,
      paypalStatus:
        checkoutReport.offers.length > 0
          ? `${checkoutReport.mode}/AI_${checkoutReport.aiEnrichment}`
          : null,
      paypalLatencyMs: checkoutReport.latencyMs,
      findingsByPillar,
      findingsBySeverity,
      scrubbedContent: scrubbed,
      tokenMap,
      findings: merged,
      paypalOrders: checkoutReport.orders,
    };
  }

  /**
   * Stage 2: grounded semantic evaluation via the external LLM.
   * Runs on the scrubbed payload; restores secrets longest-first.
   */
  private async runSemanticPass(
    original: string,
    scrubbed: string,
    tokenMap: Record<string, string>,
    title: string,
    simulateFailure?: boolean
  ): Promise<{ status: string; findings: RawFinding[] }> {
    const t0 = performance.now();
    if (simulateFailure) {
      return { status: "DEGRADED", findings: [] };
    }

    try {
      const claims = decomposeClaims(scrubbed).slice(0, 12);
      if (claims.length === 0) return { status: "SKIPPED", findings: [] };

      const factLedger = this.canon.facts.map((f) => ({
        fact_id: f.factId,
        assertion: f.claimAssertion,
        status: f.status,
        effective: f.effectiveDate,
        expires: f.expirationDate,
        evidence: f.evidenceDocUrl,
        required_disclaimer: f.requiredDisclaimerText,
      }));

      const systemPrompt = `You are LoomGuard's Stage-2 claim-grounding engine (model ${getAiModel()}, prompt ${PROMPT_VERSION}). You receive a draft document (with {{TYPE_N}} placeholders standing in for confidential material — treat every placeholder as an immutable opaque variable and NEVER attempt to guess or expand it) and the brand's Approved Fact Ledger. For each extracted claim, classify it:
- VERIFIED_CANONICAL: logically entailed by an active CANONICAL record
- OUTDATED_FACT: matches a SUPERSEDED record (propose updating figures to the active canonical value)
- ASPIRATIONAL_STATED_AS_PRESENT: matches a ROADMAP_ASPIRATIONAL record but is written in present tense (propose hedged roadmap framing)
- UNSUBSTANTIATED_PROMOTIONAL_CLAIM: superlative/comparative/performance assertion with no supporting evidence (propose an objective softening that preserves the sentence's intent and cadence)
- MISSING_MANDATORY_DISCLAIMER: a regulated topic whose required_disclaimer is absent from the document
Rules for suggested_diff: modify the MINIMUM contiguous span needed; preserve grammatical mood, entities, numbers (unless correcting an outdated figure), and rhetorical emphasis; keep placeholders exactly as-is. Respond ONLY with valid JSON.`;

      const userPrompt = `TITLE: ${title}

FACT LEDGER:
${JSON.stringify(factLedger, null, 1)}

DOCUMENT (sanitized):
"""${scrubbed.slice(0, 6000)}"""

EXTRACTED CLAIMS:
${claims.map((c, i) => `[${i}] ${c.sentence}`).join("\n")}

Respond with JSON: {"findings":[{"claim_index":0,"verdict":"...","matched_fact_id":"FACT-000 or null","suggested_diff":"..." or null,"explanation":"1-3 sentences citing the fact id and regulatory context (FTC Act §5 / Operation AI Comply for promotional claims, SEC AI-washing for aspirational-present-tense)","confidence":0.0-1.0}],"missing_disclaimer":"the required disclaimer text if MISSING_MANDATORY_DISCLAIMER applies to the document, else null"}`;

      const completion = (await Promise.race([
        ai.chat.completions.create({
          messages: [
            { role: "assistant", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          thinking: { type: "disabled" },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM timeout")), LLM_TIMEOUT_MS)
        ),
      ])) as { choices?: { message?: { content?: string } }[] };

      const raw = completion.choices?.[0]?.message?.content ?? "";
      const parsed = this.parseLlmJson(raw);
      if (!parsed || !Array.isArray(parsed.findings)) {
        return { status: "DEGRADED", findings: [] };
      }

      const findings: RawFinding[] = [];
      for (const item of parsed.findings as Array<Record<string, unknown>>) {
        const idx = Number(item.claim_index);
        const claim = claims[idx];
        if (!claim || !item.verdict) continue;

        // Sandwich pattern step 3: restore secrets longest-first into the diff
        let suggestedDiff =
          typeof item.suggested_diff === "string" && item.suggested_diff.length > 0
            ? this.shield.deAnonymize(item.suggested_diff, tokenMap)
            : null;

        const matchedFact = this.canon.facts.find((f) => f.factId === item.matched_fact_id);
        const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

        findings.push({
          pillar: "FACT_CLAIM",
          ruleId:
            item.verdict === "OUTDATED_FACT"
              ? "RULE-FACT-SUPERSEDED"
              : item.verdict === "ASPIRATIONAL_STATED_AS_PRESENT"
                ? "RULE-FACT-ASPIRATIONAL"
                : item.verdict === "UNSUBSTANTIATED_PROMOTIONAL_CLAIM"
                  ? "RULE-PROMO-UNSUBSTANTIATED"
                  : item.verdict === "MISSING_MANDATORY_DISCLAIMER"
                    ? "RULE-DISCLAIMER-MANDATORY"
                    : "RULE-FACT-GROUNDED",
          severity:
            item.verdict === "UNSUBSTANTIATED_PROMOTIONAL_CLAIM"
              ? "CRITICAL"
              : item.verdict === "VERIFIED_CANONICAL"
                ? "INFO"
                : "HIGH",
          verdict: String(item.verdict),
          originalSpan: this.shield.deAnonymize(claim.sentence, tokenMap),
          charStart: original.indexOf(this.shield.deAnonymize(claim.sentence, tokenMap)),
          charEnd:
            original.indexOf(this.shield.deAnonymize(claim.sentence, tokenMap)) +
            this.shield.deAnonymize(claim.sentence, tokenMap).length,
          suggestedDiff,
          explanation: String(item.explanation ?? "Grounded semantic evaluation."),
          provenance: {
            engine: "EXTERNAL_AI_SERVICE",
            algorithm: "FActScore Decomposition + LLM Entailment (retrieval-grounded)",
            citation: matchedFact ? `Fact Ledger ${matchedFact.factId} (${matchedFact.status})` : "Approved Fact Ledger",
            latencyMs,
            contextMode: "DYNAMIC_FACT_LEDGER",
            model: getAiModel(),
            promptVersion: PROMPT_VERSION,
            retrievedClauses: matchedFact
              ? [
                  { id: matchedFact.factId, text: matchedFact.claimAssertion, retrieval: "DYNAMIC" as const },
                ]
              : [],
            sanitizedPayloadPreview: scrubbed.slice(0, 200) + (scrubbed.length > 200 ? "…" : ""),
          },
          intentPreservation: 0.9,
        });
        suggestedDiff = null;
      }

      return { status: "OK", findings };
    } catch (err) {
      console.error("[LoomGuard] Stage-2 semantic pass degraded:", err);
      return { status: "DEGRADED", findings: [] };
    }
  }

  private parseLlmJson(raw: string): Record<string, unknown> | null {
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) return null;
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  /**
   * Deterministic findings win; LLM findings are added only when they
   * surface a NEW claim verdict (no span overlap with an existing FACT_CLAIM finding).
   */
  private mergeFindings(deterministic: RawFinding[], llm: RawFinding[]): RawFinding[] {
    const out = [...deterministic];
    for (const lf of llm) {
      if (lf.verdict === "VERIFIED_CANONICAL") {
        const dup = deterministic.some(
          (d) => d.pillar === "FACT_CLAIM" && this.spanOverlap(d, lf) && d.verdict === lf.verdict
        );
        if (dup) continue;
      }
      const dupAny = deterministic.some(
        (d) =>
          d.pillar === "FACT_CLAIM" &&
          this.spanOverlap(d, lf) &&
          (d.verdict === lf.verdict ||
            (d.verdict === "UNSUBSTANTIATED_PROMOTIONAL_CLAIM" && lf.verdict === "UNSUBSTANTIATED_PROMOTIONAL_CLAIM"))
      );
      if (dupAny) continue;
      out.push(lf);
    }
    return out;
  }

  private spanOverlap(a: RawFinding, b: RawFinding): boolean {
    if (a.charStart < 0 || b.charStart < 0) return false;
    return a.charStart < b.charEnd && b.charStart < a.charEnd;
  }
}
