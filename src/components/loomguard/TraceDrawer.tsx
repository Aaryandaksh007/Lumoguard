"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cpu, Database, EyeOff, Link2, Timer, Unlock } from "lucide-react";
import { EngineBadge } from "./badges";
import type { FindingDTO } from "@/lib/api-types";
import type { Provenance } from "@/lib/types";

/**
 * Secret Weapon #2 — the Inkloom "Context Trace" Provenance Drawer.
 * Three verifiable records on every finding:
 *  1. Execution Provenance (engine, model, prompt version, latency)
 *  2. Exact Context Lineage (canon rule IDs, locked vs dynamic retrieval)
 *  3. Confidentiality Shield Audit Proof (sanitized payload)
 */
export function TraceDrawer({
  finding,
  open,
  onOpenChange,
}: {
  finding: FindingDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!finding) return null;
  const p = finding.provenance as Provenance;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-slate-500" aria-hidden />
            Context Trace Provenance
          </SheetTitle>
          <SheetDescription className="text-left">
            Full AI/decision provenance for{" "}
            <span className="font-mono text-[12px] font-semibold text-slate-700">
              {finding.findingId}
            </span>{" "}
            — satisfies the explainability &amp; AI-disclosure mandate.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          {/* 1. Execution Provenance */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800">
              <Cpu className="h-4 w-4 text-slate-500" aria-hidden />
              1 · Execution Provenance
            </h3>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
              <dt className="text-slate-500">Engine</dt>
              <dd className="font-semibold">
                <EngineBadge engine={p.engine} />
              </dd>
              <dt className="text-slate-500">Algorithm</dt>
              <dd className="font-mono text-[11px] leading-snug text-slate-700">{p.algorithm}</dd>
              <dt className="text-slate-500">Model</dt>
              <dd className="font-mono text-[11px] text-slate-700">
                {p.model ?? "— (local deterministic — no model involved)"}
              </dd>
              <dt className="text-slate-500">Prompt</dt>
              <dd className="font-mono text-[11px] text-slate-700">
                {p.promptVersion ?? "— (none — pure math/regex)"}
              </dd>
              <dt className="text-slate-500">Latency</dt>
              <dd className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                <Timer className="h-3 w-3 text-slate-400" aria-hidden />
                {typeof p.latencyMs === "number" ? `${p.latencyMs.toFixed(2)} ms` : "—"}
              </dd>
              <dt className="text-slate-500">Air-gapped</dt>
              <dd className="font-mono text-[11px] text-slate-700">
                {p.airGappedMode ? "YES (privacy lock on)" : "no"}
              </dd>
            </dl>
          </section>

          {/* 2. Context Lineage */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800">
              <Database className="h-4 w-4 text-slate-500" aria-hidden />
              2 · Exact Context Lineage
            </h3>
            <p className="mb-2 text-[12px] text-slate-500">
              Every Brand Canon rule and approved fact chunk consulted, with locked vs.
              dynamically-retrieved status.
            </p>
            {p.citation && (
              <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
                <span className="font-semibold">Cited spec: </span>
                {p.citation}
              </div>
            )}
            {p.retrievedClauses && p.retrievedClauses.length > 0 ? (
              <ul className="space-y-1.5">
                {p.retrievedClauses.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]"
                  >
                    <Badge
                      variant="outline"
                      className={`mt-0.5 shrink-0 font-mono text-[9px] ${
                        c.retrieval === "LOCKED"
                          ? "border-slate-300 bg-slate-100 text-slate-600"
                          : "border-sky-300 bg-sky-50 text-sky-700"
                      }`}
                    >
                      {c.retrieval}
                    </Badge>
                    <span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700">{c.id}</span>
                      <span className="block text-slate-600">{c.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12px] text-slate-400">
                No canon records retrieved — this verdict reflects an evidence gap (that&apos;s the point).
              </p>
            )}
          </section>

          {/* 3. Confidentiality Shield Audit Proof */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800">
              <EyeOff className="h-4 w-4 text-slate-500" aria-hidden />
              3 · Confidentiality Shield Audit Proof
            </h3>
            <p className="mb-2 text-[12px] text-slate-500">
              The exact sanitized payload transmitted beyond the server perimeter (if any).
              Placeholders <span className="font-mono">{"{{LIKE_THIS_1}}"}</span> were masked by the
              reversible proxy and restored longest-first on return.
            </p>
            {p.sanitizedPayloadPreview ? (
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-amber-200 bg-amber-50 p-3 font-mono text-[11px] leading-relaxed text-amber-950">
                {p.sanitizedPayloadPreview}
              </pre>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                <Unlock className="h-3.5 w-3.5" aria-hidden />
                Deterministic local execution — no data left this server for this finding.
              </div>
            )}
          </section>

          <Separator />

          {/* Finding raw record */}
          <section>
            <h3 className="mb-2 text-[13px] font-bold text-slate-800">Raw finding record</h3>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 font-mono text-[10.5px] leading-relaxed text-slate-600">
              {JSON.stringify(
                {
                  finding_id: finding.findingId,
                  pillar: finding.pillar,
                  rule_id: finding.ruleId,
                  severity: finding.severity,
                  verdict: finding.verdict,
                  char_span: [finding.charStart, finding.charEnd],
                  intent_preservation: finding.intentPreservation,
                  status: finding.status,
                  provenance: finding.provenance,
                },
                null,
                2
              )}
            </pre>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
