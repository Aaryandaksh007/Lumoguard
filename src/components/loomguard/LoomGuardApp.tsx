"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookMarked,
  ClipboardCheck,
  CreditCard,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Loader2,
  Lock,
  LockOpen,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLoomGuard } from "./store";
import { ProofingStudio } from "./ProofingStudio";
import { BrandCanon } from "./BrandCanon";
import { ReviewWorkflow } from "./ReviewWorkflow";
import { GovernanceInsights } from "./GovernanceInsights";
import { AuditTrail } from "./AuditTrail";
import { ROLE_LABELS, type WorkflowRole } from "@/lib/types";
import type { AssetListItem } from "@/lib/api-types";
import { cn } from "@/lib/utils";

export function LoomGuardApp() {
  const { activeRole, setActiveRole, privacyLock, togglePrivacyLock, activeTab, setActiveTab } =
    useLoomGuard();
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paypal, setPaypal] = useState<{
    mode: string;
    configured: boolean;
    api: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/paypal/status");
        if (res.ok) setPaypal(await res.json());
      } catch {
        /* transient */
      }
    })();
  }, []);

  const refreshAssets = useMemo(
    () => async () => {
      try {
        const res = await fetch("/api/assets");
        if (res.ok) setAssets(await res.json());
      } catch {
        /* transient */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const pendingReview = assets.filter(
    (a) => a.status === "IN_REVIEW" && a.assigneeRole === activeRole
  ).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <FlaskConical className="h-5 w-5" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold tracking-tight">LoomGuard</span>
                <span className="block text-[11px] text-slate-500">
                  Pre-Publication Brand Governance
                </span>
              </span>
            </Link>

            <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    {privacyLock ? (
                      <Lock className="h-4 w-4 text-emerald-600" aria-hidden />
                    ) : (
                      <LockOpen className="h-4 w-4 text-slate-400" aria-hidden />
                    )}
                    <Switch
                      id="privacy-lock"
                      checked={privacyLock}
                      onCheckedChange={(v) => {
                        togglePrivacyLock();
                        toast.info(
                          v
                            ? "Privacy Lock engaged — air-gapped mode. Semantic passes run locally; no external AI calls."
                            : "Privacy Lock disengaged — Stage-2 semantic passes route through the external AI service (via the reversible confidentiality shield)."
                        );
                      }}
                      aria-label="Toggle air-gapped privacy lock"
                    />
                    <span className="hidden text-[11px] font-medium text-slate-600 sm:inline">
                      Privacy Lock
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-64 text-left">
                  Inkloom-style air-gapped mode: blocks all external API calls at the
                  middleware layer. Deterministic Stage-1 findings still return in &lt;50ms.
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                      paypal?.mode === "LIVE"
                        ? "border-emerald-300 bg-emerald-50"
                        : paypal?.mode === "SANDBOX"
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-slate-50"
                    )}
                  >
                    <CreditCard
                      className={cn(
                        "h-4 w-4",
                        paypal?.mode === "LIVE"
                          ? "text-emerald-600"
                          : paypal?.mode === "SANDBOX"
                            ? "text-sky-600"
                            : "text-slate-400"
                      )}
                      aria-hidden
                    />
                    <span className="hidden font-mono text-[10.5px] font-semibold uppercase tracking-wide sm:inline">
                      PayPal {paypal?.mode ?? "…"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-72 text-left">
                  Checkout Truth Engine — {paypal?.api ?? "Orders API v2"}. Every monetary offer
                  in audited content is re-charged through PayPal Orders API v2 against the
                  Merchant Pricing Canon; advertised ≠ charged becomes a CRITICAL finding.
                  {paypal && !paypal.configured && (
                    <span className="mt-1 block text-amber-600">
                      Simulation mode: add PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET to .env — no code
                      changes needed, orders go to the live sandbox the moment keys land.
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] font-medium uppercase tracking-wide text-slate-400 md:inline">
                  Acting as
                </span>
                <Select value={activeRole} onValueChange={(v) => setActiveRole(v as WorkflowRole)}>
                  <SelectTrigger className="h-9 w-[168px] border-slate-300 bg-white text-[13px] font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as WorkflowRole[]).map((r) => (
                      <SelectItem key={r} value={r} className="text-[13px]">
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Tab navigation ────────────────────────────────── */}
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as never)}>
              <TabsList className="h-11 w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabTrigger value="studio" icon={<ScanSearch className="h-4 w-4" />} label="Proofing Studio" />
                <TabTrigger value="canon" icon={<BookMarked className="h-4 w-4" />} label="Brand Canon" />
                <TabTrigger
                  value="workflow"
                  icon={<GitBranch className="h-4 w-4" />}
                  label="Review Workflow"
                  badge={pendingReview > 0 ? pendingReview : undefined}
                />
                <TabTrigger value="insights" icon={<LayoutDashboard className="h-4 w-4" />} label="Governance Insights" />
                <TabTrigger value="trail" icon={<ClipboardCheck className="h-4 w-4" />} label="Audit Trail" />
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <p className="text-sm">Loading Brand Canon and workspace…</p>
            </div>
          ) : activeTab === "studio" ? (
            <ProofingStudio assets={assets} onAssetsChanged={refreshAssets} />
          ) : activeTab === "canon" ? (
            <BrandCanon />
          ) : activeTab === "workflow" ? (
            <ReviewWorkflow assets={assets} onAssetsChanged={refreshAssets} />
          ) : activeTab === "insights" ? (
            <GovernanceInsights />
          ) : (
            <AuditTrail />
          )}
        </main>

        {/* ── Sticky footer ──────────────────────────────────── */}
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-slate-500 sm:px-6">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              LoomGuard — Two-Stage Hybrid Verification · Deterministic engines run locally
              (zero hallucination); AI proposals always require human sign-off.
            </p>
            <p className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              AI: Stage-2 semantic passes + offer-term extraction via external LLM behind the
              reversible confidentiality shield · Payments: PayPal Orders API v2.
              <Sparkles className="h-3 w-3 text-violet-500" aria-hidden />
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

function TabTrigger({
  value,
  icon,
  label,
  badge,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="relative h-11 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 text-[13px] font-medium text-slate-500 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 sm:px-4"
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(" ")[0]}</span>
        {badge !== undefined && (
          <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950">
            {badge}
          </span>
        )}
      </span>
    </TabsTrigger>
  );
}
