import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/assets/[id] — full asset with runs + findings. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            findings: true,
          },
        },
      },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const SEVERITY_RANK: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };
    for (const run of asset.runs) {
      run.findings.sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
    }

    return NextResponse.json({
      ...asset,
      visualMetaParsed: asset.visualMeta ? JSON.parse(asset.visualMeta) : null,
      runs: asset.runs.map((r) => ({
        ...r,
        findingsByPillar: JSON.parse(r.findingsByPillar),
        findingsBySeverity: JSON.parse(r.findingsBySeverity),
        tokenMap: JSON.parse(r.tokenMap),
        findings: r.findings.map((f) => ({
          ...f,
          provenance: JSON.parse(f.provenance),
        })),
      })),
    });
  } catch (err) {
    console.error("[api/assets/[id] GET]", err);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 500 });
  }
}

/** PATCH /api/assets/[id] — update draft content / title / visual meta. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.content !== undefined) data.content = String(body.content);
    if (body.visualMeta !== undefined) {
      data.visualMeta = body.visualMeta ? JSON.stringify(body.visualMeta) : null;
    }

    const asset = await db.asset.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        action: "ASSET_EDITED",
        actor: "CREATOR",
        details: JSON.stringify({ assetId: id, fields: Object.keys(data) }),
      },
    });
    return NextResponse.json(asset);
  } catch (err) {
    console.error("[api/assets/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

/** DELETE /api/assets/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.asset.delete({ where: { id } });
    await db.auditLog.create({
      data: { action: "ASSET_DELETED", actor: "CREATOR", details: JSON.stringify({ assetId: id }) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/assets/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
