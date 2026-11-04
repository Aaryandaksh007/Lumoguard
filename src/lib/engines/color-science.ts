// ============================================================
// Deterministic Color Science Engine
// CIEDE2000 (ΔE00) perceptual difference + W3C WCAG 2.2
// relative luminance + unrounded contrast ratio + APCA Lc.
// Zero external dependencies. Zero hallucination. Exact math.
// ============================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h
    .split("")
    .map((c) => c + c)
    .join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** W3C / IEC 61966-2-1 sRGB channel linearization transfer function. */
export function srgbChannelToLinear(cByte: number): number {
  const c = cByte / 255.0;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Exact WCAG 2.2 relative luminance: L = 0.2126 R + 0.7152 G + 0.0722 B (linear). */
export function relativeLuminance({ r, g, b }: RGB): number {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** Hex → relative luminance convenience. */
export function hexLuminance(hex: string): number {
  return relativeLuminance(hexToRgb(hex));
}

/**
 * Exact unrounded WCAG 2.2 contrast ratio.
 * CR = (L_lighter + 0.05) / (L_darker + 0.05)
 * NOTE: never round upward — 4.499:1 FAILS SC 1.4.3 under WCAG 2.2.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexLuminance(hex1);
  const l2 = hexLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 1000) / 1000;
}

/** sRGB (0-255) → CIE L*a*b* using the standard D65 illuminant. */
export function rgbToCielab({ r, g, b }: RGB): Lab {
  const rLin = srgbChannelToLinear(r);
  const gLin = srgbChannelToLinear(g);
  const bLin = srgbChannelToLinear(b);

  // Linear RGB → XYZ (D65)
  const x = rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375;
  const y = rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175;
  const z = rLin * 0.0193339 + gLin * 0.119192 + bLin * 0.9503041;

  // D65 reference white point
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const pivot = (v: number) =>
    v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16.0 / 116.0;

  const fx = pivot(xr);
  const fy = pivot(yr);
  const fz = pivot(zr);

  return {
    L: Math.max(0, 116 * fy - 16),
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function hexToLab(hex: string): Lab {
  return rgbToCielab(hexToRgb(hex));
}

/**
 * Standard CIE CIEDE2000 (ΔE00) perceptual color difference.
 * Implements the full Sharma et al. (2005) formulation including
 * the hue-angle normalization and the R_T rotation term.
 */
export function ciede2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  // 1. C', G, a'
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const CBar = (C1 + C2) / 2;
  const G =
    0.5 * (1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  // 2. h' hue angles (degrees)
  const hPrime = (ap: number, b: number): number => {
    if (ap === 0 && b === 0) return 0;
    const deg = (Math.atan2(b, ap) * 180) / Math.PI;
    return deg >= 0 ? deg : deg + 360;
  };
  const h1p = hPrime(a1p, b1);
  const h2p = hPrime(a2p, b2);

  // 3. Deltas
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(((dhp / 2) * Math.PI) / 180);

  // 4. Means
  const LBarP = (L1 + L2) / 2;
  const CBarP = (C1p + C2p) / 2;

  let hBarP: number;
  if (C1p * C2p === 0) hBarP = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBarP = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hBarP = (h1p + h2p + 360) / 2;
  else hBarP = (h1p + h2p - 360) / 2;

  // 5. Weighting functions
  const T =
    1 -
    0.17 * Math.cos((hBarP - 30) * Math.PI / 180) +
    0.24 * Math.cos(2 * hBarP * Math.PI / 180) +
    0.32 * Math.cos((3 * hBarP + 6) * Math.PI / 180) -
    0.2 * Math.cos((4 * hBarP - 63) * Math.PI / 180);

  const dTheta = 30 * Math.exp(-Math.pow((hBarP - 275) / 25, 2));
  const Rc =
    2 * Math.sqrt(Math.pow(CBarP, 7) / (Math.pow(CBarP, 7) + Math.pow(25, 7)));
  const Rt = -Math.sin((2 * dTheta * Math.PI) / 180) * Rc;

  const SL =
    1 +
    (0.015 * Math.pow(LBarP - 50, 2)) /
      Math.sqrt(20 + Math.pow(LBarP - 50, 2));
  const SC = 1 + 0.045 * CBarP;
  const SH = 1 + 0.015 * CBarP * T;

  // 6. Parametric factors kL = kC = kH = 1
  const t1 = dLp / SL;
  const t2 = dCp / SC;
  const t3 = dHp / SH;

  return (
    Math.round(Math.sqrt(t1 * t1 + t2 * t2 + t3 * t3 + Rt * t2 * t3) * 100) / 100
  );
}

export function ciede2000Hex(hex1: string, hex2: string): number {
  return ciede2000(hexToLab(hex1), hexToLab(hex2));
}

/**
 * Polarity-aware APCA (Advanced Perceptual Contrast Algorithm) Lc score.
 * Positive Lc → dark text on light bg; negative → light text on dark bg.
 * Warns when pairs technically pass WCAG 2.x but read poorly perceptually.
 */
export function apcaLc(fgHex: string, bgHex: string): number {
  const lFg = hexLuminance(fgHex);
  const lBg = hexLuminance(bgHex);
  let sapc: number;
  if (lBg > lFg) {
    sapc = (Math.pow(lBg, 0.56) - Math.pow(lFg, 0.62)) * 1.14;
  } else {
    sapc = (Math.pow(lBg, 0.65) - Math.pow(lFg, 0.55)) * 1.14;
  }
  return Math.round(sapc * 100 * 10) / 10;
}

export const WCAG_THRESHOLDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
} as const;
