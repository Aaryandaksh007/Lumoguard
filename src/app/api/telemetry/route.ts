import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gasRecommendation } from "@/lib/engines/gas";
import { ensureSeeded, recomputeGasScores } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** GET /api/telemetry — Guideline Ambiguity Score telemetry for the dashboard. */
export async function GET() {
  try {
    await ensureSeeded();
    await recomputeGasScores();
    const rows = await db.guidelineTelemetry.findMany({
      orderBy: { gasScore: "desc" },
    });

    const overrideComments = await db.reviewAction.findMany({
      where: { action: "OVERRIDE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        overrideRatePct: r.triggersCount > 0 ? Math.round((r.overridesCount / r.triggersCount) * 1000) / 10 : 0,
        disputeRatePct: r.triggersCount > 0 ? Math.round((r.disputesCount / r.triggersCount) * 1000) / 10 : 0,
        latencyPctOfSla: Math.round((Math.min(1, r.meanResolutionHours / 48)) * 1000) / 10,
        recommendation: gasRecommendation(r.gasScore),
      })),
      { headers: { "X-Override-Comments": String(overrideComments.length) } }
    );
  } catch (err) {
    console.error("[api/telemetry GET]", err);
    return NextResponse.json({ error: "Failed to load telemetry" }, { status: 500 });
  }
}
