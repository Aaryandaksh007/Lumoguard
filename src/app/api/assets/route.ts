import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_PRESS_RELEASE, DEMO_VISUAL_META, ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** GET /api/assets — list all assets with latest run summaries. */
export async function GET() {
  try {
    await ensureSeeded();
    const assets = await db.asset.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { _count: { select: { findings: true } } },
        },
      },
    });
    return NextResponse.json(
      assets.map((a) => ({
        id: a.id,
        title: a.title,
        assetType: a.assetType,
        status: a.status,
        assigneeRole: a.assigneeRole,
        contentLength: a.content.length,
        updatedAt: a.updatedAt,
        latestRun: a.runs[0]
          ? {
              runId: a.runs[0].runId,
              readinessScore: a.runs[0].readinessScore,
              totalLatencyMs: a.runs[0].totalLatencyMs,
              llmStatus: a.runs[0].llmStatus,
              findingsCount: a.runs[0]._count.findings,
              createdAt: a.runs[0].createdAt,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error("[api/assets GET]", err);
    return NextResponse.json({ error: "Failed to list assets" }, { status: 500 });
  }
}

/**
 * POST /api/assets — create a new draft asset.
 * body: { title, assetType?, content?, visualMeta?, demo?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();

    if (body?.demo) {
      const asset = await db.asset.create({
        data: {
          title: `Demo Launch Packet — ${new Date().toLocaleTimeString()}`,
          assetType: "MARKDOWN",
          content: DEMO_PRESS_RELEASE,
          visualMeta: JSON.stringify(DEMO_VISUAL_META),
          status: "DRAFT",
        },
      });
      await db.auditLog.create({
        data: {
          action: "ASSET_CREATED_DEMO",
          actor: "CREATOR",
          details: JSON.stringify({ assetId: asset.id, title: asset.title }),
        },
      });
      return NextResponse.json(asset, { status: 201 });
    }

    if (!body?.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const asset = await db.asset.create({
      data: {
        title: String(body.title),
        assetType: String(body.assetType ?? "MARKDOWN"),
        content: String(body.content ?? ""),
        visualMeta: body.visualMeta ? JSON.stringify(body.visualMeta) : null,
        status: "DRAFT",
      },
    });
    await db.auditLog.create({
      data: {
        action: "ASSET_CREATED",
        actor: "CREATOR",
        details: JSON.stringify({ assetId: asset.id, title: asset.title }),
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("[api/assets POST]", err);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
