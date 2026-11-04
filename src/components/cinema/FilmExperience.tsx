"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LoomGuardApp } from "@/components/loomguard/LoomGuardApp";
import { ThreadCanvas } from "./ThreadCanvas";
import { HeroScene, IncidentScene, NumbersScene } from "./scenes-act1";
import { ThesisScene, PipelineScene } from "./scenes-act2";
import {
  PillarsScene,
  DiffTheaterScene,
  ProvenanceScene,
  FinaleScene,
} from "./scenes-act3";
import { Chapter } from "./Chapter";
import { filmPhase, formatTimecode } from "./bits";
import { cn } from "@/lib/utils";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ════════════════════════════════════════════════════════════
   PRELOADER — the letterbox opening. Skippable, reduced-motion
   aware, locks scroll while the title card plays.
   ════════════════════════════════════════════════════════════ */

function Preloader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }
    document.body.style.overflow = "hidden";
    const timers = [
      setTimeout(() => setPhase(1), 450),
      setTimeout(() => setPhase(2), 1250),
      setTimeout(() => setPhase(3), 2250),
      setTimeout(() => {
        document.body.style.overflow = "";
        onDone();
      }, 3050),
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className={cn("pre-bar top", phase >= 3 && "open")} />
      <div className={cn("pre-bar bottom", phase >= 3 && "open")} />
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center transition-opacity duration-500 ease-out-x",
          phase >= 3 ? "opacity-0" : "opacity-100"
        )}
      >
        <p
          className={cn(
            "font-mono text-[10px] tracking-[0.5em] text-film-ivory/50 transition-all duration-700 ease-out-x sm:text-[11px]",
            phase >= 0 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          LOOMGUARD PICTURES
        </p>
        <p
          className={cn(
            "font-display text-[clamp(1.8rem,5vw,3.4rem)] italic leading-tight text-film-ivory transition-all delay-200 duration-700 ease-out-x",
            phase >= 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          The Fabric of Trust
        </p>
        <div
          aria-hidden
          className={cn(
            "h-px w-40 origin-center bg-thread-gold/80 transition-transform delay-300 duration-700 ease-out-x",
            phase >= 2 ? "scale-x-100" : "scale-x-0"
          )}
        />
        <p
          className={cn(
            "font-mono text-[9px] tracking-[0.34em] text-film-ivory/35 transition-opacity delay-500 duration-700",
            phase >= 2 ? "opacity-100" : "opacity-0"
          )}
        >
          A GOVERNANCE FILM IN THREE ACTS
        </p>
      </div>
      <button
        onClick={onDone}
        className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.3em] text-film-ivory/40 transition-colors hover:text-thread-gold"
      >
        SKIP →
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FILM EXPERIENCE — the orchestrator.
   ════════════════════════════════════════════════════════════ */

export function FilmExperience() {
  const [mode, setMode] = useState<"film" | "product">("film");
  const [loaded, setLoaded] = useState(false);
  const [wipe, setWipe] = useState<null | "closing" | "opening">(null);
  const savedY = useRef(0);

  const onLoaded = useCallback(() => setLoaded(true), []);

  /* film-mode chrome class */
  useEffect(() => {
    if (mode === "film") {
      document.documentElement.classList.add("film-active");
      return () => document.documentElement.classList.remove("film-active");
    }
    document.documentElement.classList.remove("film-active");
  }, [mode]);

  /* ── the scroll director ── */
  const actRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "film") return;
    let sections: HTMLElement[] = [];

    const buildTicks = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!ticksRef.current || max <= 0 || sections.length === 0) return;
      ticksRef.current.innerHTML = "";
      for (const s of sections) {
        const pos = clamp01(s.offsetTop / max);
        const b = document.createElement("button");
        b.type = "button";
        b.title = s.dataset.act ?? "scene";
        b.setAttribute("aria-label", `Jump to ${s.dataset.act ?? "scene"}`);
        b.style.left = `${Math.min(99.5, pos * 100)}%`;
        b.addEventListener("click", () =>
          s.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        ticksRef.current?.appendChild(b);
      }
    };

    const collect = () => {
      sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
      buildTicks();
    };

    const compute = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? clamp01(window.scrollY / max) : 0;
      filmPhase.target.progress = progress;

      const mid = window.innerHeight * 0.5;
      let active: HTMLElement | null = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          active = s;
          break;
        }
      }
      if (!active && sections.length) active = sections[0];

      if (active) {
        const act = active.dataset.act;
        if (act) {
          filmPhase.target.act = act;
          if (actRef.current && actRef.current.textContent !== act) {
            actRef.current.textContent = act;
          }
        }
        for (const key of ["weave", "energy"] as const) {
          const v = active.dataset[key];
          if (v !== undefined && v !== "dyn") filmPhase.target[key] = parseFloat(v);
        }
        for (const key of ["snap", "crimson"] as const) {
          if (active.dataset[key] !== "dyn") {
            filmPhase.target[key] = parseFloat(active.dataset[key] ?? "0");
          }
        }
      }

      if (tcRef.current) tcRef.current.textContent = formatTimecode(progress);
      if (railRef.current) railRef.current.style.transform = `scaleX(${progress})`;
    };

    collect();
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    const onResize = () => {
      collect();
      compute();
    };
    window.addEventListener("resize", onResize);
    const settle = setTimeout(() => {
      collect();
      compute();
    }, 900);

    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", onResize);
      clearTimeout(settle);
    };
  }, [mode, loaded]);

  /* ── the film → product wipe ── */
  const enterProduct = useCallback(() => {
    if (wipe) return;
    savedY.current = window.scrollY;
    setWipe("closing");
    window.setTimeout(() => {
      setMode("product");
      window.scrollTo(0, 0);
      setWipe("opening");
      window.setTimeout(() => setWipe(null), 780);
    }, 720);
  }, [wipe]);

  const exitProduct = useCallback(() => {
    setWipe("closing");
    window.setTimeout(() => {
      setMode("film");
      requestAnimationFrame(() => window.scrollTo(0, savedY.current));
      setWipe("opening");
      window.setTimeout(() => setWipe(null), 780);
    }, 720);
  }, []);

  /* ═══ product mode ═══ */
  if (mode === "product") {
    return (
      <>
        <LoomGuardApp />
        <button
          onClick={exitProduct}
          className="fixed left-4 top-4 z-[80] flex items-center gap-2 rounded-full border border-slate-900/15 bg-white/90 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-slate-700 shadow-lg backdrop-blur transition-all duration-300 ease-out-x hover:border-slate-900/40 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          RETURN TO FILM
        </button>
        <WipeBars closing={wipe === "closing"} />
      </>
    );
  }

  /* ═══ film mode ═══ */
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-film-ink text-film-ivory">
      <ThreadCanvas />
      <div className="film-grain" aria-hidden />

      {!loaded && <Preloader onDone={onLoaded} />}

      {/* ── letterbox HUD ── */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex h-10 items-center justify-between bg-film-ink/90 px-4 font-mono text-[9px] tracking-[0.25em] text-film-ivory/60 backdrop-blur sm:h-12 sm:px-8 sm:text-[10px]">
        <span className="text-film-ivory/90">
          LOOM<span className="text-thread-gold">GUARD</span>
        </span>
        <span ref={actRef} className="hidden max-w-[40%] truncate text-film-ivory/45 md:block">
          OVERTURE
        </span>
        <span ref={tcRef} className="tabular-nums text-film-ivory/45">
          00:00:00:00
        </span>
      </header>

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] h-10 bg-film-ink/90 backdrop-blur sm:h-12">
        <div className="relative h-full">
          <div
            aria-hidden
            className="absolute inset-x-16 top-1/2 h-px -translate-y-1/2 bg-white/10 sm:inset-x-20"
          />
          <div
            ref={railRef}
            aria-hidden
            className="absolute inset-x-16 top-1/2 h-px origin-left -translate-y-1/2 bg-thread-gold/80 sm:inset-x-20"
            style={{ transform: "scaleX(0)" }}
          />
          <div
            ref={ticksRef}
            aria-label="Chapter navigation"
            className="hud-ticks absolute inset-x-16 top-1/2 h-0 sm:inset-x-20"
          />
          <button
            onClick={enterProduct}
            className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.25em] text-film-ivory/50 transition-colors duration-300 hover:text-thread-gold focus-visible:text-thread-gold sm:right-8 sm:text-[10px]"
          >
            SKIP → PRODUCT
          </button>
        </div>
      </footer>

      {/* ── the film itself ── */}
      <main className="relative z-10 flex-1">
        <HeroScene />

        <Chapter
          numeral="I"
          act="ACT I — THE SNAPPED THREAD"
          title="The Snapped Thread"
          line="23:47 · ONE WORD · 2.1M IMPRESSIONS"
          weave={0.2}
          energy={0.6}
        />
        <IncidentScene />
        <NumbersScene />

        <Chapter
          numeral="II"
          act="ACT II — THE LOOM"
          title="The Loom"
          line="DETERMINISTIC × SEMANTIC × HUMAN"
          weave={0.55}
          energy={0.65}
        />
        <ThesisScene />
        <PipelineScene />

        <Chapter
          numeral="III"
          act="ACT III — THE FABRIC THAT HOLDS"
          title="The Fabric That Holds"
          line="SIX PILLARS · SURGICAL DIFFS · FULL PROVENANCE"
          weave={0.78}
          energy={0.6}
        />
        <PillarsScene />
        <DiffTheaterScene />
        <ProvenanceScene />
        <FinaleScene onEnterProduct={enterProduct} />
      </main>

      {/* ── film footer (sticky to bottom) ── */}
      <footer className="relative z-10 mt-auto border-t border-white/10 bg-film-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 font-mono text-[8px] leading-relaxed tracking-[0.16em] text-film-ivory/35 sm:text-[9px]">
          <p>LOOMGUARD · A GOVERNANCE FILM · DETERMINISTIC ENGINES RUN LOCALLY</p>
          <p>AI DISCLOSURE — STAGE-2 SEMANTIC PASSES USE AN EXTERNAL LLM BEHIND THE REVERSIBLE CONFIDENTIALITY SHIELD</p>
        </div>
      </footer>

      <WipeBars closing={wipe === "closing"} />
    </div>
  );
}

/* letterbox wipe bars used for the film↔product transition */
function WipeBars({ closing }: { closing: boolean }) {
  return (
    <div aria-hidden className={cn(!closing && "pointer-events-none")}>
      <div className={cn("wipe-bar top", closing && "wipe-closed")} />
      <div className={cn("wipe-bar bottom", closing && "wipe-closed")} />
    </div>
  );
}
