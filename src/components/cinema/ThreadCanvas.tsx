"use client";

import { useEffect, useRef } from "react";
import { filmPhase } from "./bits";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   ThreadCanvas — the signature VFX.

   A field of horizontal light-threads (the "warp" of the loom).
   · weave 0 → frayed, drifting silk (the ungoverned brand)
   · weave 1 → locked lattice + vertical weft (governance)
   · snap   → one thread breaks crimson, ends fray and spark
   · energy → speed & luminance
   · crimson → the whole field tenses toward red

   Drawn with two-pass strokes (wide faint + thin bright) instead
   of shadowBlur — glow without the paint cost. DPR capped at 1.5.
   ──────────────────────────────────────────────────────────── */

type RGB = [number, number, number];
const IVORY: RGB = [232, 228, 216];
const GOLD: RGB = [224, 170, 79];
const VIOLET: RGB = [183, 156, 255];
const CRIMSON: RGB = [255, 82, 87];

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgba = (c: RGB, a: number) =>
  `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;

interface Thread {
  baseY: number; // fraction of height (chaos anchor)
  rowY: number; // locked lattice row (fraction)
  amp: number;
  freq: number;
  phase: number;
  speed: number;
  kind: "ivory" | "gold" | "violet";
  alpha: number;
}

const ROWS = 15;

export function ThreadCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let threads: Thread[] = [];
    let snapIndex = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const count = w < 640 ? 24 : w < 1100 ? 34 : 44;
      snapIndex = Math.floor(count * 0.58);
      threads = Array.from({ length: count }, (_, i) => {
        const r = Math.random();
        const kind = r < 0.1 ? "gold" : r < 0.18 ? "violet" : "ivory";
        return {
          baseY: (i + 1) / (count + 1) + rand(-0.022, 0.022),
          rowY: Math.round(((i + 1) / (count + 1)) * ROWS) / ROWS,
          amp: rand(14, 74),
          freq: rand(0.004, 0.011),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.16, 0.5),
          kind,
          alpha: kind === "ivory" ? rand(0.05, 0.13) : rand(0.16, 0.3),
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) drawOnce();
    };

    function draw(t: number) {
      if (!ctx) return;
      const { weave, energy, snap, crimson } = filmPhase.cur;

      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, w, h);

      const speedMul = 0.35 + energy * 1.15;
      const alphaMul = 0.75 + energy * 0.65;

      /* — vertical weft: only exists when the fabric forms — */
      if (weave > 0.04) {
        const wa = 0.03 * weave * alphaMul;
        const weftColor = mix(mix(IVORY, GOLD, 0.45), CRIMSON, crimson * 0.5);
        ctx.strokeStyle = rgba(weftColor, wa);
        ctx.lineWidth = 1;
        const step = 84;
        const drift = (t * 5) % step;
        ctx.beginPath();
        for (let x = -step + drift; x < w + step; x += step) {
          const sway = Math.sin(t * 0.3 + x * 0.01) * 3 * (1 - weave * 0.6);
          ctx.moveTo(x + sway, -10);
          ctx.lineTo(x - sway, h + 10);
        }
        ctx.stroke();
      }

      /* — the warp threads — */
      const gapHalf = 10 + snap * 120;
      const gapX = w * 0.6;

      threads.forEach((th, idx) => {
        const isSnap = snap > 0.001 && idx === snapIndex;

        const yBase =
          (th.baseY + (th.rowY - th.baseY) * weave) * h;
        const amp = th.amp * (1 - 0.94 * weave) + 2.5;
        const freq = th.freq + (0.006 - th.freq) * weave;

        let color: RGB;
        if (th.kind === "gold") color = mix(GOLD, CRIMSON, crimson * 0.35);
        else if (th.kind === "violet") color = mix(VIOLET, CRIMSON, crimson * 0.45);
        else color = mix(IVORY, CRIMSON, crimson * 0.6);

        let alpha = th.alpha * alphaMul;
        if (isSnap) {
          color = mix(color, CRIMSON, snap);
          alpha = Math.min(0.9, alpha * (1 + snap * 2.2));
        }

        const wander =
          0.65 + 0.35 * Math.sin(t * 0.21 + th.phase * 1.7);

        ctx.beginPath();
        let penDown = false;
        for (let x = -24; x <= w + 24; x += 22) {
          const inGap = isSnap && x > gapX - gapHalf && x < gapX + gapHalf;
          const y =
            yBase +
            amp *
              wander *
              Math.sin(x * freq + th.phase + t * th.speed * speedMul);
          if (inGap) {
            penDown = false;
          } else if (!penDown) {
            ctx.moveTo(x, y);
            penDown = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        // two-pass glow: wide+faint, then thin+bright
        ctx.strokeStyle = rgba(color, alpha * 0.32);
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        /* — frayed ends + spark at the break — */
        if (isSnap && snap > 0.05) {
          const yAt = (gx: number) => {
            const wanderL =
              0.65 + 0.35 * Math.sin(t * 0.21 + th.phase * 1.7);
            return (
              yBase +
              amp * wanderL * Math.sin(gx * freq + th.phase + t * th.speed * speedMul)
            );
          };
          [gapX - gapHalf, gapX + gapHalf].forEach((gx, side) => {
            const gy = yAt(gx);
            // fray strands
            ctx.strokeStyle = rgba(CRIMSON, 0.5 * snap);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let f = 0; f < 3; f++) {
              const jx = Math.sin(t * 31 + f * 2.1 + side * 7) * 6 * snap;
              const jy = Math.sin(t * 27 + f * 3.3) * 7 * snap;
              const dir = side === 0 ? -1 : 1;
              ctx.moveTo(gx, gy);
              ctx.lineTo(gx + dir * (10 + f * 7) + jx, gy + jy + (f - 1) * 5);
            }
            ctx.stroke();
            // hot end
            ctx.fillStyle = rgba(CRIMSON, 0.85 * snap);
            ctx.beginPath();
            ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(CRIMSON, 0.18 * snap);
            ctx.beginPath();
            ctx.arc(gx, gy, 9, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });

      /* — the shuttle: a gold pulse crossing the finished fabric — */
      if (weave > 0.62) {
        const sA = Math.min(1, (weave - 0.62) / 0.38);
        const cycle = (t * 0.085) % 1.3;
        const sx = (cycle - 0.15) * (w / 1.0);
        if (sx > -60 && sx < w + 60) {
          const row = Math.round(ROWS * 0.55);
          const sy = (row / ROWS) * h + Math.sin(t * 0.8) * 2;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
          grad.addColorStop(0, rgba(GOLD, 0.22 * sA));
          grad.addColorStop(1, rgba(GOLD, 0));
          ctx.fillStyle = grad;
          ctx.fillRect(sx - 70, sy - 70, 140, 140);
          ctx.fillStyle = rgba(GOLD, 0.95 * sA);
          ctx.beginPath();
          ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawOnce() {
      // reduced-motion: one calm, woven still frame
      filmPhase.cur = { ...filmPhase.cur, weave: 0.85, energy: 0.4 };
      draw(0);
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // ease current phase toward the director's target
      const c = filmPhase.cur;
      const g = filmPhase.target;
      const k = 1 - Math.pow(0.0009, dt); // ~6%/frame at 60fps
      c.weave += (g.weave - c.weave) * k;
      c.energy += (g.energy - c.energy) * k;
      c.snap += (g.snap - c.snap) * Math.min(1, k * 2.2);
      c.crimson += (g.crimson - c.crimson) * k;

      t += dt * (0.3 + c.energy * 1.1);
      draw(t);
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    if (!reduce) {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 z-0", className)}
    />
  );
}
