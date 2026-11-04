"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import {
  Accessibility,
  AudioWaveform,
  EyeOff,
  Palette,
  Scale,
  ShieldCheck,
  Type,
} from "lucide-react";
import { Scene, Reveal, Words, Kicker, useCountUp, filmPhase } from "./bits";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   PILLARS — six cards, corner-bracketed like evidence tags.
   ════════════════════════════════════════════════════════════ */

const PILLARS = [
  {
    icon: Type,
    name: "Terminology",
    engine: "DETERMINISTIC",
    proof: "The exact word, every time. Forbidden, deprecated, preferred — enforced from the living canon.",
    example: "insures → ensures · TRM-014",
  },
  {
    icon: AudioWaveform,
    name: "Voice & Tone",
    engine: "HYBRID",
    proof: "Readability bounds, passive-voice ceilings, cliché blocklists — your persona, quantified.",
    example: "FLESCH 7–13 · PASSIVE ≤ 15%",
  },
  {
    icon: Scale,
    name: "Factual Claims",
    engine: "HYBRID",
    proof: "Atomic claims checked against the fact ledger. Aspiration is not a promise.",
    example: "FACT-031 · SUPERSEDED · DISCLAIMER ATTACHED",
  },
  {
    icon: Palette,
    name: "Visual Geometry",
    engine: "DETERMINISTIC",
    proof: "CIEDE2000 color science, logo clear-space, aspect ratios — measured, not eyeballed.",
    example: "ΔE2000 ≤ 2.3 · CLEAR-SPACE 0.25×",
  },
  {
    icon: Accessibility,
    name: "Accessibility",
    engine: "DETERMINISTIC",
    proof: "WCAG 2.2 contrast, alt text, focus order — compliance before the lawsuit.",
    example: "4.5:1 CONTRAST · AA / AAA",
  },
  {
    icon: EyeOff,
    name: "Confidentiality",
    engine: "HYBRID",
    proof: "Codename registry and the reversible shield. Secrets masked before anything leaves.",
    example: "PROJECT NIGHTINGALE → TOK-7F3A",
  },
] as const;

export function PillarsScene() {
  return (
    <Scene
      act="ACT III — SIX PILLARS"
      weave={0.82}
      energy={0.62}
      className="relative px-6 py-32 sm:py-44"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Kicker>Six pillars · one canon</Kicker>
        </Reveal>
        <h2 className="mt-6 max-w-3xl font-display text-[clamp(2rem,5vw,3.8rem)] leading-[1.08] text-film-ivory">
          <Words text="Every thread," stagger={0.06} />{" "}
          <span className="italic">
            <Words text="inspected." wordClassName="text-gold-grad" delay={0.35} />
          </span>
        </h2>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.07}>
              <article className="group relative h-full rounded-xl border border-white/10 bg-film-ink-2/60 p-6 backdrop-blur-sm transition-all duration-300 ease-out-x hover:-translate-y-1 hover:border-thread-gold/40 hover:shadow-[0_20px_60px_-20px_rgba(224,170,79,0.25)]">
                {/* corner brackets */}
                <span
                  aria-hidden
                  className="absolute left-3 top-3 h-3 w-3 border-l border-t border-thread-gold/50 transition-colors duration-300 group-hover:border-thread-gold"
                />
                <span
                  aria-hidden
                  className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-thread-gold/50 transition-colors duration-300 group-hover:border-thread-gold"
                />
                <div className="flex items-start justify-between gap-3">
                  <p.icon
                    className="h-6 w-6 text-thread-gold/90"
                    aria-hidden
                    strokeWidth={1.5}
                  />
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.18em]",
                      p.engine === "DETERMINISTIC"
                        ? "border-thread-gold/40 text-thread-gold"
                        : "border-thread-violet/40 text-thread-violet"
                    )}
                  >
                    {p.engine}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl text-film-ivory">{p.name}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-film-ivory/60">
                  {p.proof}
                </p>
                <p className="mt-5 border-t border-white/10 pt-3 font-mono text-[9px] tracking-[0.12em] text-film-ivory/40">
                  {p.example}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/* ════════════════════════════════════════════════════════════
   DIFF THEATER — the pinned surgical-diff sequence.
   Document left, findings land right, intent meter fills,
   readiness climbs 41 → 96.
   ════════════════════════════════════════════════════════════ */

interface FindingCard {
  pillar: string;
  rule: string;
  severity: "CRITICAL" | "HIGH";
  original: string;
  suggested: string;
  provenance: string;
}

const FINDINGS: FindingCard[] = [
  {
    pillar: "TERMINOLOGY",
    rule: "TRM-014",
    severity: "CRITICAL",
    original: "insures",
    suggested: "ensures",
    provenance: "CANONTERM · DETERMINISTIC · CONF 100% · INTENT 99%",
  },
  {
    pillar: "FACT_CLAIM",
    rule: "FACT-031",
    severity: "HIGH",
    original: "guaranteed to double your money in 90 days",
    suggested: "build savings, on your terms*",
    provenance: "FACT LEDGER · SEMANTIC · DISCLAIMER AUTO-ATTACHED · INTENT 96%",
  },
  {
    pillar: "CONFIDENTIALITY",
    rule: "SEC-112",
    severity: "CRITICAL",
    original: "Project Nightingale",
    suggested: "TOK-7F3A",
    provenance: "CODENAME REGISTRY · DETERMINISTIC · REVERSIBLE AT REVIEW",
  },
];

export function DiffTheaterScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  useMotionValueEvent(p, "change", (v) => {
    const s =
      v < 0.1 ? 0 : v < 0.28 ? 1 : v < 0.46 ? 2 : v < 0.62 ? 3 : v < 0.8 ? 4 : 5;
    if (s !== stepRef.current) {
      stepRef.current = s;
      setStep(s);
    }
    filmPhase.target.weave = 0.8 + v * 0.12;
    filmPhase.target.energy = 0.72;
  });

  const readiness = useCountUp(step >= 4 ? 96 : 41, step >= 4, 1400);
  const intent = useCountUp(step >= 4 ? 98 : 0, step >= 4, 1500);

  const f1 = step >= 1;
  const f2 = step >= 2;
  const f3 = step >= 3;

  return (
    <Scene
      ref={ref}
      act="ACT III — THE SURGICAL DIFF"
      weave="dyn"
      energy="dyn"
      className="relative h-[380vh]"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
        <div className="w-full max-w-6xl">
          <div className="mb-6 text-center sm:mb-10">
            <Kicker className="text-center">The surgical diff</Kicker>
            <h2 className="mt-4 font-display text-[clamp(1.6rem,3.6vw,2.8rem)] leading-tight text-film-ivory">
              Watch it think. <span className="italic text-film-ivory/55">Watch it mend.</span>
            </h2>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
            {/* the document */}
            <div
              className={cn(
                "relative rounded-2xl border border-white/10 bg-film-ink-2/85 p-6 backdrop-blur-sm transition-opacity duration-700 ease-out-x sm:p-8",
                step >= 5 ? "opacity-25" : "opacity-100"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <p className="font-mono text-[9px] tracking-[0.22em] text-film-ivory/45">
                  CAMPAIGN COPY · v4 · DRAFT
                </p>
                <p className="font-mono text-[9px] tracking-[0.18em] text-film-ivory/45">
                  READINESS{" "}
                  <span
                    className={cn(
                      "tabular-nums transition-colors duration-500",
                      step >= 4 ? "text-thread-emerald" : "text-thread-crimson"
                    )}
                  >
                    {Math.round(readiness)}
                  </span>
                  /100
                </p>
              </div>

              <p className="mt-6 text-[15px] leading-[2] text-film-ivory/85 sm:text-[17px] sm:leading-[2.1]">
                The new Aurelia Black Card{" "}
                <EditSpan active={f1} wrong="insures" right="ensures" /> you save more —{" "}
                <EditSpan
                  active={f2}
                  wrong="guaranteed to double your money in 90 days"
                  right="build savings, on your terms*"
                />
                , powered by{" "}
                <EditSpan active={f3} wrong="Project Nightingale" right="TOK-7F3A" />.
              </p>

              <p
                className={cn(
                  "mt-6 border-t border-white/10 pt-4 font-mono text-[8px] tracking-[0.16em] transition-colors duration-500 sm:text-[9px]",
                  f2 ? "text-film-ivory/45" : "text-film-ivory/20"
                )}
              >
                *REQUIRED DISCLAIMER — ATTACHED BY FACT-031: “Savings outcomes vary.
                Aurelia Black is a deposit product, not an investment.”
              </p>

              {/* intent meter */}
              <div
                className={cn(
                  "mt-6 transition-all duration-700 ease-out-x",
                  step >= 4 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                )}
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[9px] tracking-[0.22em] text-film-ivory/50">
                    INTENT PRESERVATION
                  </p>
                  <p className="font-display text-2xl text-thread-emerald">
                    <span className="tabular-nums">{Math.round(intent)}</span>%
                  </p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full origin-left rounded-full bg-thread-emerald transition-transform duration-[1400ms] ease-out-x"
                    style={{ transform: `scaleX(${Math.max(intent, 0) / 100})` }}
                  />
                </div>
              </div>
            </div>

            {/* the findings */}
            <div className="space-y-3">
              {FINDINGS.map((f, i) => {
                const active = step >= i + 1;
                return (
                  <div
                    key={f.rule}
                    aria-hidden={!active}
                    className={cn(
                      "rounded-xl border p-4 transition-all duration-700 ease-out-x sm:p-5",
                      active
                        ? "translate-x-0 opacity-100"
                        : "translate-x-8 opacity-0 lg:translate-x-12"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.16em]",
                          f.severity === "CRITICAL"
                            ? "bg-thread-crimson/15 text-thread-crimson"
                            : "bg-thread-gold/15 text-thread-gold"
                        )}
                      >
                        {f.severity}
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.18em] text-film-ivory/60">
                        {f.pillar} · {f.rule}
                      </span>
                      <ShieldCheck
                        className="ml-auto h-3.5 w-3.5 text-film-ivory/30"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed">
                      <span className="text-thread-crimson/80 line-through decoration-thread-crimson/60">
                        {f.original}
                      </span>
                      <span className="mx-2 text-film-ivory/30">→</span>
                      <span className="text-thread-gold">{f.suggested}</span>
                    </p>
                    <p className="mt-3 font-mono text-[8px] leading-relaxed tracking-[0.14em] text-film-ivory/35">
                      {f.provenance}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* closing */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-film-ink/80 px-6 text-center backdrop-blur-sm transition-opacity duration-700 ease-out-x",
            step >= 5 ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={step < 5}
        >
          <p className="font-display text-[clamp(2rem,5.4vw,4rem)] leading-[1.1] text-film-ivory">
            Not a rewrite.
          </p>
          <p className="mt-2 font-display text-[clamp(2rem,5.4vw,4rem)] italic leading-[1.1]">
            <span className="text-gold-grad">A rescue.</span>
          </p>
          <p className="mt-6 font-mono text-[9px] tracking-[0.3em] text-film-ivory/45 sm:text-[10px]">
            SURGICAL DIFFS PRESERVE WHAT THE WRITER MEANT
          </p>
        </div>
      </div>
    </Scene>
  );
}

function EditSpan({ active, wrong, right }: { active: boolean; wrong: string; right: string }) {
  return (
    <span className="relative whitespace-nowrap">
      <span
        className={cn(
          "transition-all duration-500 ease-out-x",
          active
            ? "text-thread-crimson/80 line-through decoration-2 decoration-thread-crimson/60"
            : "text-film-ivory/85"
        )}
      >
        {wrong}
      </span>
      <span
        aria-hidden={!active}
        className={cn(
          "ml-1.5 border-b border-thread-gold/50 font-medium text-thread-gold transition-all duration-500 ease-out-x",
          active ? "opacity-100" : "translate-y-1 opacity-0"
        )}
      >
        {right}
      </span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   PROVENANCE + GAS — chain of custody & the ambiguity engine.
   ════════════════════════════════════════════════════════════ */

const CHAIN: Array<[string, string]> = [
  ["FINDING #482", "flagged “insures” · stage-1 pass · 12ms"],
  ["RULE TRM-014", "forbidden surface form · rationale citation attached"],
  ["CANON ENTRY v2025-01", "legal review · 2024-11-30 · effective"],
  ["REVIEWER · BRAND_MANAGER", "accepted · 09:12 · override reason: —"],
  ["AUDIT LOG", "sha-256 chained · tamper-evident · forever"],
];

const GAS_ROWS = [
  {
    rule: "TRM-014 · TERMINOLOGY",
    stats: "1,284 triggers · 41 overrides",
    score: 0.07,
    verdict: "WORKING AS INTENDED",
    tone: "emerald",
  },
  {
    rule: "TON-009 · VOICE",
    stats: "312 triggers · 138 overrides",
    score: 0.44,
    verdict: "AMBIGUOUS — REWRITE THE RULE",
    tone: "gold",
  },
  {
    rule: "CLM-017 · CLAIMS",
    stats: "208 triggers · 22 disputes",
    score: 0.71,
    verdict: "HABITUAL MISTAKE — TRAIN THE TEAM",
    tone: "crimson",
  },
] as const;

export function ProvenanceScene() {
  return (
    <Scene
      act="ACT III — THE RECEIPTS"
      weave={0.9}
      energy={0.55}
      className="relative px-6 py-32 sm:py-44"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          {/* chain of custody */}
          <div>
            <Reveal>
              <Kicker>Chain of custody</Kicker>
            </Reveal>
            <h3 className="mt-6 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-film-ivory">
              Every finding carries{" "}
              <span className="italic text-gold-grad">its own paper trail.</span>
            </h3>
            <div className="relative mt-10 pl-8">
              <div
                aria-hidden
                className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-thread-gold/60 via-white/15 to-transparent"
              />
              {CHAIN.map(([title, desc], i) => (
                <Reveal key={title} delay={i * 0.1} y={16}>
                  <div className="relative pb-8">
                    <span
                      aria-hidden
                      className="absolute -left-8 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-thread-gold/70 bg-film-ink"
                    />
                    <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-film-ivory">
                      {title}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-film-ivory/45">
                      {desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* the GAS engine */}
          <div>
            <Reveal>
              <Kicker>The ambiguity engine</Kicker>
            </Reveal>
            <h3 className="mt-6 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-film-ivory">
              The rule everyone overrides{" "}
              <span className="italic text-film-ivory/55">isn&rsquo;t a rule.</span>{" "}
              <span className="italic text-gold-grad">It&rsquo;s a debate.</span>
            </h3>
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-film-ivory/60">
                Every run, override, and dispute feeds the Guideline Ambiguity
                Score. LoomGuard finds the debates, scores them, and hands you
                the pen — so the canon keeps up with reality.
              </p>
            </Reveal>

            <div className="mt-10 space-y-6">
              {GAS_ROWS.map((row, i) => (
                <Reveal key={row.rule} delay={0.2 + i * 0.12} y={16}>
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-film-ivory/85">
                        {row.rule}
                      </p>
                      <p className="font-mono text-[9px] tracking-[0.1em] text-film-ivory/40">
                        {row.stats}
                      </p>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: row.score }}
                        viewport={{ once: true, margin: "-15% 0px" }}
                        transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
                        className={cn(
                          "h-full origin-left rounded-full",
                          row.tone === "emerald" && "bg-thread-emerald",
                          row.tone === "gold" && "bg-thread-gold",
                          row.tone === "crimson" && "bg-thread-crimson"
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        "mt-2 font-mono text-[9px] tracking-[0.18em]",
                        row.tone === "emerald" && "text-thread-emerald",
                        row.tone === "gold" && "text-thread-gold",
                        row.tone === "crimson" && "text-thread-crimson"
                      )}
                    >
                      GAS {row.score.toFixed(2)} — {row.verdict}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* ════════════════════════════════════════════════════════════
   FINALE — the fabric holds. CTA into the real product.
   ════════════════════════════════════════════════════════════ */

export function FinaleScene({ onEnterProduct }: { onEnterProduct: () => void }) {
  return (
    <Scene
      act="FINALE — THE FABRIC HOLDS"
      weave={1}
      energy={0.6}
      className="relative flex min-h-[92vh] items-center justify-center px-6 py-32"
    >
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <Kicker className="text-center">The fabric holds</Kicker>
        </Reveal>
        <h2 className="mt-7 font-display text-[clamp(2.2rem,6vw,4.6rem)] leading-[1.06] text-film-ivory">
          <Words text="Ship it like it&rsquo;s already" stagger={0.06} />
          <br />
          <span className="italic">
            <Words
              text="been reviewed."
              wordClassName="text-gold-grad"
              delay={0.5}
              stagger={0.06}
            />
          </span>
        </h2>

        <Reveal delay={0.35}>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["<50MS", "STAGE-1 PASS"],
              ["6", "PILLARS"],
              ["100%", "PROVENANCE"],
              ["0", "HALLUCINATIONS"],
            ].map(([v, l]) => (
              <div key={l} className="bg-film-ink-2/90 px-4 py-5">
                <p className="font-display text-2xl text-gold-grad sm:text-3xl">{v}</p>
                <p className="mt-1.5 font-mono text-[8px] tracking-[0.22em] text-film-ivory/45">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.5}>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onEnterProduct}
              className="group relative inline-flex min-h-[52px] items-center gap-3 overflow-hidden rounded-full bg-thread-gold px-9 py-4 font-mono text-[12px] font-semibold tracking-[0.22em] text-film-ink transition-all duration-300 ease-out-x hover:scale-[1.03] hover:shadow-[0_16px_50px_-10px_rgba(224,170,79,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-thread-gold"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out-x group-hover:translate-x-full" />
              ENTER LOOMGUARD
              <span aria-hidden className="transition-transform duration-300 ease-out-x group-hover:translate-x-1">
                →
              </span>
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex min-h-[52px] items-center rounded-full border border-white/15 px-9 py-4 font-mono text-[12px] tracking-[0.22em] text-film-ivory/70 transition-all duration-300 ease-out-x hover:border-white/40 hover:text-film-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50"
            >
              REPLAY THE FILM
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.65}>
          <p className="mt-10 font-mono text-[9px] leading-relaxed tracking-[0.2em] text-film-ivory/35 sm:text-[10px]">
            THE FILM ENDS. THE MACHINE BEGINS.
          </p>
        </Reveal>
      </div>
    </Scene>
  );
}
