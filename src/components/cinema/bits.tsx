"use client";

/* ────────────────────────────────────────────────────────────
   film-state — the "director". A tiny module singleton that the
   scroll director (FilmExperience) writes into every frame and
   the ThreadCanvas reads from. No React re-renders involved.
   ──────────────────────────────────────────────────────────── */

export interface FilmPhase {
  weave: number; // 0 = frayed chaos · 1 = woven lattice
  energy: number; // speed & luminance of the threads
  snap: number; // 0–1 the snapped crimson thread
  crimson: number; // 0–1 global danger tint
  act: string; // HUD act label
  progress: number; // 0–1 total film progress
}

const basePhase = (): FilmPhase => ({
  weave: 0.28,
  energy: 0.55,
  snap: 0,
  crimson: 0,
  act: "OVERTURE",
  progress: 0,
});

export const filmPhase = {
  cur: basePhase(),
  target: basePhase(),
};

/* ────────────────────────────────────────────────────────────
   Motion tokens (shared so scenes never fork the curves)
   ──────────────────────────────────────────────────────────── */

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

import { useRef, useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Scene — a <section> that declares its phase to the director
   via data attributes. Values of "dyn" are owned by the scene
   itself (it writes filmPhase.target directly from its own
   scroll progress).
   ──────────────────────────────────────────────────────────── */

export interface SceneProps {
  id?: string;
  act?: string;
  weave?: number | "dyn";
  energy?: number | "dyn";
  snap?: number | "dyn";
  crimson?: number | "dyn";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ref?: React.Ref<HTMLElement>;
}

export function Scene({
  id,
  act,
  weave,
  energy,
  snap,
  crimson,
  className,
  style,
  children,
  ref,
}: SceneProps) {
  return (
    <section
      ref={ref}
      id={id}
      data-scene
      {...(act !== undefined ? { "data-act": act } : {})}
      {...(weave !== undefined ? { "data-weave": String(weave) } : {})}
      {...(energy !== undefined ? { "data-energy": String(energy) } : {})}
      {...(snap !== undefined ? { "data-snap": String(snap) } : {})}
      {...(crimson !== undefined ? { "data-crimson": String(crimson) } : {})}
      className={className}
      style={style}
    >
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   Reveal — scroll-triggered entrance. Transform + opacity only.
   ──────────────────────────────────────────────────────────── */

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: reduce ? "none" : `translateY(${y}px)` }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once, margin: "-12% 0px" }}
      transition={{ duration: reduce ? 0.25 : 0.85, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   Words — per-word rise for display headlines.
   ──────────────────────────────────────────────────────────── */

export function Words({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">
        {text.split(" ").map((w, i) => (
          /* the mask is what we observe — the word inside it starts
             clipped, so IntersectionObserver on the word itself
             would never report it "in view" */
          <motion.span
            key={i}
            className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
          >
            <motion.span
              className={cn("inline-block will-change-transform", wordClassName)}
              variants={{
                hidden: { y: reduce ? "0%" : "112%" },
                show: {
                  y: "0%",
                  transition: {
                    duration: reduce ? 0.25 : 0.95,
                    ease: EASE_OUT,
                    delay: delay + i * stagger,
                  },
                },
              }}
            >
              {w}&nbsp;
            </motion.span>
          </motion.span>
        ))}
      </span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   Kicker — mono chapter eyebrow with a gold dash.
   ──────────────────────────────────────────────────────────── */

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.34em] text-thread-gold sm:text-[11px]",
        className
      )}
    >
      <span className="mr-3 inline-block h-px w-8 translate-y-[-3px] bg-thread-gold/70" />
      {children}
    </p>
  );
}

/* ────────────────────────────────────────────────────────────
   Stat — documentary-style counter that counts up in view.
   ──────────────────────────────────────────────────────────── */

export function useCountUp(target: number, active: boolean, duration = 1900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const r = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(r);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return display;
}

export function Stat({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 1900,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px" });
  const n = useCountUp(value, inView, duration);
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   GoldRule — thin luminous divider.
   ──────────────────────────────────────────────────────────── */

export function GoldRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-thread-gold/50 to-transparent",
        className
      )}
    />
  );
}

/* ────────────────────────────────────────────────────────────
   formatTimecode — fake 24fps film timecode from progress.
   ──────────────────────────────────────────────────────────── */

export function formatTimecode(progress: number): string {
  const totalSeconds = progress * 150; // a 2:30 film
  const mm = Math.floor(totalSeconds / 60);
  const ss = Math.floor(totalSeconds % 60);
  const ff = Math.floor((totalSeconds * 24) % 24);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `00:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}
