"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  MailWarning,
  Send,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { StatusBadge } from "./badges";
import { useLoomGuard } from "./store";
import type { AssetListItem } from "@/lib/api-types";
import { ROLE_LABELS, STATUS_LABELS, type AssetStatus, type WorkflowRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLOW: AssetStatus[] = [
  "DRAFT",
  "PREFLIGHT_CHECKED",
  "IN_REVIEW",
  "APPROVED_FOR_PUBLISH",
];

export function ReviewWorkflow({
  assets,
  onAssetsChanged,
}: {
  assets: AssetListItem[];
  onAssetsChanged: () => void;
}) {
  const { activeRole } = useLoomGuard();
  const [busy, setBusy] = useState<string | null>(null);

  async function transition(assetId: string, to: AssetStatus) {
    setBusy(assetId + to);
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, transition: to, actorRole: activeRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transition rejected");
      toast.success(`Workflow: ${STATUS_LABELS[to]}`, {
        description: `Recorded as ${activeRole} in the append-only audit trail.`,
      });
      onAssetsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transition rejected", {
        description: "RBAC state machine enforced server-side.",
      });
    } finally {
      setBusy(null);
    }
  }

  const myQueue = assets.filter((a) => a.status === "IN_REVIEW" && a.assigneeRole === activeRole);
  const others = assets.filter((a) => !(a.status === "IN_REVIEW" && a.assigneeRole === activeRole));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <GitBranch className="h-5 w-5 text-slate-500" aria-hidden />
          Review Workflow & RBAC Queues
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          Four-role state machine: Creator → Brand Manager → Legal &amp; Compliance → Governance
          Admin. Overridden flags route automatically; creators cannot self-approve
          unresolved CRITICAL/HIGH findings. All transitions are append-only.
        </p>
      </div>

      {/* State machine diagram */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="flex flex-wrap items-center gap-1.5 px-4 py-4">
          {FLOW.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden />}
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11.5px] font-semibold",
                  s === "APPROVED_FOR_PUBLISH"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-300 bg-slate-50 text-slate-600"
                )}
              >
                {STATUS_LABELS[s]}
              </span>
            </span>
          ))}
          <span className="ml-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            CHANGES_REQUESTED loops back to PREFLIGHT_CHECKED
          </span>
        </CardContent>
      </Card>

      {/* My queue */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
          <MailWarning className="h-4 w-4 text-amber-500" aria-hidden />
          Awaiting {ROLE_LABELS[activeRole]} review
          <Badge className="border-0 bg-amber-400 text-[10px] font-bold text-amber-950">
            {myQueue.length}
          </Badge>
        </h2>
        {myQueue.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="px-4 py-5 text-[13px] text-slate-400">
              Nothing in your queue. Override a flag in the Proofing Studio (as its routed role)
              to see routing in action.
            </CardContent>
          </Card>
        ) : (
          myQueue.map((a) => (
            <AssetRow key={a.id} asset={a} busy={busy} onTransition={transition} showApprove />
          ))
        )}
      </section>

      {/* All assets */}
      <section className="space-y-2">
        <h2 className="text-[14px] font-bold text-slate-800">All assets</h2>
        {others.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="px-4 py-5 text-[13px] text-slate-400">No other assets.</CardContent>
          </Card>
        ) : (
          others.map((a) => (
            <AssetRow key={a.id} asset={a} busy={busy} onTransition={transition} showApprove={false} />
          ))
        )}
      </section>
    </div>
  );
}

function AssetRow({
  asset,
  busy,
  onTransition,
  showApprove,
}: {
  asset: AssetListItem;
  busy: string | null;
  onTransition: (assetId: string, to: AssetStatus) => void;
  showApprove: boolean;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-slate-800">{asset.title}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <StatusBadge status={asset.status} />
            {asset.assigneeRole && (
              <span className="font-mono text-[10px] text-amber-700">
                routed → {ROLE_LABELS[asset.assigneeRole as WorkflowRole] ?? asset.assigneeRole}
              </span>
            )}
            {asset.latestRun && (
              <span className="font-mono text-[10px]">
                readiness {Math.round(asset.latestRun.readinessScore)} · {asset.latestRun.findingsCount} findings
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {asset.status === "DRAFT" && (
            <WorkflowButton
              label="Run Audit First"
              icon={<Send className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => onTransition(asset.id, "PREFLIGHT_CHECKED")}
              disabled={busy !== null}
              variant="outline"
            />
          )}
          {asset.status === "PREFLIGHT_CHECKED" && (
            <WorkflowButton
              label="Submit for Review"
              icon={<Send className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => onTransition(asset.id, "IN_REVIEW")}
              disabled={busy !== null}
            />
          )}
          {asset.status === "IN_REVIEW" && showApprove && (
            <>
              <WorkflowButton
                label="Approve for Publish"
                icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                onClick={() => onTransition(asset.id, "APPROVED_FOR_PUBLISH")}
                disabled={busy !== null}
                className="bg-emerald-600 hover:bg-emerald-700"
              />
              <WorkflowButton
                label="Request Changes"
                icon={<XCircle className="h-3.5 w-3.5" aria-hidden />}
                onClick={() => onTransition(asset.id, "CHANGES_REQUESTED")}
                disabled={busy !== null}
                variant="outline"
              />
            </>
          )}
          {asset.status === "CHANGES_REQUESTED" && (
            <WorkflowButton
              label="Resubmit"
              icon={<Send className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => onTransition(asset.id, "PREFLIGHT_CHECKED")}
              disabled={busy !== null}
            />
          )}
          {asset.status === "APPROVED_FOR_PUBLISH" && (
            <WorkflowButton
              label="Reopen Review"
              icon={<Undo2 className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => onTransition(asset.id, "IN_REVIEW")}
              disabled={busy !== null}
              variant="outline"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowButton({
  label,
  icon,
  onClick,
  disabled,
  className,
  variant = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      className={cn(
        "h-8 text-[11.5px] font-semibold",
        variant === "default" && !className ? "bg-slate-900 hover:bg-slate-800" : "",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : icon}
      {label}
    </Button>
  );
}
