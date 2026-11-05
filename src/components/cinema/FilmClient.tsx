"use client";

import dynamic from "next/dynamic";

/* ════════════════════════════════════════════════════════════
   FilmClient — mounts the cinematic experience CLIENT-ONLY.

   Why: the film is a purely client-side medium — canvas thread
   fields, scroll direction, pointer parallax, matchMedia. When
   server-rendered, framer-motion serializes `initial` values
   into inline styles ("translateY(26px)", opacity "0") that the
   client's motion-value system resolves differently ("none", 0),
   producing a hydration mismatch on every scene. Mounting the
   film after hydration makes the divergence structurally
   impossible — and the Preloader keeps the entrance seamless.

   The ReelShell below is the server-rendered first paint: a
   CSS-only letterbox title card in the film's own visual
   grammar. No framer-motion, no timers — zero hydration
   surface, instant dark paint, zero layout shift.
   ════════════════════════════════════════════════════════════ */

const FilmExperience = dynamic(
  () => import("./FilmExperience").then((m) => m.FilmExperience),
  {
    ssr: false,
    loading: () => <ReelShell />,
  }
);

export function FilmClient() {
  return <FilmExperience />;
}

function ReelShell() {
  return (
    <div
      role="status"
      aria-label="LoomGuard film is loading"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-film-ink px-6 text-film-ivory"
    >
      {/* faint vignette so the shell matches the film's depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(7,7,10,0.9)_100%)]"
      />

      <p className="relative font-mono text-[10px] tracking-[0.5em] text-film-ivory/50 sm:text-[11px]">
        LOOMGUARD PICTURES
      </p>
      <p className="relative mt-5 font-display text-[clamp(1.8rem,5vw,3.4rem)] italic leading-tight text-film-ivory">
        The Fabric of Trust
      </p>

      {/* threading indicator — pure CSS, mirrors the preloader's gold rule */}
      <div aria-hidden className="relative mt-7 h-px w-40 overflow-hidden bg-white/10">
        <div className="reel-thread h-full w-full bg-thread-gold/80" />
      </div>

      <p className="relative mt-6 font-mono text-[9px] tracking-[0.34em] text-film-ivory/35 sm:text-[10px]">
        THREADING THE REEL
      </p>
    </div>
  );
}
