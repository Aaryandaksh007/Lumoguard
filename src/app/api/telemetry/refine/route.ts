import { NextRequest, NextResponse } from "next/server";
import { ai, getAiModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/types";
import { recomputeGasScores } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/telemetry/refine — Secret Weapon #1's Canon Refiner Agent.
 * Synthesizes human override justifications for a high-GAS rule into a
 * disambiguated brand guideline upgrade diff with Do / Don't examples.
 * body: { ruleId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { ruleId } = await req.json();
    if (!ruleId) return NextResponse.json({ error: "ruleId is required" }, { status: 400 });

    const telemetry = await db.guidelineTelemetry.findUnique({ where: { ruleId } });
    if (!telemetry) return NextResponse.json({ error: "Rule telemetry not found" }, { status: 404 });

    const overrides = await db.reviewAction.findMany({
      where: { action: "OVERRIDE", finding: { ruleId } },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const overrideNotes = overrides
      .map((o) => `${o.overrideReason ?? "UNSPECIFIED"}: ${o.comment ?? "(no comment provided)"}`)
      .slice(0, 12);

    const activeModel = getAiModel();
    const completion = await ai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are LoomGuard's Canon Refiner Agent (model ${activeModel}, prompt ${PROMPT_VERSION}). You receive a brand guideline whose telemetry shows disproportionate human override/dispute friction (a high Guideline Ambiguity Score), plus the written override justifications from creators and reviewers. Synthesize them into ONE disambiguated guideline upgrade: a single rewritten guideline sentence, two concrete DO examples, two concrete DON'T examples, and a one-sentence rationale referencing the observed friction. Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `RULE: "${telemetry.ruleName}" (pillar ${telemetry.pillar})
TRIGGERS: ${telemetry.triggersCount}
OVERRIDES: ${telemetry.overridesCount} (${telemetry.triggersCount > 0 ? Math.round((telemetry.overridesCount / telemetry.triggersCount) * 100) : 0}% override rate)
DISPUTED THREADS: ${telemetry.disputesCount}
MEAN RESOLUTION: ${telemetry.meanResolutionHours}h against a 48h SLA
GAS SCORE: ${telemetry.gasScore}

HUMAN OVERRIDE JUSTIFICATIONS:
${overrideNotes.length > 0 ? overrideNotes.map((n, i) => `${i + 1}. ${n}`).join("\n") : "(none recorded yet — infer from the rule name and friction pattern)"}

Respond with JSON: {"upgraded_guideline":"one sentence","do_examples":["...","..."],"dont_examples":["...","..."],"rationale":"one sentence grounded in the telemetry"}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let parsed: {
      upgraded_guideline?: string;
      do_examples?: string[];
      dont_examples?: string[];
      rationale?: string;
    } = {};
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      parsed = {};
    }

    // Deterministic fallback if the LLM response is unusable
    const refined =
      parsed.upgraded_guideline && parsed.do_examples?.length
        ? parsed
        : {
            upgraded_guideline: `${telemetry.ruleName} — clarified: apply the rule's intent strictly to customer-facing copy; internal iteration drafts are exempt pending final review sign-off.`,
            do_examples: [
              "DO: apply the rule verbatim in published press releases and landing pages.",
              "DO: flag borderline cases to the Brand Manager queue with a one-line context note.",
            ],
            dont_examples: [
              "DON'T: override silently — record a structured reason so the GAS engine can attribute friction.",
              "DON'T: treat internal working drafts as final governed assets.",
            ],
            rationale: `Synthesized from ${telemetry.overridesCount} overrides and ${telemetry.disputesCount} disputed threads (deterministic fallback — LLM synthesis unavailable).`,
          };

    await db.auditLog.create({
      data: {
        action: "CANON_REFINER_RUN",
        actor: "GOVERNANCE_ADMIN",
        details: JSON.stringify({
          ruleId,
          gasScore: telemetry.gasScore,
          synthesizedFrom: overrideNotes.length,
          model: activeModel,
          promptVersion: PROMPT_VERSION,
          degraded: !parsed.upgraded_guideline,
        }),
      },
    });

    // Reset the friction baseline after a canon upgrade commit
    await db.guidelineTelemetry.update({
      where: { ruleId },
      data: { triggersCount: 0, overridesCount: 0, disputesCount: 0, meanResolutionHours: 0 },
    });
    await recomputeGasScores();

    return NextResponse.json({
      ruleId,
      previousGas: telemetry.gasScore,
      refined,
      provenance: {
        engine: "EXTERNAL_AI_SERVICE",
        model: activeModel,
        promptVersion: PROMPT_VERSION,
        synthesizedFromOverrides: overrideNotes.length,
        degraded: !parsed.upgraded_guideline,
      },
    });
  } catch (err) {
    console.error("[api/telemetry/refine POST]", err);
    return NextResponse.json({ error: "Canon Refiner failed" }, { status: 500 });
  }
}
