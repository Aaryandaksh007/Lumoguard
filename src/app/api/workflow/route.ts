import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * RBAC Workflow State Machine
 * DRAFT → PREFLIGHT_CHECKED → IN_REVIEW → (CHANGES_REQUESTED → IN_REVIEW)* → APPROVED_FOR_PUBLISH
 */
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PREFLIGHT_CHECKED"],
  PREFLIGHT_CHECKED: ["IN_REVIEW", "DRAFT"],
  IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED_FOR_PUBLISH", "PREFLIGHT_CHECKED"],
  CHANGES_REQUESTED: ["PREFLIGHT_CHECKED", "IN_REVIEW"],
  APPROVED_FOR_PUBLISH: ["IN_REVIEW"],
};

/**
 * POST /api/workflow — transition an asset through the review workflow.
 * body: { assetId, transition, actorRole, comment? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assetId, transition, actorRole = "CREATOR", comment } = body ?? {};
    if (!assetId || !transition) {
      return NextResponse.json({ error: "assetId and transition are required" }, { status: 400 });
    }

    const asset = await db.asset.findUnique({
      where: { id: assetId },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { findings: true },
        },
      },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    if (!TRANSITIONS[asset.status]?.includes(transition)) {
      return NextResponse.json(
        { error: `Illegal transition ${asset.status} → ${transition}` },
        { status: 409 }
      );
    }

    // RBAC gates
    if (transition === "APPROVED_FOR_PUBLISH") {
      const latestRun = asset.runs[0];
      if (!latestRun) {
        return NextResponse.json(
          { error: "Cannot approve an asset that has never passed a preflight audit" },
          { status: 409 }
        );
      }
      const blocking = latestRun.findings.filter(
        (f) => f.status === "PENDING" && ["CRITICAL", "HIGH"].includes(f.severity)
      );
      if (blocking.length > 0 && actorRole !== "GOVERNANCE_ADMIN") {
        return NextResponse.json(
          {
            error: `${blocking.length} unresolved CRITICAL/HIGH finding(s) remain. Resolve each (accept the surgical diff or record a justified override) before publication approval. A Governance Admin may force-approve if required.`,
          },
          { status: 403 }
        );
      }
      if (asset.assigneeRole && actorRole !== asset.assigneeRole && actorRole !== "GOVERNANCE_ADMIN") {
        return NextResponse.json(
          { error: `This asset is routed to the ${asset.assigneeRole} queue — only that role or a Governance Admin can approve it.` },
          { status: 403 }
        );
      }
    }

    if (transition === "IN_REVIEW" && actorRole === "CREATOR" && asset.assigneeRole) {
      return NextResponse.json(
        { error: `Asset is awaiting ${asset.assigneeRole} review.` },
        { status: 403 }
      );
    }

    const updated = await db.asset.update({
      where: { id: assetId },
      data: {
        status: transition,
        ...(transition === "APPROVED_FOR_PUBLISH" ? { assigneeRole: null } : {}),
      },
    });

    await db.auditLog.create({
      data: {
        action: `WORKFLOW_${transition}`,
        actor: actorRole,
        details: JSON.stringify({ assetId, from: asset.status, to: transition, comment: comment ?? null }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/workflow POST]", err);
    return NextResponse.json({ error: "Workflow transition failed" }, { status: 500 });
  }
}
