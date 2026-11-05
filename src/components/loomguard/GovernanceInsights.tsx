"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Repeat2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Tooltip as ChartTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PillarBadge } from "./badges";
import type { RefinerResult, TelemetryDTO } from "@/lib/api-types";
import { cn } from "@/lib/utils";

export function GovernanceInsights() {
  const [rows, setRows] = useState<TelemetryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState<string | null>(null);
  const [refinerResult, setRefinerResult] = useState<RefinerResult | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  async function runRefiner(ruleId: string) {
    setRefining(ruleId);
    try {
      const res = await fetch("/api/telemetry/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refiner failed");
      setRefinerResult(data as RefinerResult);
      await reload();
      toast.success("Canon Refiner complete — guideline upgrade diff ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Canon Refiner failed");
    } finally {
      setRefining(null);
    }
  }

  const chartData = rows.map((r) => ({
    x: r.triggersCount,
    y: r.gasScore,
    z: Math.max(40, r.overridesCount * 3),
    name: r.ruleName,
    ruleId: r.ruleId,
    classification: r.classification,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-slate-500" aria-hidden />
            Governance Insights — Guideline Ambiguity Score
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-500">
            GAS = ln(1 + triggers) · (0.5·override-rate + 0.3·dispute-rate + 0.2·min(1, T̄/48h)) —
            mathematically separating <strong>repeated creator mistakes</strong> (clear rules,
            low GAS → enable auto-fixes) from <strong>unclear brand guidelines</strong> (high
            friction → refine the guideline itself).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-slate-300 text-[12px] font-semibold"
          onClick={reload}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ── GAS quadrant scatter ─────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <TrendingUp className="h-4 w-4 text-slate-500" aria-hidden />
              Friction quadrant — trigger volume vs ambiguity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            <div className="h-72 w-full" role="img" aria-label="Scatter plot of rule trigger volume versus Guideline Ambiguity Score">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 18, bottom: 34, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="triggers"
                    domain={[0, "dataMax + 8"]}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    label={{ value: "rule triggers (volume)", position: "insideBottom", offset: -18, fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="GAS"
                    domain={[0, "dataMax + 0.4"]}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    label={{ value: "GAS (ambiguity)", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "#64748B" }}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 420]} />
                  <ReferenceLine y={1.0} stroke="#F59E0B" strokeDasharray="6 4" label={{ value: "unclear-guideline threshold (GAS 1.0)", fontSize: 10, fill: "#B45309", position: "insideTopRight" }} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof chartData)[number];
                      return (
                        <div className="max-w-64 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] shadow-lg">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="font-mono text-slate-500">
                            GAS {p.y.toFixed(3)} · {p.x} triggers
                          </p>
                          <p className={p.classification === "UNCLEAR_GUIDELINE" ? "text-amber-700" : "text-emerald-700"}>
                            {p.classification.replaceAll("_", " ")}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={chartData}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.classification === "UNCLEAR_GUIDELINE" ? "#F59E0B" : "#059669"}
                        fillOpacity={0.75}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 px-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden />
                Clear rule / habitual mistake → auto-fix + onboarding tips
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden />
                Unclear guideline → Canon Refiner
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Summary cards ────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex items-start gap-3 px-4 py-4">
              <Repeat2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-2xl font-black text-emerald-900">
                  {rows.filter((r) => r.classification === "HABITUAL_MISTAKE").length}
                </p>
                <p className="text-[12px] font-semibold text-emerald-800">Clear rules, repeated mistakes</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-emerald-700">
                  Recommend 1-click auto-fix enablement and creator onboarding micro-tips.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex items-start gap-3 px-4 py-4">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
              <div>
                <p className="text-2xl font-black text-amber-900">
                  {rows.filter((r) => r.classification === "UNCLEAR_GUIDELINE").length}
                </p>
                <p className="text-[12px] font-semibold text-amber-800">Unclear brand guidelines</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-amber-700">
                  Override/dispute friction is disproportionate — run the Canon Refiner to
                  disambiguate the guideline itself.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Rule telemetry table ──────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-[14px]">Rule-level telemetry & recommended actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          {rows.map((r) => (
            <div
              key={r.ruleId}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                r.classification === "UNCLEAR_GUIDELINE"
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-slate-200 bg-white"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PillarBadge pillar={r.pillar} />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
                  {r.ruleName}
                </p>
                <span className="font-mono text-[10px] text-slate-400">{r.ruleId}</span>
                <Badge
                  className={cn(
                    "border-0 font-mono text-[11px] font-bold",
                    r.classification === "UNCLEAR_GUIDELINE"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-600 text-white"
                  )}
                >
                  GAS {r.gasScore.toFixed(3)}
                </Badge>
                <Button
                  size="sm"
                  className="h-7 bg-violet-600 text-[11px] font-semibold hover:bg-violet-700"
                  disabled={refining !== null}
                  onClick={() => runRefiner(r.ruleId)}
                >
                  {refining === r.ruleId ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <BrainCircuit className="h-3 w-3" aria-hidden />
                  )}
                  Canon Refiner
                </Button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] text-slate-500">
                <span>{r.triggersCount} triggers</span>
                <span>
                  {r.overridesCount} overrides ({r.overrideRatePct}%)
                </span>
                <span>
                  {r.disputesCount} disputes ({r.disputeRatePct}%)
                </span>
                <span>T̄ {r.meanResolutionHours}h ({r.latencyPctOfSla}% of 48h SLA)</span>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{r.recommendation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Refiner result dialog ─────────────────────────── */}
      <Dialog open={refinerResult !== null} onOpenChange={(o) => !o && setRefinerResult(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" aria-hidden />
              Canon Refiner — Guideline Upgrade Diff
            </DialogTitle>
            <DialogDescription>
              Synthesized from human override justifications on{" "}
              <span className="font-mono">{refinerResult?.ruleId}</span> (previous GAS{" "}
              {refinerResult?.previousGas.toFixed(3)}). The friction baseline resets; the
              upgrade is recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          {refinerResult && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Upgraded guideline
                </p>
                <p className="text-[13.5px] font-medium leading-snug text-emerald-950">
                  {refinerResult.refined.upgraded_guideline}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">DO</p>
                  <ul className="list-inside list-disc space-y-1 text-[12px] leading-snug text-slate-700">
                    {refinerResult.refined.do_examples.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-red-200 bg-white p-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600">DON&apos;T</p>
                  <ul className="list-inside list-disc space-y-1 text-[12px] leading-snug text-slate-700">
                    {refinerResult.refined.dont_examples.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] leading-snug text-slate-600">
                <span className="font-semibold">Rationale: </span>
                {refinerResult.refined.rationale}
              </p>
              <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400">
                <Badge variant="outline" className="border-violet-300 bg-violet-50 font-mono text-[9px] text-violet-700">
                  {refinerResult.provenance.model} · {refinerResult.provenance.promptVersion}
                </Badge>
                synthesized from {refinerResult.provenance.synthesizedFromOverrides} override notes
                {refinerResult.provenance.degraded && " · deterministic fallback"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
