"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleCheck,
  CreditCard,
  FilePlus2,
  Gauge,
  Loader2,
  Play,
  Save,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLoomGuard } from "./store";
import { FindingCard } from "./FindingCard";
import { TraceDrawer } from "./TraceDrawer";
import { VisualCanvas } from "./VisualCanvas";
import { NewAssetDialog } from "./NewAssetDialog";
import type { AssetDetail, AssetListItem, CanonDTO, FindingDTO, RunDTO } from "@/lib/api-types";
import { PILLAR_LABELS, type Pillar } from "@/lib/types";
import { cn } from "@/lib/utils";

const PILLAR_ORDER: Pillar[] = [
  "CONFIDENTIALITY",
  "FACT_CLAIM",
  "TRANSACTION_INTEGRITY",
  "TERMINOLOGY",
  "VOICE",
  "VISUAL_GEOMETRY",
  "ACCESSIBILITY_WCAG",
];

export function ProofingStudio({
  assets,
  onAssetsChanged,
}: {
  assets: AssetListItem[];
  onAssetsChanged: () => void;
}) {
  const { activeAssetId, setActiveAssetId, privacyLock } = useLoomGuard();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [canon, setCanon] = useState<CanonDTO | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [traceFinding, setTraceFinding] = useState<FindingDTO | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Lazy-load canon once
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/canon");
        if (res.ok) setCanon(await res.json());
      } catch {
        /* transient */
      }
    })();
  }, []);

  const loadAsset = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/assets/${id}`);
        if (!res.ok) throw new Error("Failed to load asset");
        const detail: AssetDetail = await res.json();
        setAsset(detail);
        setDraft(detail.content);
        setDirty(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load asset");
      }
    },
    []
  );

  // Auto-select first asset
  useEffect(() => {
    if (!activeAssetId && assets.length > 0) setActiveAssetId(assets[0].id);
    if (activeAssetId) void loadAsset(activeAssetId);
  }, [activeAssetId, assets, setActiveAssetId, loadAsset]);

  const latestRun: RunDTO | null = asset?.runs?.[0] ?? null;

  async function saveDraft(autoToast = true) {
    if (!asset) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDirty(false);
      if (autoToast) toast.success("Draft saved");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function runAudit() {
    if (!asset) return;
    if (dirty) await saveDraft(false);
    setAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, airGapped: privacyLock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      await loadAsset(asset.id);
      onAssetsChanged();
      const run = data.run as RunDTO;
      const critical = (run.findingsBySeverity.CRITICAL ?? 0) + (run.findingsBySeverity.HIGH ?? 0);
      if (run.llmStatus === "DEGRADED") {
        toast.warning("Semantic pass degraded — deterministic findings intact", {
          description: `All Stage-1 checks returned in ${run.stage1LatencyMs.toFixed(1)}ms; the external AI service was unreachable and semantic checks were queued for retry.`,
        });
      } else if (run.llmStatus === "AIR_GAPPED") {
        toast.info("Air-gapped audit complete (Privacy Lock on)", {
          description: `Deterministic-only verification in ${run.stage1LatencyMs.toFixed(1)}ms — no external calls were made.`,
        });
      } else {
        toast.success(
          critical > 0
            ? `Audit complete — ${critical} critical/high finding(s)`
            : "Audit complete — no critical findings",
          {
            description: `Stage 1 deterministic: ${run.stage1LatencyMs.toFixed(1)}ms · Stage 2 semantic: ${run.stage2LatencyMs.toFixed(0)}ms (${run.llmStatus}).`,
          }
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setAuditing(false);
    }
  }

  const findingsByPillar = useMemo(() => {
    const map = new Map<Pillar, FindingDTO[]>();
    for (const f of latestRun?.findings ?? []) {
      const list = map.get(f.pillar as Pillar) ?? [];
      list.push(f);
      map.set(f.pillar as Pillar, list);
    }
    return map;
  }, [latestRun]);

  const pendingCount = (latestRun?.findings ?? []).filter((f) => f.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {/* ── Audit command bar ─────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Select
            value={asset?.id ?? ""}
            onValueChange={(v) => setActiveAssetId(v)}
            disabled={assets.length === 0}
          >
            <SelectTrigger className="h-9 w-full min-w-52 flex-1 border-slate-300 bg-white text-[13px] font-medium sm:max-w-96 sm:flex-none">
              <SelectValue placeholder={assets.length ? "Select an asset" : "No assets yet"} />
            </SelectTrigger>
            <SelectContent>
              {assets.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-[13px]">
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 border-slate-300 text-[12.5px] font-semibold"
            onClick={() => setNewOpen(true)}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden />
            New Draft
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {dirty && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-amber-400 text-[12.5px] font-semibold text-amber-700 hover:bg-amber-50"
                onClick={() => saveDraft()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                Save Draft
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 bg-slate-900 text-[13px] font-bold hover:bg-slate-800"
              onClick={runAudit}
              disabled={!asset || auditing}
            >
              {auditing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Auditing…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden />
                  Run Pre-Publication Audit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!asset ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <ScanSearch className="h-10 w-10" aria-hidden />
            <p className="text-sm">Create a draft or load the demo launch packet to begin.</p>
            <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
              <FilePlus2 className="h-4 w-4" aria-hidden /> New Draft
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ── Left: editor + visual canvas ─────────────── */}
          <div className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 px-4 py-3">
                <CardTitle className="text-[14px]">{asset.title}</CardTitle>
                <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
                  {asset.assetType}
                </Badge>
                {dirty && (
                  <Badge className="border-0 bg-amber-400 text-[10px] font-bold text-amber-950">
                    UNSAVED
                  </Badge>
                )}
                <span className="ml-auto font-mono text-[10px] text-slate-400">
                  {draft.length.toLocaleString()} chars
                </span>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <textarea
                  ref={editorRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setDirty(true);
                  }}
                  spellCheck={false}
                  aria-label="Asset content editor"
                  className="h-80 w-full resize-y rounded-lg border border-slate-200 bg-white p-4 font-mono text-[12.5px] leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Paste or draft your press release, landing page HTML, or blog markdown here…"
                />
              </CardContent>
            </Card>

            <VisualCanvas
              asset={asset}
              run={latestRun}
              swatches={canon?.swatches ?? []}
              onActionComplete={() => {
                void loadAsset(asset.id);
                onAssetsChanged();
              }}
              disabled={auditing}
            />
          </div>

          {/* ── Right: audit results ─────────────────────── */}
          <div className="space-y-4">
            {latestRun ? (
              <RunSummary run={latestRun} />
            ) : (
              <Card className="border-dashed border-slate-300">
                <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <Gauge className="h-8 w-8" aria-hidden />
                  <p className="text-sm">No audit yet — run the pre-publication audit to see findings.</p>
                </CardContent>
              </Card>
            )}

            {latestRun && (
              <CheckoutTruthPanel run={latestRun} />
            )}

            {latestRun && latestRun.findings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-bold text-slate-700">
                    Findings{" "}
                    <span className="font-mono text-[11px] font-normal text-slate-400">
                      ({pendingCount} pending of {latestRun.findings.length})
                    </span>
                  </h3>
                </div>

                {PILLAR_ORDER.filter((p) => findingsByPillar.has(p)).map((pillar) => {
                  const list = findingsByPillar.get(pillar)!;
                  const isCollapsed = collapsed[pillar];
                  const pending = list.filter((f) => f.status === "PENDING").length;
                  return (
                    <div key={pillar} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setCollapsed((c) => ({ ...c, [pillar]: !c[pillar] }))}
                        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-300"
                        aria-expanded={!isCollapsed}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-slate-400 transition-transform",
                            isCollapsed && "-rotate-90"
                          )}
                          aria-hidden
                        />
                        <span className="text-[13px] font-bold text-slate-700">
                          {PILLAR_LABELS[pillar]}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "ml-1 font-mono text-[10px]",
                            pending > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {pending > 0 ? `${pending} pending` : "all resolved"}
                        </Badge>
                      </button>
                      {!isCollapsed &&
                        list.map((f) => (
                          <FindingCard
                            key={f.findingId}
                            finding={f}
                            onOpenTrace={setTraceFinding}
                            onActionComplete={() => {
                              void loadAsset(asset.id);
                              onAssetsChanged();
                            }}
                            disabled={auditing}
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
            )}

            {latestRun && latestRun.findings.length === 0 && (
              <Card className="border-emerald-300 bg-emerald-50">
                <CardContent className="flex items-center gap-3 px-4 py-6">
                  <CircleCheck className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden />
                  <div>
                    <p className="text-[14px] font-bold text-emerald-900">
                      Clean pass — asset is publication-ready
                    </p>
                    <p className="text-[12px] text-emerald-700">
                      All six pillars returned zero violations. Submit for review from the
                      Review Workflow tab.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <NewAssetDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          setActiveAssetId(id);
          onAssetsChanged();
        }}
      />

      <TraceDrawer
        finding={traceFinding}
        open={traceFinding !== null}
        onOpenChange={(o) => !o && setTraceFinding(null)}
      />
    </div>
  );
}

function RunSummary({ run }: { run: RunDTO }) {
  const readiness = Math.round(run.readinessScore);
  const tone =
    readiness >= 85 ? "text-emerald-600" : readiness >= 60 ? "text-amber-600" : "text-red-600";
  const llmTone =
    run.llmStatus === "OK"
      ? "bg-violet-100 text-violet-800 border-violet-300"
      : run.llmStatus === "AIR_GAPPED"
        ? "bg-slate-100 text-slate-700 border-slate-300"
        : run.llmStatus === "DEGRADED"
          ? "bg-amber-100 text-amber-800 border-amber-300"
          : "bg-slate-100 text-slate-500 border-slate-200";
  const paypalMode = run.paypalStatus?.split("/")[0] ?? null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-[14px]">
          <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
          Audit Readiness
        </CardTitle>
        <span className={cn("text-3xl font-black tabular-nums", tone)}>{readiness}</span>
        <div className="min-w-32 flex-1">
          <Progress
            value={readiness}
            className="h-2"
            aria-label={`Readiness score ${readiness} out of 100`}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 text-[11.5px] text-slate-500">
        <span className="flex items-center gap-1 font-mono">
          <Zap className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Stage 1 · {run.stage1LatencyMs.toFixed(1)}ms
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Timer className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          Stage 2 · {run.stage2LatencyMs.toFixed(0)}ms
        </span>
        <Badge variant="outline" className={cn("font-mono text-[10px]", llmTone)}>
          LLM: {run.llmStatus}
          {run.llmModel ? ` · ${run.llmModel}` : ""}
        </Badge>
        {paypalMode && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 font-mono text-[10px]",
              paypalMode === "LIVE"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : paypalMode === "SANDBOX"
                  ? "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-slate-300 bg-slate-50 text-slate-600"
            )}
          >
            <CreditCard className="h-3 w-3" aria-hidden />
            PayPal: {paypalMode}
            {run.paypalLatencyMs != null ? ` · ${run.paypalLatencyMs.toFixed(0)}ms` : ""}
          </Badge>
        )}
        <span className="font-mono text-[10px] text-slate-400">
          {new Date(run.createdAt).toLocaleTimeString()}
        </span>
        {(run.findingsBySeverity.CRITICAL ?? 0) > 0 && (
          <span className="flex items-center gap-1 font-mono font-bold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {run.findingsBySeverity.CRITICAL} critical
          </span>
        )}
        {Object.entries(run.tokenMap).length > 0 && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 font-mono text-[10px] text-amber-800">
            🛡️ {Object.keys(run.tokenMap).length} secret(s) masked pre-transmission
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   The Checkout Truth panel — PayPal Orders API v2 evidence strip.
   Renders when the audited asset contains monetary offers: every
   advertised price is re-charged through the PayPal Orders API
   against the Merchant Pricing Canon; advertised ≠ charged becomes
   a CRITICAL finding before the campaign ever ships.
   ════════════════════════════════════════════════════════════ */

function CheckoutTruthPanel({ run }: { run: RunDTO }) {
  const payFindings = run.findings.filter((f) => f.pillar === "TRANSACTION_INTEGRITY");
  if (payFindings.length === 0 && (run.paypalOrders?.length ?? 0) === 0) return null;

  const [modeRaw, aiState] = (run.paypalStatus ?? "SIMULATION/AI_NONE").split("/");
  const aiOk = aiState === "AI_OK";
  const verified = payFindings.filter((f) => f.verdict === "CHECKOUT_TRUTH_VERIFIED").length;
  const mismatched = payFindings.filter((f) => f.verdict === "ADVERTISED_CHARGE_MISMATCH").length;
  const unmapped = payFindings.filter((f) => f.verdict === "NO_PURCHASABLE_SKU").length;

  return (
    <Card className="border-sky-200 bg-gradient-to-b from-sky-50/60 to-white">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-[14px] text-slate-800">
          <CreditCard className="h-4 w-4 text-sky-600" aria-hidden />
          Checkout Truth Engine
        </CardTitle>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px]",
            modeRaw === "LIVE"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : modeRaw === "SANDBOX"
                ? "border-sky-300 bg-white text-sky-800"
                : "border-slate-300 bg-white text-slate-600"
          )}
        >
          PAYPAL ORDERS API v2 · {modeRaw}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-mono text-[10px]",
            aiOk
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-slate-300 bg-white text-slate-500"
          )}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          AI offer extraction: {aiState?.replace("AI_", "") ?? "NONE"}
        </Badge>
        <span className="ml-auto font-mono text-[10px] text-slate-400">
          {run.paypalOrders?.length ?? 0} order{run.paypalOrders?.length === 1 ? "" : "s"} on record
        </span>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 pb-4">
        <p className="text-[12px] leading-relaxed text-slate-500">
          Every monetary offer in this asset was re-charged through the PayPal Orders API against
          the Merchant Pricing Canon — advertised vs. charged, field by field, before publication.
        </p>

        {payFindings.map((f) => {
          const p = f.provenance?.paypal;
          const isMismatch = f.verdict === "ADVERTISED_CHARGE_MISMATCH";
          const isUnmapped = f.verdict === "NO_PURCHASABLE_SKU";
          return (
            <div
              key={f.findingId}
              className={cn(
                "rounded-lg border bg-white px-3 py-2.5",
                isMismatch
                  ? "border-red-200"
                  : isUnmapped
                    ? "border-amber-200"
                    : "border-emerald-200"
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide",
                    isMismatch
                      ? "bg-red-600 text-white"
                      : isUnmapped
                        ? "bg-amber-400 text-amber-950"
                        : "bg-emerald-600 text-white"
                  )}
                >
                  {isMismatch ? "DRIP PRICING" : isUnmapped ? "NO SKU" : "VERIFIED"}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-700">
                  {p
                    ? `advertised ${p.advertised.amount} ${p.advertised.currency}`
                    : "offer with no purchasable product"}
                  {p && !isUnmapped && (
                    <>
                      {" "}
                      <span className={isMismatch ? "text-red-600" : "text-slate-400"}>≠</span>{" "}
                      <span className={isMismatch ? "text-red-600" : "text-emerald-700"}>
                        charged {p.charged.amount} {p.charged.currency}
                      </span>
                    </>
                  )}
                </span>
                {p?.sku && (
                  <span className="font-mono text-[10px] text-slate-400">SKU {p.sku}</span>
                )}
                {p?.orderId && !p.orderId.startsWith("SIM-") && (
                  <span className="ml-auto font-mono text-[10px] text-sky-700">{p.orderId}</span>
                )}
                {p?.orderId?.startsWith("SIM-") && (
                  <span className="ml-auto font-mono text-[10px] text-slate-400">
                    {p.orderId} (sim — add PayPal keys to .env)
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-slate-500">
                {f.explanation}
              </p>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-sky-100 pt-2 font-mono text-[10px] text-slate-400">
          <span className="text-emerald-600">{verified} verified</span>
          <span className={mismatched > 0 ? "font-bold text-red-600" : "text-slate-400"}>
            {mismatched} mismatched
          </span>
          <span className={unmapped > 0 ? "text-amber-600" : "text-slate-400"}>
            {unmapped} unmapped
          </span>
          {run.paypalOrders && run.paypalOrders.length > 0 && (
            <span className="ml-auto truncate" title={run.paypalOrders.map((o) => o.orderId).join(", ")}>
              receipts: {run.paypalOrders.map((o) => o.orderId).join(" · ")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
