"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditLogDTO } from "@/lib/api-types";
import { cn } from "@/lib/utils";

const ACTION_TONES: Record<string, string> = {
  PREFLIGHT_AUDIT_RUN: "bg-sky-100 text-sky-800 border-sky-300",
  SURGICAL_DIFF_ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  FLAG_OVERRIDDEN: "bg-amber-100 text-amber-800 border-amber-300",
  WORKFLOW_APPROVED_FOR_PUBLISH: "bg-emerald-100 text-emerald-800 border-emerald-300",
  WORKFLOW_IN_REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
  WORKFLOW_CHANGES_REQUESTED: "bg-orange-100 text-orange-800 border-orange-300",
  CANON_REFINER_RUN: "bg-violet-100 text-violet-800 border-violet-300",
  CANON_TERM_ADDED: "bg-slate-100 text-slate-700 border-slate-300",
  CANON_FACT_ADDED: "bg-slate-100 text-slate-700 border-slate-300",
  ASSET_CREATED_DEMO: "bg-slate-100 text-slate-700 border-slate-300",
};

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ClipboardCheck className="h-5 w-5 text-slate-500" aria-hidden />
            Append-Only Governance Audit Trail
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-500">
            Every audit run, surgical-diff acceptance, override justification, workflow
            transition, and canon mutation — who, what, when. Nothing is ever overwritten.
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

      {logs.length === 0 && !loading ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="px-4 py-8 text-center text-[13px] text-slate-400">
            No governance events recorded yet — run an audit in the Proofing Studio.
          </CardContent>
        </Card>
      ) : (
        <ol className="relative space-y-2 border-l-2 border-slate-200 pl-5">
          {logs.map((log) => (
            <li key={log.id} className="relative">
              <span
                className="absolute -left-[27px] top-3.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400"
                aria-hidden
              />
              <Card className="border-slate-200">
                <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px] font-bold",
                      ACTION_TONES[log.action] ?? "border-slate-300 bg-slate-50 text-slate-600"
                    )}
                  >
                    {log.action}
                  </Badge>
                  <span className="font-mono text-[10.5px] text-slate-400">
                    {log.actor}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <pre className="max-h-24 w-full overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-slate-600">
                    {JSON.stringify(log.details)}
                  </pre>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
