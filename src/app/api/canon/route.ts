import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, loadCanon, recomputeGasScores } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** GET /api/canon — the full Brand Canon (lazy-seeds on first call). */
export async function GET() {
  try {
    await ensureSeeded();
    const canon = await loadCanon();
    return NextResponse.json(canon);
  } catch (err) {
    console.error("[api/canon GET]", err);
    return NextResponse.json({ error: "Failed to load Brand Canon" }, { status: 500 });
  }
}

/**
 * POST /api/canon — add or update canon entities.
 * body: { kind: "term" | "fact" | "visual" | "secret", data: {...} }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { kind, data } = body ?? {};

    if (kind === "term") {
      if (!data?.surfaceForm || !data?.rationaleCitation) {
        return NextResponse.json({ error: "surfaceForm and rationaleCitation are required" }, { status: 400 });
      }
      const count = await db.canonTerm.count();
      const term = await db.canonTerm.create({
        data: {
          termId: `TERM-${String(count + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-3)}`,
          surfaceForm: String(data.surfaceForm),
          ruleType: String(data.ruleType ?? "DEPRECATED"),
          replacementToken: data.replacementToken ? String(data.replacementToken) : null,
          allowedContextRegex: data.allowedContextRegex ? String(data.allowedContextRegex) : null,
          rationaleCitation: String(data.rationaleCitation),
        },
      });
      await logCanonChange("CANON_TERM_ADDED", term.termId, term.surfaceForm);
      return NextResponse.json(term, { status: 201 });
    }

    if (kind === "fact") {
      if (!data?.claimAssertion || !data?.status) {
        return NextResponse.json({ error: "claimAssertion and status are required" }, { status: 400 });
      }
      const count = await db.canonFact.count();
      const fact = await db.canonFact.create({
        data: {
          factId: `FACT-${String(count + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-3)}`,
          claimAssertion: String(data.claimAssertion),
          atomicBreakdown: JSON.stringify(
            Array.isArray(data.atomicBreakdown) ? data.atomicBreakdown : [String(data.claimAssertion)]
          ),
          status: String(data.status),
          effectiveDate: data.effectiveDate ?? null,
          expirationDate: data.expirationDate ?? null,
          evidenceDocUrl: data.evidenceDocUrl ?? null,
          requiredDisclaimerText: data.requiredDisclaimerText ?? null,
          supersededByFactId: data.supersededByFactId ?? null,
        },
      });
      await logCanonChange("CANON_FACT_ADDED", fact.factId, fact.claimAssertion);
      return NextResponse.json(fact, { status: 201 });
    }

    if (kind === "visual") {
      if (!data?.tokenName || !data?.hexValue) {
        return NextResponse.json({ error: "tokenName and hexValue are required" }, { status: 400 });
      }
      const visual = await db.canonVisual.create({
        data: {
          tokenName: String(data.tokenName),
          hexValue: String(data.hexValue).toUpperCase(),
          role: String(data.role ?? "ACCENT"),
          isBrandCore: Boolean(data.isBrandCore ?? false),
        },
      });
      await logCanonChange("CANON_VISUAL_ADDED", visual.tokenName, visual.hexValue);
      return NextResponse.json(visual, { status: 201 });
    }

    if (kind === "secret") {
      if (!data?.codename) {
        return NextResponse.json({ error: "codename is required" }, { status: 400 });
      }
      const exists = await db.canonSecret.findFirst({ where: { codename: String(data.codename) } });
      if (exists) return NextResponse.json({ error: "Codename already on the deny-list" }, { status: 409 });
      const secret = await db.canonSecret.create({ data: { codename: String(data.codename) } });
      await logCanonChange("CANON_SECRET_ADDED", secret.codename, secret.codename);
      return NextResponse.json(secret, { status: 201 });
    }

    if (kind === "recompute_gas") {
      await recomputeGasScores();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown canon kind" }, { status: 400 });
  } catch (err) {
    console.error("[api/canon POST]", err);
    return NextResponse.json({ error: "Failed to mutate Brand Canon" }, { status: 500 });
  }
}

/** DELETE /api/canon?kind=...&id=... — remove a canon entity by business key. */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const id = searchParams.get("id");
    if (!kind || !id) return NextResponse.json({ error: "kind and id required" }, { status: 400 });

    if (kind === "term") await db.canonTerm.delete({ where: { termId: id } });
    else if (kind === "fact") await db.canonFact.delete({ where: { factId: id } });
    else if (kind === "visual") await db.canonVisual.delete({ where: { tokenName: id } });
    else if (kind === "secret") await db.canonSecret.delete({ where: { codename: id } });
    else return NextResponse.json({ error: "Unknown kind" }, { status: 400 });

    await logCanonChange(`CANON_${kind.toUpperCase()}_DELETED`, id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/canon DELETE]", err);
    return NextResponse.json({ error: "Failed to delete canon entity" }, { status: 500 });
  }
}

async function logCanonChange(action: string, ref: string, detail: string) {
  await db.auditLog.create({
    data: {
      action,
      actor: "GOVERNANCE_ADMIN",
      details: JSON.stringify({ ref, detail, at: new Date().toISOString() }),
    },
  });
}
