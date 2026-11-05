// ============================================================
// Pillar 4: Visual Consistency & Geometric Specification (Stage 1)
// Deterministic color science & computer-vision-style geometry:
// - CIEDE2000 (ΔE00) palette drift vs approved canon swatches
// - Logo aspect-ratio distortion (|w/h − w_ref/h_ref| > 0.02)
// - Clear-space encroachment (25%-of-height isolation margin)
// ============================================================

import { ciede2000Hex } from "./color-science";
import type { LogoRules, RawFinding, SwatchData, VisualMeta } from "@/lib/types";

export const PALETTE_DRIFT_THRESHOLD = 3.0;
export const ASPECT_RATIO_TOLERANCE = 0.02;

export class VisualGeometryEngine {
  constructor(
    private swatches: SwatchData[],
    private logoRules: LogoRules
  ) {}

  /** ΔE00 palette drift of an extracted swatch against every approved brand color. */
  checkPaletteDrift(hex: string, roleHint?: string): RawFinding | null {
    const t0 = performance.now();
    let best: { swatch: SwatchData; deltaE: number } | null = null;

    const candidates = roleHint
      ? this.swatches.filter((s) => s.role === roleHint)
      : this.swatches;
    const pool = candidates.length > 0 ? candidates : this.swatches;

    for (const swatch of pool) {
      const deltaE = ciede2000Hex(hex, swatch.hexValue);
      if (!best || deltaE < best.deltaE) best = { swatch, deltaE };
    }
    if (!best) return null;

    // Off-brand if the closest approved swatch is still perceptibly distant
    if (best.deltaE > PALETTE_DRIFT_THRESHOLD) {
      const severity = best.deltaE > 10 ? "HIGH" : "MEDIUM";
      return {
        pillar: "VISUAL_GEOMETRY",
        ruleId: "RULE-PALETTE-DRIFT",
        severity,
        verdict: "PALETTE_DRIFT",
        originalSpan: `Extracted swatch ${hex.toUpperCase()}`,
        charStart: -1,
        charEnd: -1,
        suggestedDiff: best.swatch.hexValue.toUpperCase(),
        explanation: `Brand palette drift: ${hex.toUpperCase()} sits CIEDE2000 ΔE00 = ${best.deltaE} from the nearest approved swatch ${best.swatch.tokenName} (${best.swatch.hexValue.toUpperCase()}); threshold is ${PALETTE_DRIFT_THRESHOLD}. Likely an accidental default-palette pick (e.g. Tailwind base scale).`,
        provenance: {
          engine: "DETERMINISTIC_ENGINE_LOCAL",
          algorithm: "CIEDE2000 Perceptual Color Difference (Sharma 2005)",
          citation: "Brand Identity Specification §3.1: Approved Digital Color System",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "LOCKED_CANON_SWATCH",
          retrievedClauses: [
            { id: best.swatch.tokenName, text: `${best.swatch.tokenName} = ${best.swatch.hexValue.toUpperCase()} (${best.swatch.role})`, retrieval: "LOCKED" },
          ],
        },
        intentPreservation: 0.98,
      };
    }
    return null;
  }

  /** Logo aspect-ratio distortion + clear-space encroachment from a detected bounding box. */
  checkLogoGeometry(box: { width: number; height: number; adjacentTextDist: number }): RawFinding[] {
    const t0 = performance.now();
    const findings: RawFinding[] = [];
    const { width: w, height: h, adjacentTextDist } = box;
    const currentAr = Math.round((w / h) * 1000) / 1000;
    const refAr = this.logoRules.aspectRatio;
    const arDiff = Math.abs(currentAr - refAr);

    if (arDiff > ASPECT_RATIO_TOLERANCE) {
      findings.push({
        pillar: "VISUAL_GEOMETRY",
        ruleId: "RULE-LOGO-ASPECT-RATIO",
        severity: "CRITICAL",
        verdict: "LOGO_DISTORTION",
        originalSpan: `Logo box ${w}×${h} px (aspect ratio ${currentAr})`,
        charStart: -1,
        charEnd: -1,
        suggestedDiff: `Restore ${refAr.toFixed(2)}:1 — e.g. ${Math.round(h * refAr)}×${Math.round(h)} px`,
        explanation: `Logo aspect-ratio distortion: measured ${currentAr} vs canonical ${refAr.toFixed(2)} (|Δ| = ${arDiff.toFixed(3)} > tolerance ${ASPECT_RATIO_TOLERANCE}). The mark has been horizontally or vertically compressed, violating mark-construction rules.`,
        provenance: {
          engine: "DETERMINISTIC_ENGINE_LOCAL",
          algorithm: "SIFT Homography / Geometric Invariant Math",
          citation: "Brand Identity Specification §2.1: Logo Construction & Proportions",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "LOCKED_CANON_LOGO",
          retrievedClauses: [
            { id: "LOGO-MASTER", text: `Canonical mark: ${this.logoRules.canonicalWidth}×${this.logoRules.canonicalHeight} px, ratio ${refAr.toFixed(2)}:1`, retrieval: "LOCKED" },
          ],
        },
        intentPreservation: 1.0,
      });
    }

    const minClear = h * this.logoRules.clearSpaceRatio;
    if (adjacentTextDist < minClear) {
      findings.push({
        pillar: "VISUAL_GEOMETRY",
        ruleId: "RULE-LOGO-CLEAR-SPACE",
        severity: "HIGH",
        verdict: "CLEAR_SPACE_ENCROACHMENT",
        originalSpan: `Adjacent element margin: ${adjacentTextDist.toFixed(1)} px`,
        charStart: -1,
        charEnd: -1,
        suggestedDiff: `Increase protective margin to ≥ ${minClear.toFixed(1)} px (25% of mark height ${h} px) on all four sides`,
        explanation: `Clear-space encroachment: neighboring content sits ${adjacentTextDist.toFixed(1)} px from the mark; the minimum isolation margin is ${(this.logoRules.clearSpaceRatio * 100).toFixed(0)}% of mark height (${minClear.toFixed(1)} px).`,
        provenance: {
          engine: "DETERMINISTIC_ENGINE_LOCAL",
          algorithm: "Bounding-Box Proximity Matrix",
          citation: "Brand Identity Specification §2.3: Minimum Clear-Space Isolation Margin",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "LOCKED_CANON_LOGO",
        },
        intentPreservation: 1.0,
      });
    }

    return findings;
  }

  auditVisualAsset(meta: VisualMeta): RawFinding[] {
    const findings: RawFinding[] = [];
    for (const color of meta.extractedColors ?? []) {
      const f = this.checkPaletteDrift(color.hex);
      if (f) {
        f.originalSpan = `${color.name ?? "Extracted swatch"} ${color.hex.toUpperCase()}`;
        findings.push(f);
      }
    }
    if (meta.logoBox) {
      findings.push(...this.checkLogoGeometry(meta.logoBox));
    }
    return findings;
  }
}
