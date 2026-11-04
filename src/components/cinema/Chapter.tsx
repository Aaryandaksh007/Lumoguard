"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/* ────────────────────────────────────────────────────────────
   Chapter — the black interstitial title card between acts.
   Giant ghost numeral behind, act title in front. Pins for a
   beat while the thread-canvas transitions beneath it.
   ──────────────────────────────────────────────────────────── */

export function Chapter({
  numeral,
  act,
  title,
  line,
  weave,
  energy,
}: {
  numeral: string;
  act: string;
  title: string;
  line: string;
  weave: number;
  energy: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const o = useTransform(scrollYProgress, [0.12, 0.36, 0.66, 0.9], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.12, 0.36, 0.66, 0.9], [70, 0, 0, -70]);
  const s = useTransform(scrollYProgress, [0.12, 0.36], [0.965, 1]);
  const transform = useTransform(
    [y, s],
    ([yy, ss]: number[]) => `translate3d(0, ${yy}px, 0) scale(${ss})`
  );

  return (
    <section
      ref={ref}
      data-scene
      data-act={act}
      data-weave={weave}
      data-energy={energy}
      className="relative h-[170vh]"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          style={reduce ? { opacity: o } : { opacity: o, transform }}
          className="relative px-6 text-center"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[42vw] leading-none text-film-ivory/[0.05] sm:text-[30vw]"
          >
            {numeral}
          </span>
          <div className="relative">
            <motion.p
              initial={{ opacity: 0 }}
              style={{ opacity: o }}
              className="font-mono text-[11px] uppercase tracking-[0.44em] text-thread-gold"
            >
              Act {numeral}
            </motion.p>
            <h2 className="mt-5 font-display text-[clamp(2rem,5.6vw,4.4rem)] leading-[1.05] text-film-ivory">
              {title}
            </h2>
            <motion.div
              aria-hidden
              style={{ scaleX: o }}
              className="mx-auto mt-7 h-px w-28 origin-center bg-thread-gold/60"
            />
            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.3em] text-film-ivory/45 sm:text-[11px]">
              {line}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
