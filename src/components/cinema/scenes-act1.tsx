"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Scene, Reveal, Words, Kicker, Stat, filmPhase } from "./bits";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   HERO — "Every brand is a fabric."
   ════════════════════════════════════════════════════════════ */

export function HeroScene() {
  const [pubCount, setPubCount] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    // ~340 brand assets published worldwide every minute (stylized)
    const id = setInterval(() => setPubCount((c) => c + 3), 530);
    return () => clearInterval(id);
  }, []);

  /* gentle mouse parallax — pointer-fine devices only */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sp = { stiffness: 42, damping: 16, mass: 0.6 };
  const hx = useSpring(mx, sp);
  const hy = useSpring(my, sp);
  const headT = useTransform(
    [hx, hy],
    ([x, y]: number[]) => `translate3d(${x}px, ${y}px, 0)`
  );
  const subT = useTransform(
    [hx, hy],
    ([x, y]: number[]) => `translate3d(${x * -0.45}px, ${y * -0.45}px, 0)`
  );

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 16);
      my.set((e.clientY / window.innerHeight - 0.5) * 12);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  return (
    <Scene
      act="OVERTURE — EVERY BRAND IS A FABRIC"
      weave={0.3}
      energy={0.65}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
    >
      {/* readability vignette over the thread field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(7,7,10,0.88)_100%)]"
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div style={reduce ? undefined : { transform: headT }}>
          <Reveal>
            <Kicker className="text-center">LoomGuard Pictures presents</Kicker>
          </Reveal>
          <h1 className="mt-7 font-display text-[clamp(2.5rem,7vw,6rem)] leading-[1.05] text-film-ivory">
            <Words text="Every brand is a fabric." stagger={0.07} />
            <br />
            <span className="italic">
              <Words
                text="One thread can unravel it."
                wordClassName="text-gold-grad"
                delay={0.55}
                stagger={0.055}
              />
            </span>
          </h1>
        </motion.div>

        <motion.div style={reduce ? undefined : { transform: subT }}>
          <Reveal delay={0.95}>
            <p className="mx-auto mt-9 max-w-xl text-[15px] leading-relaxed text-film-ivory/60 sm:text-base">
              A governance film in three acts — and the machine that ends them.
              Deterministic engines, semantic AI, and human judgment, woven into
              the last gate before anything ships.
            </p>
          </Reveal>
          <Reveal delay={1.2}>
            <p className="mt-9 font-mono text-[10px] tracking-[0.28em] text-film-ivory/45 sm:text-[11px]">
              <span className="text-thread-gold">
                {pubCount.toLocaleString("en-US")}
              </span>{" "}
              ASSETS PUBLISHED WORLDWIDE SINCE YOU ARRIVED
            </p>
          </Reveal>
        </motion.div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 sm:bottom-24">
        <div className="flex flex-col items-center gap-3">
          <span className="font-mono text-[9px] tracking-[0.45em] text-film-ivory/40">
            SCROLL
          </span>
          <div className="h-14 w-px overflow-hidden">
            <div className="cue-line h-full w-px bg-gradient-to-b from-transparent via-thread-gold to-transparent" />
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* ════════════════════════════════════════════════════════════
   INCIDENT — the pinned 23:47 thriller.
   340vh. Terminal log → the asset card → published → the word
   snaps crimson (canvas thread snaps in sync) → aftermath →
   closing line. All phase values are scene-owned ("dyn").
   ════════════════════════════════════════════════════════════ */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const bell = (v: number, rs: number, rl: number, fs: number, fl: number) =>
  Math.min(smooth((v - rs) / rl), 1 - smooth((v - fs) / fl));

const LOG_LINES: Array<[string, string]> = [
  ["23:41", "COPY — FINAL_v9_FINAL_v2.md · locked"],
  ["23:43", "LEGAL — sign-off attached"],
  ["23:45", "BRAND — tone check: “feels fine”"],
  ["23:47", "QUEUE — publishing"],
];

const AFTER_LINES: Array<[string, string]> = [
  ["02:14", "first quote-tweets. “insures??? lol”"],
  ["04:12", "#AureliaInsures — trending №3 · finance"],
  ["09:30", "compliance inquiry opened"],
  ["11:15", "retraction drafted · 2,100,000 impressions"],
];

export function IncidentScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* stage fades */
  const logO = useTransform(p, [0.0, 0.03, 0.1, 0.16], [0, 1, 1, 0]);
  const logT = useTransform(p, [0.0, 0.16], [26, -26]);
  const cardO = useTransform(p, [0.13, 0.19, 0.55, 0.61], [0, 1, 1, 0]);
  const cardT = useTransform(p, [0.13, 0.19], [48, 0]);
  const stampO = useTransform(p, [0.4, 0.45, 0.53, 0.58], [0, 1, 1, 0]);
  const stampT = useTransform(p, [0.4, 0.45], [14, 0]);
  const afterO = useTransform(p, [0.61, 0.66, 0.87, 0.92], [0, 1, 1, 0]);
  const closeO = useTransform(p, [0.9, 0.96], [0, 1]);
  const closeT = useTransform(p, [0.9, 0.96], [30, 0]);
  const veilO = useTransform(p, [0.46, 0.51, 0.6, 0.74], [0, 0.95, 0.95, 0]);

  /* transform strings (kept as full transform to preserve the
     -translate-y-1/2 centering that inline transforms would clobber) */
  const logTf = useTransform(logT, (v: number) => `translate3d(0, ${v}px, 0)`);
  const cardTf = useTransform(cardT, (v: number) => `translate3d(0, calc(-50% + ${v}px), 0)`);
  const stampTf = useTransform(stampT, (v: number) => `translate3d(0, ${v}px, 0)`);
  const closeTf = useTransform(closeT, (v: number) => `translate3d(0, calc(-50% + ${v}px), 0)`);

  /* terminal + aftermath line staggers (fixed-length hook calls) */
  const logLineO = [
    useTransform(p, [0.015, 0.04], [0, 1]),
    useTransform(p, [0.047, 0.072], [0, 1]),
    useTransform(p, [0.079, 0.104], [0, 1]),
    useTransform(p, [0.111, 0.136], [0, 1]),
  ];
  const afterLineO = [
    useTransform(p, [0.625, 0.655], [0, 1]),
    useTransform(p, [0.675, 0.705], [0, 1]),
    useTransform(p, [0.725, 0.755], [0, 1]),
    useTransform(p, [0.775, 0.805], [0, 1]),
  ];

  const [detected, setDetected] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [clock, setClock] = useState("23:41");
  const lastMin = useRef(41);

  /* scene-owned phase writes + throttled state */
  useMotionValueEvent(p, "change", (v) => {
    filmPhase.target.weave = 0.12;
    filmPhase.target.energy = 0.9;
    filmPhase.target.snap = bell(v, 0.48, 0.06, 0.64, 0.09);
    filmPhase.target.crimson = bell(v, 0.46, 0.08, 0.66, 0.11);

    setDetected(v > 0.485);
    setGlitch(v > 0.495 && v < 0.56);
    const mins = 41 + Math.min(6, Math.floor(v * 8));
    if (mins !== lastMin.current) {
      lastMin.current = mins;
      setClock(`23:${String(mins).padStart(2, "0")}`);
    }
  });

  useEffect(() => {
    filmPhase.target.weave = 0.14;
    filmPhase.target.energy = 0.85;
  }, []);

  return (
    <Scene
      ref={ref}
      act="ACT I — 23:47"
      weave="dyn"
      energy="dyn"
      snap="dyn"
      crimson="dyn"
      className="relative h-[340vh]"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* scene clock */}
        <p className="absolute right-6 top-16 z-20 font-mono text-[11px] tracking-[0.3em] text-film-ivory/40 sm:right-10 sm:top-20">
          {clock}
        </p>
        <p className="absolute left-6 top-16 z-20 font-mono text-[10px] uppercase tracking-[0.34em] text-film-ivory/30 sm:left-10 sm:top-20">
          ACT I · THE INCIDENT
        </p>

        {/* crimson danger veil */}
        <motion.div
          style={{ opacity: veilO }}
          className="crimson-veil pointer-events-none absolute inset-0 z-20"
        />

        <div className="relative z-10 w-full max-w-2xl px-6">
          {/* STAGE 1 — ops console */}
          <motion.div
            style={{ opacity: logO, transform: logTf }}
            className="space-y-3 font-mono text-[12px] sm:text-[13px]"
          >
            {LOG_LINES.map(([t, l], i) => (
              <motion.p key={t} style={{ opacity: logLineO[i] }} className="text-film-ivory/80">
                <span className="text-film-ivory/45">{t}</span>
                <span className="mx-2 text-thread-gold/60">·</span>
                {l}
              </motion.p>
            ))}
          </motion.div>

          {/* STAGE 2 — the asset */}
          <motion.article
            style={{ opacity: cardO, transform: cardTf }}
            className="absolute inset-x-6 top-1/2 sm:inset-x-0"
          >
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-film-ink-2/85 p-6 shadow-[0_36px_90px_-24px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-8",
                glitch && "glitching"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f3d492] to-[#9a6b21] font-display text-lg text-film-ink">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-film-ivory">
                    Bank of Aurelia
                    <span className="ml-1.5 font-normal text-film-ivory/40">
                      @aureliabank
                    </span>
                  </p>
                  <p className="text-[11px] text-film-ivory/40">Sponsored · tonight</p>
                </div>
                <span className="shrink-0 rounded border border-white/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] text-film-ivory/50">
                  PROMOTED
                </span>
              </div>

              <p className="mt-5 text-[16px] leading-[1.75] text-film-ivory/90 sm:text-[18px]">
                Weekend mode: on. Nothing{" "}
                <span
                  className={cn(
                    "relative inline-block whitespace-nowrap transition-colors duration-300",
                    detected ? "glitch-word text-thread-crimson" : "text-film-ivory"
                  )}
                >
                  insures
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-0.5 left-0 h-[3px] w-full origin-left bg-thread-crimson transition-transform duration-500 ease-out-x",
                      detected ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-thread-crimson/40 bg-thread-crimson/10 px-2 py-1 font-mono text-[10px] font-normal not-italic tracking-[0.12em] text-thread-crimson transition-all duration-500 ease-out-x",
                      detected
                        ? "delay-300 translate-y-0 opacity-100"
                        : "translate-y-1 opacity-0"
                    )}
                  >
                    TRM-014 → “ensures”
                  </span>
                </span>{" "}
                a great weekend like your savings working as hard as you do.
                Aurelia Black — 2× weekend rewards, insured by design.{" "}
                <span aria-hidden>💛</span>
              </p>

              <div className="mt-5 flex items-center gap-5 font-mono text-[10px] tracking-[0.14em] text-film-ivory/35">
                <span>♡ 4,102</span>
                <span>↻ 1,284</span>
                <span
                  className={cn(
                    "ml-auto transition-opacity duration-500 ease-out-x",
                    detected ? "opacity-100" : "opacity-0"
                  )}
                >
                  STAGE-1 · TERMINOLOGY ENGINE · 12ms
                </span>
              </div>
            </div>

            {/* published stamp */}
            <motion.div
              style={{ opacity: stampO, transform: stampTf }}
              className="mt-5 flex justify-center"
            >
              <span className="inline-flex items-center gap-2.5 rounded-full border border-thread-emerald/30 bg-thread-emerald/10 px-4 py-1.5 font-mono text-[11px] tracking-[0.22em] text-thread-emerald">
                <span className="ping-dot h-1.5 w-1.5 rounded-full bg-thread-emerald" />
                PUBLISHED · 23:47:02
              </span>
            </motion.div>
          </motion.article>

          {/* STAGE 3 — aftermath */}
          <motion.div
            style={{ opacity: afterO }}
            className="absolute inset-x-6 top-1/2 -translate-y-1/2 space-y-4 font-mono text-[12px] sm:inset-x-0 sm:text-[13px]"
          >
            {AFTER_LINES.map(([t, l], i) => (
              <motion.p
                key={t}
                style={{ opacity: afterLineO[i] }}
                className="text-film-ivory/80"
              >
                <span className="text-film-ivory/45">{t}</span>
                <span className="mx-2 text-thread-crimson/70">·</span>
                {l}
              </motion.p>
            ))}
          </motion.div>

          {/* STAGE 4 — closing */}
          <motion.div
            style={{ opacity: closeO, transform: closeTf }}
            className="absolute inset-x-0 top-1/2 text-center"
          >
            <p className="font-display text-[clamp(2.2rem,6vw,4.4rem)] italic leading-[1.1] text-film-ivory">
              One wrong thread.
            </p>
            <p className="mt-2 font-display text-[clamp(2.2rem,6vw,4.4rem)] leading-[1.1] text-thread-crimson">
              The whole fabric.
            </p>
          </motion.div>
        </div>
      </div>
    </Scene>
  );
}

/* ════════════════════════════════════════════════════════════
   NUMBERS — the documentary ledger.
   ════════════════════════════════════════════════════════════ */

const LEDGER: Array<{
  value: number;
  suffix?: string;
  label: string;
  src: string;
  danger?: boolean;
}> = [
  {
    value: 4195,
    label: "digital accessibility lawsuits filed against U.S. brands in a single year.",
    src: "USABLENET · ADA LAWSUIT REPORT",
  },
  {
    value: 63,
    suffix: "%",
    label: "of consumers buy less from a brand after it breaks their trust.",
    src: "EDELMAN · TRUST BAROMETER",
  },
  {
    value: 11,
    label: "review touches a single enterprise campaign needs before it may ship.",
    src: "CONTENT OPERATIONS BENCHMARK",
  },
  {
    value: 1,
    label: "word is all it takes. Tonight it took one.",
    src: "ACT I · THE SNAPPED THREAD",
    danger: true,
  },
];

export function NumbersScene() {
  return (
    <Scene
      act="ACT I — THE LEDGER"
      weave={0.16}
      energy={0.32}
      className="relative px-6 py-32 sm:py-44"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <Kicker>The ledger of lessons</Kicker>
        </Reveal>
        <h2 className="mt-6 font-display text-[clamp(2rem,5.2vw,4rem)] leading-[1.08] text-film-ivory">
          <Words text="Everyone learns this number." stagger={0.06} />
          <br />
          <span className="italic text-film-ivory/60">
            <Words text="Some brands learn it live." delay={0.4} stagger={0.05} />
          </span>
        </h2>

        <div className="mt-16 sm:mt-20">
          {LEDGER.map((row, i) => (
            <Reveal key={row.src} delay={i * 0.06}>
              <div
                className={cn(
                  "flex flex-col gap-4 border-t py-10 sm:flex-row sm:items-end sm:gap-12",
                  row.danger ? "border-thread-crimson/25" : "border-white/10"
                )}
              >
                <div
                  className={cn(
                    "w-[220px] shrink-0 font-display text-[clamp(3.2rem,7.5vw,6.4rem)] leading-[0.95] sm:w-[300px]",
                    row.danger ? "text-thread-crimson" : "text-gold-grad"
                  )}
                >
                  <Stat value={row.value} suffix={row.suffix} />
                </div>
                <div className="pb-2">
                  <p className="max-w-md text-[15px] leading-relaxed text-film-ivory/70">
                    {row.label}
                  </p>
                  <p className="mt-3 font-mono text-[9px] tracking-[0.26em] text-film-ivory/35">
                    {row.src}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-white/10" />
        </div>
      </div>
    </Scene>
  );
}
