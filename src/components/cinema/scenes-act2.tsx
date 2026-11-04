"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Check, CloudOff, FileText, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Scene, Reveal, Words, Kicker, filmPhase, EASE_IN_OUT } from "./bits";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   THESIS — the dead ends, struck through. Then the formula.
   ════════════════════════════════════════════════════════════ */

function Struck({ children, delay = 0.9 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="relative inline-block">
      <span className="text-film-ivory/40">{children}</span>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.65, ease: EASE_IN_OUT, delay }}
        className="absolute left-[-2%] top-1/2 h-[2px] w-[104%] origin-left bg-thread-crimson/80"
      />
    </span>
  );
}

export function ThesisScene() {
  return (
    <Scene
      act="ACT II — THE THESIS"
      weave={0.42}
      energy={0.5}
      className="relative px-6 py-32 sm:py-44"
    >
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <Kicker>The dead ends</Kicker>
        </Reveal>

        <div className="mt-10 space-y-6 font-display text-[clamp(1.5rem,3.6vw,2.6rem)] leading-[1.25] text-film-ivory/85">
          <Reveal delay={0.05}>
            <p>
              <Struck>A spellchecker can&rsquo;t judge tone.</Struck>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              <Struck delay={1.0}>An LLM left alone will hallucinate.</Struck>
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p>
              <Struck delay={1.1}>
                A tired human misses one word in ten thousand.
              </Struck>
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mt-20">
          <p className="font-display text-[clamp(1.8rem,4.4vw,3.2rem)] leading-[1.15] text-film-ivory">
            <Words text="So we stopped choosing." stagger={0.06} />
          </p>
        </Reveal>

        {/* the formula */}
        <div className="mt-12 flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
          <FormulaChip
            tone="gold"
            title="DETERMINISTIC"
            lines={["provable", "<50ms · zero hallucination"]}
            delay={0}
          />
          <span aria-hidden className="self-center font-display text-2xl text-film-ivory/30">
            ×
          </span>
          <FormulaChip
            tone="violet"
            title="SEMANTIC"
            lines={["understands intent", "behind the shield"]}
            delay={0.25}
          />
          <span aria-hidden className="self-center font-display text-2xl text-film-ivory/30">
            ×
          </span>
          <FormulaChip
            tone="ivory"
            title="HUMAN"
            lines={["holds the pen", "signs the record"]}
            delay={0.5}
          />
        </div>

        <Reveal delay={0.3} className="mt-16 text-center">
          <p className="font-display text-[clamp(2rem,5vw,3.8rem)] leading-[1.1] text-film-ivory">
            Trust is not patched.
          </p>
          <p className="mt-2 font-display text-[clamp(2rem,5vw,3.8rem)] italic leading-[1.1]">
            <span className="text-gold-grad">It is woven.</span>
          </p>
        </Reveal>
      </div>
    </Scene>
  );
}

function FormulaChip({
  tone,
  title,
  lines,
  delay,
}: {
  tone: "gold" | "violet" | "ivory";
  title: string;
  lines: [string, string];
  delay: number;
}) {
  const tones = {
    gold: "border-thread-gold/40 bg-thread-gold/[0.07] text-thread-gold",
    violet: "border-thread-violet/40 bg-thread-violet/[0.07] text-thread-violet",
    ivory: "border-white/20 bg-white/[0.04] text-film-ivory",
  } as const;
  return (
    <Reveal delay={delay} y={18}>
      <div className={cn("rounded-xl border px-5 py-4 text-center sm:px-7 sm:py-5", tones[tone])}>
        <p className="font-mono text-[12px] font-semibold tracking-[0.24em] sm:text-[13px]">
          {title}
        </p>
        <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.12em] opacity-70">
          {lines[0]}
          <br />
          {lines[1]}
        </p>
      </div>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════
   PIPELINE — the pinned machine reveal.
   Asset → Stage 1 (deterministic engines tick in) → Stage 2
   (semantic, behind the shield) → human sign-off → publish.
   Ends on the interactive Privacy Lock.
   ════════════════════════════════════════════════════════════ */

const ENGINES = ["Terminology", "Voice", "Claims", "Visual ΔE", "WCAG 2.2", "Secrets"];

export function PipelineScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const [lock, setLock] = useState(false);

  useMotionValueEvent(p, "change", (v) => {
    const s = v < 0.06 ? 0 : v < 0.2 ? 1 : v < 0.34 ? 2 : v < 0.5 ? 3 : v < 0.66 ? 4 : 5;
    if (s !== stepRef.current) {
      stepRef.current = s;
      setStep(s);
    }
    filmPhase.target.weave = 0.5 + v * 0.32;
    filmPhase.target.energy = 0.7 + v * 0.25;
  });

  const headO = useTransform(p, [0.0, 0.04], [0, 1]);
  const headT = useTransform(p, [0.0, 0.04], [24, 0]);
  const headTf = useTransform(headT, (v: number) => `translate3d(0, ${v}px, 0)`);

  const on = (s: number) => step >= s;

  return (
    <Scene
      ref={ref}
      act="ACT II — THE MACHINE"
      weave="dyn"
      energy="dyn"
      className="relative h-[380vh]"
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
        <motion.div
          style={{ opacity: headO, transform: headTf }}
          className="mb-8 text-center sm:mb-12"
        >
          <Kicker className="text-center">The machine</Kicker>
          <h2 className="mt-4 font-display text-[clamp(1.7rem,4vw,3rem)] leading-tight text-film-ivory">
            Two stages. <span className="italic text-gold-grad">No blind trust.</span>
          </h2>
        </motion.div>

        {/* ── the flow ── */}
        <div className="flex w-full max-w-6xl flex-col items-stretch justify-center gap-0 lg:flex-row lg:items-center">
          {/* ASSET */}
          <FlowNode active={on(1)} className="w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-film-ivory/70" aria-hidden />
              <div>
                <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-film-ivory">
                  ASSET
                </p>
                <p className="font-mono text-[9px] tracking-[0.14em] text-film-ivory/40">
                  DRAFT · COPY · BANNER
                </p>
              </div>
            </div>
          </FlowNode>

          <Connector active={on(1)} />

          {/* STAGE 1 */}
          <FlowPanel
            active={on(2)}
            tone="gold"
            tag="STAGE 1"
            title="DETERMINISTIC"
            badge="<50MS · ZERO HALLUCINATION"
            className="w-full lg:w-auto"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {ENGINES.map((e, i) => (
                <span
                  key={e}
                  className={cn(
                    "flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[8px] tracking-[0.08em] text-film-ivory/70 transition-opacity duration-500 ease-out-x sm:text-[9px]",
                    on(2) ? "opacity-100" : "opacity-25"
                  )}
                  style={{ transitionDelay: on(2) ? `${200 + i * 110}ms` : "0ms" }}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      "h-3 w-3 shrink-0 text-thread-gold transition-all duration-300 ease-out-x",
                      on(2) ? "scale-100 opacity-100" : "scale-50 opacity-0"
                    )}
                    style={{ transitionDelay: on(2) ? `${200 + i * 110}ms` : "0ms" }}
                  />
                  {e}
                </span>
              ))}
            </div>
            <p className="mt-3 font-mono text-[8px] tracking-[0.18em] text-thread-gold/80 sm:text-[9px]">
              RUNS LOCALLY · EVERY FINDING PROVABLE · RULE-CITED
            </p>
          </FlowPanel>

          <Connector active={on(3)} violet />

          {/* STAGE 2 */}
          <FlowPanel
            active={on(3)}
            tone={lock ? "emerald" : "violet"}
            tag="STAGE 2"
            title={lock ? "AIR-GAPPED" : "SEMANTIC"}
            badge={lock ? "EXTERNAL CALLS BLOCKED" : "BEHIND THE SHIELD"}
            className="w-full lg:w-auto"
          >
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.1em] text-film-ivory/70">
                {lock ? (
                  <CloudOff className="h-3.5 w-3.5 shrink-0 text-thread-emerald" aria-hidden />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-thread-violet" aria-hidden />
                )}
                {lock ? "LOCAL SEMANTICS ONLY" : "TOKENS MASKED → TOK-7F3A"}
              </p>
              <p className="font-mono text-[9px] leading-relaxed tracking-[0.08em] text-film-ivory/45">
                {lock
                  ? "STAGE-1 FINDINGS STILL RETURN IN <50MS"
                  : "INTENT · CONTEXT · AMBIGUITY — PROPOSED, NEVER AUTO-APPLIED"}
              </p>
            </div>
          </FlowPanel>

          <Connector active={on(4)} />

          {/* SIGN-OFF + PUBLISH */}
          <FlowNode active={on(4)} className="w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 shrink-0 text-film-ivory/70" aria-hidden />
              <div>
                <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-film-ivory">
                  HUMAN SIGN-OFF
                </p>
                <p className="font-mono text-[9px] tracking-[0.14em] text-film-ivory/40">
                  AI PROPOSES · HUMANS DECIDE
                </p>
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[8px] tracking-[0.18em] transition-all duration-500 ease-out-x sm:text-[9px]",
                    on(4)
                      ? "border-thread-emerald/40 bg-thread-emerald/10 text-thread-emerald opacity-100"
                      : "border-white/10 text-film-ivory/40 opacity-40"
                  )}
                >
                  <span className="ping-dot h-1.5 w-1.5 rounded-full bg-thread-emerald" />
                  APPROVED_FOR_PUBLISH
                </p>
              </div>
            </div>
          </FlowNode>
        </div>

        {/* ── the privacy lock ── */}
        <div
          className={cn(
            "mt-8 w-full max-w-xl rounded-2xl border p-5 transition-all duration-700 ease-out-x sm:mt-12 sm:p-6",
            on(5)
              ? "translate-y-0 border-white/15 bg-film-ink-2/80 opacity-100 backdrop-blur-sm"
              : "translate-y-6 border-white/5 bg-transparent opacity-0"
          )}
          aria-hidden={!on(5)}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-3">
              <Lock
                className={cn(
                  "h-4 w-4 transition-colors duration-300",
                  lock ? "text-thread-emerald" : "text-film-ivory/50"
                )}
                aria-hidden
              />
              <Switch
                checked={lock}
                onCheckedChange={setLock}
                aria-label="Toggle the air-gapped privacy lock"
              />
              <span className="font-mono text-[10px] tracking-[0.22em] text-film-ivory/70">
                PRIVACY LOCK
              </span>
            </div>
            <p className="text-center font-mono text-[9px] leading-relaxed tracking-[0.1em] text-film-ivory/45 sm:text-left sm:text-[10px]">
              {lock
                ? "ENGAGED — air-gapped mode. External AI calls blocked at the middleware. The shield reverses only at human review."
                : "Flip it. Watch Stage 2 seal itself off from the world — your copy never leaves the building unmasked."}
            </p>
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* pipeline atoms */

function FlowNode({
  active,
  className,
  children,
}: {
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 transition-all duration-700 ease-out-x sm:px-6 sm:py-5",
        active
          ? "translate-y-0 border-white/15 bg-film-ink-2/70 opacity-100 backdrop-blur-sm"
          : "translate-y-3 border-white/5 bg-transparent opacity-30",
        className
      )}
    >
      {children}
    </div>
  );
}

function FlowPanel({
  active,
  tone,
  tag,
  title,
  badge,
  className,
  children,
}: {
  active: boolean;
  tone: "gold" | "violet" | "emerald";
  tag: string;
  title: string;
  badge: string;
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    gold: {
      border: active ? "border-thread-gold/45" : "border-white/5",
      bg: active ? "bg-thread-gold/[0.05]" : "bg-transparent",
      text: "text-thread-gold",
    },
    violet: {
      border: active ? "border-thread-violet/50" : "border-white/5",
      bg: active ? "bg-thread-violet/[0.06]" : "bg-transparent",
      text: "text-thread-violet",
    },
    emerald: {
      border: active ? "border-thread-emerald/50 border-dashed" : "border-white/5",
      bg: active ? "bg-thread-emerald/[0.06]" : "bg-transparent",
      text: "text-thread-emerald",
    },
  } as const;
  const t = tones[tone];
  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 backdrop-blur-sm transition-all duration-700 ease-out-x sm:px-6 sm:py-5",
        active
          ? cn("translate-y-0 opacity-100", t.border, t.bg)
          : "translate-y-3 border-white/5 bg-transparent opacity-30",
        className
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className={cn("font-mono text-[10px] tracking-[0.24em]", active ? t.text : "text-film-ivory/40")}>
          {tag} · <span className="font-semibold">{title}</span>
        </p>
      </div>
      {children}
      <p
        className={cn(
          "mt-3 font-mono text-[8px] tracking-[0.18em] transition-colors duration-500 sm:text-[9px]",
          active ? t.text : "text-film-ivory/30"
        )}
      >
        {badge}
      </p>
    </div>
  );
}

function Connector({ active, violet }: { active: boolean; violet?: boolean }) {
  return (
    <>
      {/* horizontal (desktop) */}
      <div
        aria-hidden
        className={cn(
          "relative mx-4 hidden h-px w-14 shrink-0 self-center transition-opacity duration-700 ease-out-x xl:w-24 lg:block",
          active ? "opacity-100" : "opacity-20"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/25 to-white/5" />
        {active && (
          <>
            <span className={cn("flow-dot", violet && "flow-dot-violet")} />
            <span className={cn("flow-dot", violet && "flow-dot-violet")} />
            <span className={cn("flow-dot", violet && "flow-dot-violet")} />
          </>
        )}
      </div>
      {/* vertical (mobile) */}
      <div
        aria-hidden
        className={cn(
          "relative my-2 h-8 w-px shrink-0 self-center transition-opacity duration-700 ease-out-x lg:hidden",
          active ? "opacity-100" : "opacity-20"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/25 to-white/5" />
        {active && (
          <>
            <span className="flow-dot flow-dot-v" />
            <span className="flow-dot flow-dot-v" />
          </>
        )}
      </div>
    </>
  );
}
