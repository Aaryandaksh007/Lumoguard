"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PILLAR_LABELS, STATUS_LABELS, type Pillar, type Severity } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity | string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-600 text-white hover:bg-red-600",
    HIGH: "bg-orange-500 text-white hover:bg-orange-500",
    MEDIUM: "bg-amber-400 text-amber-950 hover:bg-amber-400",
    LOW: "bg-slate-400 text-white hover:bg-slate-400",
    INFO: "bg-emerald-600 text-white hover:bg-emerald-600",
  };
  return (
    <Badge className={cn("border-0 font-semibold tracking-wide", map[severity] ?? map.LOW)}>
      {severity}
    </Badge>
  );
}

const PILLAR_ICONS: Record<Pillar, string> = {
  TERMINOLOGY: "🔤",
  VOICE: "🎙️",
  FACT_CLAIM: "⚖️",
  TRANSACTION_INTEGRITY: "💳",
  VISUAL_GEOMETRY: "🎨",
  ACCESSIBILITY_WCAG: "♿",
  CONFIDENTIALITY: "🛡️",
};

export function PillarBadge({ pillar }: { pillar: Pillar | string }) {
  const key = (pillar as Pillar) in PILLAR_LABELS ? (pillar as Pillar) : null;
  return (
    <Badge variant="outline" className="gap-1.5 border-slate-300 bg-slate-50 font-medium text-slate-700">
      {key ? PILLAR_ICONS[key] : "•"} {key ? PILLAR_LABELS[key] : pillar}
    </Badge>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  PREFLIGHT_CHECKED: "bg-sky-100 text-sky-800 border-sky-300",
  IN_REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800 border-orange-300",
  APPROVED_FOR_PUBLISH: "bg-emerald-100 text-emerald-800 border-emerald-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT)}
    >
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </Badge>
  );
}

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const tone = verdict.includes("VERIFIED")
    ? "text-emerald-700"
    : verdict.includes("UNSUBSTANTIATED") || verdict.includes("CONFIDENTIAL")
      ? "text-red-700"
      : "text-slate-600";
  return (
    <span className={cn("font-mono text-[11px] font-semibold tracking-tight", tone)}>
      {verdict}
    </span>
  );
}

export function EngineBadge({ engine }: { engine: string }) {
  const isLocal = engine.includes("LOCAL") || engine.includes("NUMERIC");
  const isLlm = engine.includes("EXTERNAL");
  const isPaypal = engine.includes("PAYPAL");
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-mono text-[10px]",
        isPaypal
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : isLlm
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : isLocal
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
      )}
    >
      {isPaypal
        ? "💳 PAYPAL ORDERS API V2"
        : isLlm
          ? "◈ EXTERNAL AI"
          : isLocal
            ? "⚡ DETERMINISTIC"
            : "🛡️ PRESIDIO PROXY"}
    </Badge>
  );
}
