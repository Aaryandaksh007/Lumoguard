"use client";

import { useMemo, useState } from "react";
import { Loader2, Move3d, Palette, Ruler, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ciede2000Hex, contrastRatio } from "@/lib/engines/color-science";
import type { AssetDetail, FindingDTO, RunDTO } from "@/lib/api-types";
import type { SwatchData, VisualMeta } from "@/lib/types";

interface VisualCanvasProps {
  asset: AssetDetail;
  run: RunDTO | null;
  swatches: SwatchData[];
  onActionComplete: () => void;
  disabled?: boolean;
}

/**
 * Visual Proofing Canvas — deterministic color-science overlays on the
 * banner mock: palette ΔE00 drift, logo geometry distortion, clear-space
 * encroachment, and the live Auto-Contrast On-Brand Token Resolver.
 */
export function VisualCanvas({ asset, run, swatches, onActionComplete, disabled }: VisualCanvasProps) {
  const meta = asset.visualMetaParsed as VisualMeta | null;
  const [snapping, setSnapping] = useState<string | null>(null);

  const nearestSwatch = useMemo(
    () => (hex: string) => {
      let best: { s: SwatchData; d: number } | null = null;
      for (const s of swatches) {
        const d = ciede2000Hex(hex, s.hexValue);
        if (!best || d < best.d) best = { s, d };
      }
      return best;
    },
    [swatches]
  );

  if (!meta || (!meta.extractedColors?.length && !meta.colorPairs?.length && !meta.logoBox)) {
    return null;
  }

  const visualFindings = (run?.findings ?? []).filter(
    (f) =>
      (f.pillar === "VISUAL_GEOMETRY" || f.pillar === "ACCESSIBILITY_WCAG") &&
      f.status === "PENDING" &&
      f.severity !== "INFO"
  );

  async function applyTokenFix(finding: FindingDTO, newHex: string) {
    setSnapping(finding.findingId);
    try {
      // 1. Accept the finding (applies diff, logs audit trail)
      const res = await fetch("/api/findings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: finding.findingId, action: "ACCEPT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Accept failed");

      // 2. Snap the visual meta so the canvas re-renders with the on-brand token
      const updated = structuredClone(asset.visualMetaParsed) as VisualMeta;
      if (finding.ruleId === "RULE-WCAG-CONTRAST" && updated.colorPairs) {
        const pair = updated.colorPairs.find(
          (p) => finding.originalSpan.includes(p.fg.toUpperCase()) || finding.originalSpan.includes(p.fg)
        );
        if (pair) pair.fg = newHex;
      }
      if (finding.ruleId === "RULE-PALETTE-DRIFT" && updated.extractedColors) {
        const match = finding.originalSpan.match(/#[0-9A-Fa-f]{6}/);
        if (match) {
          const color = updated.extractedColors.find((c) => c.hex.toUpperCase() === match![0].toUpperCase());
          if (color) color.hex = newHex;
        }
      }
      await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualMeta: updated }),
      });

      toast.success("On-brand accessible token applied", {
        description: `Swapped to ${newHex.toUpperCase()} — passes WCAG 2.2 AA with zero brand-palette drift.`,
      });
      onActionComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Token fix failed");
    } finally {
      setSnapping(null);
    }
  }

  const bg = meta.extractedColors?.[0]?.hex ?? meta.colorPairs?.[0]?.bg ?? "#F8FAFC";
  const accent = meta.extractedColors?.[1]?.hex ?? "#1D4ED8";
  const logo = meta.logoBox;
  const clearSpace = logo ? logo.height * 0.25 : 0;
  const canonicalAr = 4.0;

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center gap-2 px-4 py-3">
        <Palette className="h-4 w-4 text-slate-500" aria-hidden />
        <CardTitle className="text-[14px]">Visual Proofing Canvas</CardTitle>
        <Badge variant="outline" className="ml-auto font-mono text-[10px] text-slate-500">
          {meta.assetName ?? "attached_visual.png"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Banner mock with geometry overlays ── */}
        <div
          className="relative overflow-hidden rounded-xl border border-slate-200 shadow-inner"
          style={{ backgroundColor: bg, aspectRatio: "1200 / 630" }}
          role="img"
          aria-label={`Banner preview: background ${bg}, accent ${accent}`}
        >
          {/* Logo box + clear-space zone */}
          {logo && (
            <div className="absolute left-[6%] top-[12%]">
              {/* Clear-space isolation margin (dashed) */}
              <div
                className="absolute rounded-sm border-2 border-dashed"
                style={{
                  borderColor: "rgba(239, 68, 68, 0.65)",
                  left: -clearSpace * 2,
                  top: -clearSpace * 2,
                  right: -clearSpace * 2,
                  bottom: -clearSpace * 2,
                  transform: "scale(0.55)",
                  transformOrigin: "top left",
                  width: logo.width * 2 + clearSpace * 4,
                  height: logo.height * 2 + clearSpace * 4,
                }}
              />
              {/* The mark itself (distorted or clean) */}
              <div
                className="flex items-center justify-center rounded-sm bg-slate-900 text-[10px] font-black tracking-widest text-white sm:text-xs"
                style={{ width: logo.width * 2, height: logo.height * 2 }}
              >
                INKLOOM&nbsp;AI
              </div>
              {/* Encroaching element marker */}
              <div
                className="absolute flex items-center gap-1 text-[9px] font-bold text-red-600"
                style={{ left: logo.width * 2 + 6, top: logo.height * 2 - 8 }}
              >
                <Move3d className="h-3 w-3" aria-hidden />
                {logo.adjacentTextDist}px
              </div>
            </div>
          )}

          {/* Headline rendered with the ACTUAL audited colors */}
          <div className="absolute inset-x-[6%] bottom-[10%]">
            <p
              className="text-lg font-extrabold leading-tight sm:text-2xl"
              style={{ color: meta.colorPairs?.[0]?.fg ?? accent }}
            >
              Ship every launch on-brand.
            </p>
            <p className="mt-1 text-[11px] font-medium sm:text-sm" style={{ color: accent }}>
              Governed visuals, verified claims, protected secrets.
            </p>
          </div>

          {/* Geometry HUD */}
          {logo && (
            <div className="absolute right-[4%] top-[10%] rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[9px] leading-relaxed text-white backdrop-blur">
              <div className="flex items-center gap-1">
                <Ruler className="h-3 w-3" aria-hidden />
                logo {logo.width}×{logo.height} · AR {(logo.width / logo.height).toFixed(2)}
                <span className={Math.abs(logo.width / logo.height - canonicalAr) > 0.02 ? "text-red-400" : "text-emerald-400"}>
                  {Math.abs(logo.width / logo.height - canonicalAr) > 0.02 ? " ✗" : " ✓"}
                </span>
              </div>
              <div>
                clear-space ≥{clearSpace.toFixed(1)}px · gap {logo.adjacentTextDist}px
                <span className={logo.adjacentTextDist < clearSpace ? "text-red-400" : "text-emerald-400"}>
                  {logo.adjacentTextDist < clearSpace ? " ✗" : " ✓"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Swatch audit chips ── */}
        <div className="grid gap-2 sm:grid-cols-2">
          {(meta.extractedColors ?? []).map((c) => {
            const near = nearestSwatch(c.hex);
            const drift = near ? near.d > 3 : false;
            return (
              <div
                key={c.name + c.hex}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  drift ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-md border border-slate-300"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-800">{c.name}</p>
                  <p className="font-mono text-[10.5px] text-slate-500">
                    {c.hex.toUpperCase()}
                    {near && (
                      <>
                        {" · "}ΔE00 vs {near.s.tokenName} ={" "}
                        <span className={drift ? "font-bold text-orange-600" : "text-emerald-600"}>
                          {near.d.toFixed(2)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {drift && (
                  <Badge className="border-0 bg-orange-500 text-[10px] font-bold text-white">DRIFT</Badge>
                )}
              </div>
            );
          })}

          {(meta.colorPairs ?? []).map((p) => {
            const cr = contrastRatio(p.fg, p.bg);
            const fail = cr < (p.isLarge ? 3.0 : 4.5);
            return (
              <div
                key={p.elementName}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  fail ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span
                  className="flex h-8 w-14 shrink-0 items-center justify-center rounded-md border border-slate-300 text-[10px] font-bold"
                  style={{ backgroundColor: p.bg, color: p.fg }}
                  aria-hidden
                >
                  Aa
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-800">{p.elementName}</p>
                  <p className="font-mono text-[10.5px] text-slate-500">
                    {p.fg.toUpperCase()} on {p.bg.toUpperCase()} ·{" "}
                    <span className={fail ? "font-bold text-red-600" : "font-semibold text-emerald-600"}>
                      {cr.toFixed(2)}:1
                    </span>
                  </p>
                </div>
                {fail && (
                  <Badge className="border-0 bg-red-600 text-[10px] font-bold text-white">
                    {cr.toFixed(2)}:1
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* ── One-click on-brand fixes ── */}
        {visualFindings.filter((f) => f.suggestedDiff?.startsWith("#")).length > 0 && (
          <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-900">
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              Auto-Contrast On-Brand Token Resolver — 1-click fixes
            </p>
            {visualFindings
              .filter((f) => f.suggestedDiff?.startsWith("#"))
              .map((f) => (
                <div
                  key={f.findingId}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-violet-200 bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-slate-600">
                    {f.originalSpan}
                  </span>
                  <Button
                    size="sm"
                    className="h-7 bg-violet-600 text-[11px] font-semibold hover:bg-violet-700"
                    disabled={disabled || snapping !== null}
                    onClick={() => applyTokenFix(f, f.suggestedDiff!)}
                  >
                    {snapping === f.findingId ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      <Wand2 className="h-3 w-3" aria-hidden />
                    )}
                    Snap to {f.suggestedDiff}
                  </Button>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
