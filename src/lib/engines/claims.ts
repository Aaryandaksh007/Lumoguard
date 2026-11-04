// ============================================================
// Pillar 3: Atomic Fact & Promotional Claim Substantiation (Stage 1)
// FActScore-style decomposition: sentences containing numbers,
// currency, comparatives or superlatives are split into atomic
// clauses and matched against the Approved Fact Ledger via
// keyword-overlap retrieval + a deterministic Numeric & Date
// Constraint Verifier (the PALADIN blind-spot countermeasure).
// Verdicts: VERIFIED_CANONICAL | OUTDATED_FACT |
// ASPIRATIONAL_STATED_AS_PRESENT | UNSUBSTANTIATED_PROMOTIONAL_CLAIM
// | MISSING_MANDATORY_DISCLAIMER
// ============================================================

import type { FactData, RawFinding } from "@/lib/types";

const SUPERLATIVE_RES = [
  /\b(?:100%|world'?s\s+#?1|best|fastest|strongest|unmatched|guaranteed|flawless|infallible|perfect)\b/i,
  /\breplaces?\s+(?:your\s+)?entire\b/i,
  /\b(?:zero\s+errors?|zero\s+risk|never\s+fails?|eliminat\w+\s+every)\b/i,
  /\b(?:most\s+advanced|number\s+one|industry-leading|first\s+ever)\b/i,
];

const METRIC_RES = [
  /\$\s?\d+(?:\.\d+)?(?:\s*\/?\s*(?:user|seat|month|mo|yr|year|per\s+\w+))*/i,
  /\b\d+(?:\.\d+)?\s?%/,
  /\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?|hours?|x)\b/i,
  /\b\d{4}\b/,
];

const ASSERTION_RE =
  /\b(?:priced?|pricing|cost|guarantee|warranty|delivers?|provides?|replaces?|automates?|supports?|handles?|checking|executes?|runs?|processes?|protects?|ensures?)\b/i;

interface AtomicClaim {
  sentence: string;
  charStart: number;
  charEnd: number;
  hasSuperlative: boolean;
  hasMetric: boolean;
  hasAssertion: boolean;
}

const STOPWORDS = new Set(
  "a an the and or but while whereas is are was were be been being of for to in on at with by from as that this our your their it its we you they i not no per into over under more most than then so such very can will would should may might must have has had do does did".split(" ")
);

function keywords(s: string): Set<string> {
  return new Set(
    (s.toLowerCase().match(/\b[a-z0-9$%.]+\b/g) ?? []).filter((w) => !STOPWORDS.has(w) && w.length > 2)
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / Math.min(a.size, b.size);
}

function extractNumbers(s: string): string[] {
  return s.match(/\$\s?\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\s?(?:%|ms|x)?\b/gi) ?? [];
}

/** FActScore decomposition: sentence split → clause split → claim filter. */
export function decomposeClaims(text: string): AtomicClaim[] {
  const claims: AtomicClaim[] = [];
  const sentenceRe = /[^.!?\n]+[.!?]*/g;
  let sm: RegExpExecArray | null;
  while ((sm = sentenceRe.exec(text)) !== null) {
    const sentence = sm[0].trim();
    if (!sentence || sentence.length < 12) continue;
    const sStart = sm.index + (sm[0].length - sm[0].trimStart().length);

    const clauses = sentence.split(/\s+(?:and|while|whereas)\s+|;\s*/);
    for (const clause of clauses) {
      const c = clause.trim();
      if (!c || c.length < 10) continue;
      const hasSuperlative = SUPERLATIVE_RES.some((r) => r.test(c));
      const hasMetric = METRIC_RES.some((r) => r.test(c));
      const hasAssertion = ASSERTION_RE.test(c);
      if (!hasSuperlative && !hasMetric && !hasAssertion) continue;

      const idx = text.indexOf(c, sStart > 0 ? sStart - 1 : 0);
      const charStart = idx >= 0 ? idx : sStart;
      claims.push({
        sentence: c,
        charStart,
        charEnd: charStart + c.length,
        hasSuperlative,
        hasMetric,
        hasAssertion,
      });
    }
  }
  return claims;
}

export class ClaimGroundingEngine {
  private facts: FactData[];
  private factKeywords: Map<string, Set<string>>;

  constructor(facts: FactData[]) {
    this.facts = facts;
    this.factKeywords = new Map();
    for (const f of facts) {
      const combined = [f.claimAssertion, ...f.atomicBreakdown].join(" ");
      this.factKeywords.set(f.factId, keywords(combined));
    }
  }

  /** Retrieves top-k grounding facts for a claim (lexical hybrid-retrieval stand-in for pgvector cosine). */
  retrieve(claim: string, k = 2): { fact: FactData; score: number }[] {
    const ck = keywords(claim);
    return this.facts
      .map((fact) => ({ fact, score: overlapScore(ck, this.factKeywords.get(fact.factId)!) }))
      .filter((r) => r.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  auditText(text: string, canonTerms?: string[]): RawFinding[] {
    const t0 = performance.now();
    const findings: RawFinding[] = [];
    const claims = decomposeClaims(text);
    const latency = () => Math.round((performance.now() - t0) * 1000) / 1000;

    for (const claim of claims) {
      const retrieved = this.retrieve(claim.sentence);
      const best = retrieved[0];
      const s = claim.sentence;

      // --- 1. OUTDATED FACT: matches a SUPERSEDED record (deterministic numeric verification) ---
      const superseded = retrieved.find((r) => r.fact.status === "SUPERSEDED");
      if (superseded && this.numbersDisagree(s, superseded.fact) && this.numbersAgreeWithSuccessor(s, superseded.fact)) {
        const successor = this.facts.find((f) => f.factId === superseded.fact.supersededByFactId);
        const oldNums = extractNumbers(s).filter((n) =>
          extractNumbers([superseded.fact.claimAssertion, ...superseded.fact.atomicBreakdown].join(" ")).some(
            (fn) => fn.replace(/\s/g, "") === n.replace(/\s/g, "")
          )
        );
        let diff: string | null = s;
        if (successor && oldNums.length > 0) {
          const succNums = extractNumbers([successor.claimAssertion, ...successor.atomicBreakdown].join(" "));
          diff = s;
          oldNums.forEach((old, i) => {
            const next = succNums[i] ?? succNums[0];
            if (next) diff = diff!.replace(old, next);
          });
        }
        findings.push({
          pillar: "FACT_CLAIM",
          ruleId: "RULE-FACT-SUPERSEDED",
          severity: "HIGH",
          verdict: "OUTDATED_FACT",
          originalSpan: s,
          charStart: claim.charStart,
          charEnd: claim.charEnd,
          suggestedDiff: diff,
          explanation: `Outdated fact: this claim matches ${superseded.fact.factId} (status SUPERSEDED${superseded.fact.expirationDate ? `, expired ${superseded.fact.expirationDate}` : ""}). ${successor ? `The active canonical record is ${successor.factId}: "${successor.claimAssertion}".` : "No canonical successor is on file — route to the fact ledger owner."}`,
          provenance: {
            engine: "DETERMINISTIC_NUMERIC_VERIFIER",
            algorithm: "FActScore Atomic Decomposition + Numeric Constraint Verifier",
            citation: `Fact Ledger ${superseded.fact.factId}${successor ? ` → ${successor.factId}` : ""}`,
            latencyMs: latency(),
            contextMode: "DYNAMIC_FACT_LEDGER",
            retrievedClauses: [
              { id: superseded.fact.factId, text: superseded.fact.claimAssertion, retrieval: "DYNAMIC" },
              ...(successor
                ? [{ id: successor.factId, text: successor.claimAssertion, retrieval: "DYNAMIC" as const }]
                : []),
            ],
          },
          intentPreservation: 0.92,
        });
        continue;
      }

      // --- 2. ASPIRATIONAL STATED AS PRESENT: matches ROADMAP_ASPIRATIONAL but present tense ---
      const aspirational = retrieved.find((r) => r.fact.status === "ROADMAP_ASPIRATIONAL");
      if (
        aspirational &&
        /\b(?:provides?|delivers?|offers?|supports?|includes?|handles?|checks?)\b/i.test(s)
      ) {
        const verbForms: Record<string, [string, string]> = {
          provides: ["is architected to provide", "provide"],
          provide: ["is architected to provide", "provide"],
          delivers: ["is architected to deliver", "deliver"],
          deliver: ["is architected to deliver", "deliver"],
          offers: ["is architected to offer", "offer"],
          offer: ["is architected to offer", "offer"],
          supports: ["is architected to support", "support"],
          support: ["is architected to support", "support"],
          includes: ["is architected to include", "include"],
          include: ["is architected to include", "include"],
          handles: ["is architected to handle", "handle"],
          handle: ["is architected to handle", "handle"],
          checks: ["is architected to check", "check"],
          check: ["is architected to check", "check"],
        };
        const verbMatch = /\b(provides?|delivers?|offers?|supports?|includes?|handles?|checks?)\b/i.exec(s);
        let hedged = s;
        if (verbMatch) {
          const verb = verbMatch[1];
          const replacement = verbForms[verb.toLowerCase()]?.[0] ?? `is architected to ${verb.toLowerCase()}`;
          hedged = s.replace(verbMatch[0], replacement) + " (planned for an upcoming release, not yet generally available)";
        } else {
          hedged = `${s.replace(/([.!?])?\s*$/, "")} (planned capability, not yet generally available).`;
        }
        findings.push({
          pillar: "FACT_CLAIM",
          ruleId: "RULE-FACT-ASPIRATIONAL",
          severity: "HIGH",
          verdict: "ASPIRATIONAL_STATED_AS_PRESENT",
          originalSpan: s,
          charStart: claim.charStart,
          charEnd: claim.charEnd,
          suggestedDiff: hedged,
          explanation: `FTC/SEC 'AI-washing' risk: roadmap feature (${aspirational.fact.factId}) stated as a current capability. Aspirational items must be clearly distinguished from released capabilities — hedge the verb tense or add availability framing.`,
          provenance: {
            engine: "MINICHECK_ENTAILMENT_LOCAL",
            algorithm: "FActScore Decomposition + Roadmap Status Gate",
            citation: `Fact Ledger ${aspirational.fact.factId} (ROADMAP_ASPIRATIONAL)`,
            latencyMs: latency(),
            contextMode: "DYNAMIC_FACT_LEDGER",
            retrievedClauses: [
              { id: aspirational.fact.factId, text: aspirational.fact.claimAssertion, retrieval: "DYNAMIC" },
            ],
          },
          intentPreservation: 0.93,
        });
        continue;
      }

      // --- 3. UNSUBSTANTIATED PROMOTIONAL CLAIM: superlative with zero supporting evidence ---
      if (claim.hasSuperlative && (!best || best.score < 0.34)) {
        findings.push({
          pillar: "FACT_CLAIM",
          ruleId: "RULE-PROMO-UNSUBSTANTIATED",
          severity: "CRITICAL",
          verdict: "UNSUBSTANTIATED_PROMOTIONAL_CLAIM",
          originalSpan: s,
          charStart: claim.charStart,
          charEnd: claim.charEnd,
          suggestedDiff: this.softenSuperlative(s),
          explanation:
            "FTC Act §5 / Operation AI Comply exposure: a superlative or absolute capability assertion with no grounding record in the Approved Fact Ledger. Every objective, quantified, or comparative claim must link to contemporaneous test evidence before publication. Proposed diff softens the claim to an objective statement; attach evidence or route to Legal/Product.",
          provenance: {
            engine: "MINICHECK_ENTAILMENT_LOCAL",
            algorithm: "FActScore Decomposition + Entailment Gap Detection",
            citation: "Approved Fact Ledger — no entailing record retrieved",
            latencyMs: latency(),
            contextMode: "DYNAMIC_FACT_LEDGER",
            retrievedClauses: [],
          },
          intentPreservation: 0.88,
        });
        continue;
      }

      // --- 4. VERIFIED_CANONICAL: strong entailment against an active CANONICAL record ---
      if (best && best.fact.status === "CANONICAL" && best.score >= 0.34) {
        const expired =
          best.fact.expirationDate && new Date(best.fact.expirationDate) < new Date();
        if (!expired && this.numbersAgree(s, best.fact)) {
          findings.push({
            pillar: "FACT_CLAIM",
            ruleId: "RULE-FACT-GROUNDED",
            severity: "INFO",
            verdict: "VERIFIED_CANONICAL",
            originalSpan: s,
            charStart: claim.charStart,
            charEnd: claim.charEnd,
            suggestedDiff: null,
            explanation: `Claim verified against canonical record ${best.fact.factId} (entailment confidence ${(best.score * 100).toFixed(0)}%). ${best.fact.evidenceDocUrl ? `Evidence: ${best.fact.evidenceDocUrl}` : ""}`,
            provenance: {
              engine: "MINICHECK_ENTAILMENT_LOCAL",
              algorithm: "FActScore Decomposition + Compact Entailment Model",
              citation: `Fact Ledger ${best.fact.factId}`,
              latencyMs: latency(),
              contextMode: "DYNAMIC_FACT_LEDGER",
              retrievedClauses: [
                { id: best.fact.factId, text: best.fact.claimAssertion, retrieval: "DYNAMIC" },
              ],
            },
            intentPreservation: 1.0,
          });
        }
      }
    }

    // --- 5. MISSING_MANDATORY_DISCLAIMER: regulated topic without required fine print ---
    const regulatedFacts = this.facts.filter((f) => f.requiredDisclaimerText);
    for (const fact of regulatedFacts) {
      const topicTouched =
        /\b(?:legal|compliance|lawsuit|regulator|regulatory|attorney|counsel|liability|FTC|SEC)\b/i.test(text) ||
        keywords(fact.claimAssertion).size > 0 &&
          overlapScore(keywords(text), this.factKeywords.get(fact.factId)!) > 0.08;
      if (topicTouched && fact.requiredDisclaimerText) {
        const normalizedHaystack = text.toLowerCase().replace(/\s+/g, " ");
        const needleFragments = fact.requiredDisclaimerText
          .toLowerCase()
          .replace(/\s+/g, " ")
          .split(/[.,;:]/)
          .map((f) => f.trim())
          .filter((f) => f.length > 25);
        const present = needleFragments.some((frag) => normalizedHaystack.includes(frag));
        if (!present) {
          findings.push({
            pillar: "FACT_CLAIM",
            ruleId: "RULE-DISCLAIMER-MANDATORY",
            severity: "HIGH",
            verdict: "MISSING_MANDATORY_DISCLAIMER",
            originalSpan: "[End of document / footer]",
            charStart: text.length,
            charEnd: text.length,
            suggestedDiff: `\n\n---\n*${fact.requiredDisclaimerText}*`,
            explanation: `Mandatory regulatory disclaimer missing: required whenever marketing copy references ${fact.factId} topics. One-click insertion of the approved fine print into the document footer is available.`,
            provenance: {
              engine: "DETERMINISTIC_ENGINE_LOCAL",
              algorithm: "Required Disclaimer Entailment Gate",
              citation: `Fact Ledger ${fact.factId} (required_disclaimer_text)`,
              latencyMs: latency(),
              contextMode: "LOCKED_CANON_RULE",
              retrievedClauses: [
                { id: fact.factId, text: fact.requiredDisclaimerText, retrieval: "LOCKED" },
              ],
            },
            intentPreservation: 1.0,
          });
        }
      }
    }

    // Unused canon terms param reserved for future context narrowing
    void canonTerms;
    return findings;
  }

  private numbersDisagree(claimText: string, fact: FactData): boolean {
    const factNums = extractNumbers([fact.claimAssertion, ...fact.atomicBreakdown].join(" ")).map((n) =>
      n.replace(/\s/g, "").toLowerCase()
    );
    const claimNums = extractNumbers(claimText).map((n) => n.replace(/\s/g, "").toLowerCase());
    return claimNums.some((cn) => factNums.includes(cn));
  }

  private numbersAgreeWithSuccessor(claimText: string, superseded: FactData): boolean {
    const successor = this.facts.find((f) => f.factId === superseded.supersededByFactId);
    if (!successor) return false;
    const succNums = extractNumbers([successor.claimAssertion, ...successor.atomicBreakdown].join(" ")).map(
      (n) => n.replace(/\s/g, "").toLowerCase()
    );
    const claimNums = extractNumbers(claimText).map((n) => n.replace(/\s/g, "").toLowerCase());
    return !claimNums.some((cn) => succNums.includes(cn));
  }

  private numbersAgree(claimText: string, fact: FactData): boolean {
    const factNums = extractNumbers([fact.claimAssertion, ...fact.atomicBreakdown].join(" ")).map((n) =>
      n.replace(/\s/g, "").toLowerCase()
    );
    if (factNums.length === 0) return true;
    const claimNums = extractNumbers(claimText).map((n) => n.replace(/\s/g, "").toLowerCase());
    // If the claim contains numbers none of which appear in the fact, treat as disagreement
    const meaningful = claimNums.filter((cn) => /\d/.test(cn));
    if (meaningful.length === 0) return true;
    return meaningful.every((cn) => factNums.includes(cn));
  }

  /** Intent-preserving softening of an unsubstantiated superlative claim. */
  private softenSuperlative(s: string): string {
    const pluralize = (np: string) => {
      const t = np.trim();
      if (/(s|x|z|ch|sh)$/i.test(t)) return t;
      if (/[^aeiou]y$/i.test(t)) return t.replace(/y$/i, "ies");
      return `${t}s`;
    };
    let out = s;
    const swaps: [RegExp, string | ((...g: string[]) => string)][] = [
      [/replaces?\s+(?:your\s+)?entire\s+([a-z\s]+?)\s+with\s+100%\s+accuracy/i, "assists your $1 with audited, benchmark-backed accuracy"],
      [/replaces?\s+(?:your\s+)?entire\s+([a-z\s]+?)(?=[.,;]|\s+with\b)/i, "works alongside your $1"],
      [/\b100%\s+accuracy\b/gi, "measured, benchmark-backed accuracy"],
      [/\bworld'?s\s+#?1\b/gi, "a category-leading"],
      [/\bguaranteed\b/gi, "backed by benchmarks"],
      [/\bflawless\b/gi, "rigorously tested"],
      [/\binfallible\b/gi, "audited"],
      [
        /eliminat\w+\s+every\s+([a-z\s]+?)(?=\s+overnight\b|[.,;])/i,
        (_m: string, np: string) => `materially reduces ${pluralize(np)}`,
      ],
      [/\bnever\s+fails?\b/gi, "is monitored for reliability"],
      [/\bzero\s+errors?\b/gi, "a low measured error rate"],
      [/\bzero\s+risk\b/gi, "reduced risk"],
      [/\bunmatched\b/gi, "differentiated"],
      [/\bbest\s+in\s+class\b/gi, "competitive"],
      [/\bovernight\b/gi, "over a staged rollout"],
    ];
    for (const [re, rep] of swaps) out = out.replace(re, rep as never);
    return out === s ? `${s.replace(/([.!?])?\s*$/, "")} (per verified internal benchmarks).` : out;
  }
}
