"use client";

import { cn } from "@/lib/utils";
import type { DiffChunk } from "@/lib/types";

/**
 * Inline red/green surgical diff — remove spans struck in red,
 * add spans in green. Never rewrites surrounding text.
 */
export function DiffView({
  chunks,
  compact = false,
}: {
  chunks: DiffChunk[];
  compact?: boolean;
}) {
  if (!chunks.length) return null;
  return (
    <p
      className={cn(
        "rounded-md border border-slate-200 bg-white font-serif leading-relaxed text-slate-800",
        compact ? "px-2 py-1.5 text-[12px]" : "px-3 py-2.5 text-sm"
      )}
    >
      {chunks.map((c, i) =>
        c.type === "equal" ? (
          <span key={i}>{c.text} </span>
        ) : c.type === "remove" ? (
          <span
            key={i}
            className="rounded-[3px] bg-red-100 px-0.5 font-medium text-red-800 line-through decoration-red-400"
          >
            {c.text}
          </span>
        ) : (
          <span key={i} className="rounded-[3px] bg-emerald-100 px-0.5 font-medium text-emerald-800">
            {c.text}
          </span>
        )
      )}
    </p>
  );
}

/** Side-by-side original → suggested for non-sentence (visual/token) diffs. */
export function TokenSwapView({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-mono text-[12px] text-red-700 line-through">
        {from}
      </span>
      <span className="text-slate-400">→</span>
      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[12px] font-semibold text-emerald-700">
        {to}
      </span>
    </div>
  );
}
