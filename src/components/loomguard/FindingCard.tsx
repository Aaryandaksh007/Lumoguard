"use client";

import { useState } from "react";
import { Check, FileSearch, Loader2, PenLine, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { EngineBadge, PillarBadge, SeverityBadge, VerdictBadge } from "./badges";
import { DiffView, TokenSwapView } from "./DiffView";
import { generateInlineDiffChunks } from "@/lib/engines/diff-engine";
import { PILLAR_LABELS, type Pillar, type Provenance, type Severity } from "@/lib/types";
import type { FindingDTO } from "@/lib/api-types";

interface FindingCardProps {
  finding: FindingDTO;
  onOpenTrace: (finding: FindingDTO) => void;
  onActionComplete: (action: "ACCEPT" | "OVERRIDE", diff?: string, original?: string) => void;
  disabled?: boolean;
}

export function FindingCard({ finding, onOpenTrace, onActionComplete, disabled }: FindingCardProps) {
  const [acting, setActing] = useState<"accept" | "override" | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(finding.status);

  // keep in sync with finding prop
  if (finding.status !== currentStatus && acting === null && (finding.status === "ACCEPTED" || finding.status === "OVERRIDDEN")) {
    setCurrentStatus(finding.status);
  }

  const chunks =
    finding.suggestedDiff && finding.suggestedDiff !== finding.originalSpan
      ? generateInlineDiffChunks(finding.originalSpan, finding.suggestedDiff)
      : [];

  const isTokenSwap =
    finding.pillar === "VISUAL_GEOMETRY" ||
    (finding.pillar === "ACCESSIBILITY_WCAG" && finding.suggestedDiff?.startsWith("#")) ||
    finding.pillar === "CONFIDENTIALITY";

  async function accept() {
    if (!finding.suggestedDiff) {
      toast.info("This finding is informational or requires a manual edit — nothing to apply automatically.");
      return;
    }
    setActing("accept");
    try {
      const res = await fetch("/api/findings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: finding.findingId, action: "ACCEPT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Accept failed");
      setCurrentStatus("ACCEPTED");
      toast.success("Surgical diff applied", {
        description: "The minimal-span edit was committed; the prior text remains in the version history.",
      });
      onActionComplete("ACCEPT", finding.suggestedDiff, finding.originalSpan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply diff");
    } finally {
      setActing(null);
    }
  }

  async function override(reason: string, comment: string) {
    setActing("override");
    try {
      const res = await fetch("/api/findings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: finding.findingId,
          action: "OVERRIDE",
          overrideReason: reason,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Override failed");
      setCurrentStatus("OVERRIDDEN");
      toast.warning("Flag overridden — routed for review", {
        description:
          "Your structured justification was logged to the audit trail and feeds the Guideline Ambiguity Score.",
      });
      onActionComplete("OVERRIDE");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record override");
    } finally {
      setActing(null);
      setShowOverride(false);
    }
  }

  const resolved = currentStatus !== "PENDING";

  return (
    <Card
      className={`overflow-hidden border transition-shadow hover:shadow-md ${
        resolved
          ? "border-slate-200 bg-slate-50/60 opacity-75"
          : finding.severity === "CRITICAL"
            ? "border-red-200 bg-white"
            : "border-slate-200 bg-white"
      }`}
    >
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 px-4 py-3">
        <SeverityBadge severity={finding.severity} />
        <PillarBadge pillar={finding.pillar} />
        <VerdictBadge verdict={finding.verdict} />
        <span className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400">{finding.ruleId}</span>
          <EngineBadge engine={finding.provenance.engine} />
        </span>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4">
        {/* Flagged span + surgical diff */}
        {finding.suggestedDiff && chunks.length > 0 && !isTokenSwap && <DiffView chunks={chunks} />}
        {finding.suggestedDiff && isTokenSwap && (
          <TokenSwapView from={finding.originalSpan} to={finding.suggestedDiff} />
        )}
        {!finding.suggestedDiff && (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-serif text-[13px] text-slate-700">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Flagged ·{" "}
            </span>
            {finding.originalSpan}
          </p>
        )}

        <p className="text-[13px] leading-relaxed text-slate-600">{finding.explanation}</p>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="font-mono">
            intent-preservation {Math.round(finding.intentPreservation * 100)}%
          </span>
          <span>·</span>
          <span className="font-mono">
            {(finding.provenance as Provenance).latencyMs?.toFixed?.(2) ?? "—"}ms
          </span>
          {(finding.provenance as Provenance).model && (
            <>
              <span>·</span>
              <span className="font-mono text-violet-500">
                {(finding.provenance as Provenance).model}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        {!resolved ? (
          <div className="flex flex-wrap gap-2 border-t border-dashed border-slate-200 pt-3">
            <Button
              size="sm"
              variant="default"
              className="h-8 bg-emerald-600 text-[12px] font-semibold hover:bg-emerald-700"
              onClick={accept}
              disabled={disabled || acting !== null || !finding.suggestedDiff}
            >
              {acting === "accept" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              Accept Surgical Fix
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-slate-300 text-[12px] font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800"
              onClick={() => setShowOverride(true)}
              disabled={disabled || acting !== null}
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              Override / Keep Original
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-8 text-[12px] font-semibold text-slate-500 hover:text-slate-900"
              onClick={() => onOpenTrace(finding)}
            >
              <FileSearch className="h-3.5 w-3.5" aria-hidden />
              Trace Provenance
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                currentStatus === "ACCEPTED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {currentStatus === "ACCEPTED" ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <ShieldQuestion className="h-3 w-3" aria-hidden />
              )}
              {currentStatus === "ACCEPTED"
                ? "Surgical diff accepted & applied"
                : "Overridden with justification — routed to review queue"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
              onClick={() => onOpenTrace(finding)}
            >
              <FileSearch className="h-3 w-3" aria-hidden />
              Trace Provenance
            </Button>
          </div>
        )}
      </CardContent>

      {showOverride && (
        <OverrideForm
          onSubmit={override}
          onCancel={() => setShowOverride(false)}
          busy={acting === "override"}
          pillar={finding.pillar}
        />
      )}
    </Card>
  );
}

function OverrideForm({
  onSubmit,
  onCancel,
  busy,
  pillar,
}: {
  onSubmit: (reason: string, comment: string) => void;
  onCancel: () => void;
  busy: boolean;
  pillar: Pillar;
}) {
  const [reason, setReason] = useState("INTENTIONAL_STYLE");
  const [comment, setComment] = useState("");

  const reasons: { value: string; label: string; hint: string }[] = [
    { value: "INTENTIONAL_STYLE", label: "Intentional stylistic choice", hint: "Deliberate voice — never flagged as failure" },
    { value: "UNCLEAR_GUIDELINE", label: "Guideline is unclear", hint: "Feeds the GAS engine → Canon Refiner" },
    { value: "APPROVED_EXCEPTION", label: "Approved exception", hint: "Pre-authorized by Brand Manager / Legal" },
  ];

  return (
    <div className="space-y-3 border-t border-amber-200 bg-amber-50/70 px-4 py-3">
      <p className="text-[12px] font-semibold text-amber-900">
        Structured override justification — required so the governance telemetry can attribute friction:
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {reasons.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setReason(r.value)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              reason === r.value
                ? "border-amber-500 bg-amber-100 ring-1 ring-amber-400"
                : "border-amber-200 bg-white hover:border-amber-300"
            }`}
          >
            <span className="block text-[12px] font-semibold text-amber-950">{r.label}</span>
            <span className="block text-[10px] text-amber-700">{r.hint}</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={`Why are you keeping the original ${PILLAR_LABELS[pillar].toLowerCase()} choice? (optional — long comments count as dispute threads in the GAS model)`}
        className="min-h-16 w-full resize-y rounded-md border border-amber-200 bg-white px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 bg-amber-600 text-[12px] font-semibold hover:bg-amber-700"
          disabled={busy}
          onClick={() => onSubmit(reason, comment)}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Record Override & Route for Review
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[12px] text-slate-500"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
