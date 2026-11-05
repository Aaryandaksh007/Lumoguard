import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** GET /api/audit-log — append-only governance audit trail (newest first). */
export async function GET() {
  try {
    await ensureSeeded();
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      logs.map((l) => ({ ...l, details: JSON.parse(l.details) }))
    );
  } catch (err) {
    console.error("[api/audit-log GET]", err);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
