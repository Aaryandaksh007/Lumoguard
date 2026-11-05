// ============================================================
// Pillar 2: Tone, Voice & Messaging Engine (Stage 1)
// Deterministic linguistic analyzer: paragraph-level
// Flesch-Kincaid grade + Flesch Reading Ease, passive-voice
// ceiling, sentence-length stats, and formulaic AI cliché scan.
// Deliberate rhetorical fragments in headlines are exempted
// ("deliberate style is never flagged as failure").
// ============================================================

import type { RawFinding, VoiceSpecData } from "@/lib/types";

function countSyllables(word: string): number {
  let w = word.toLowerCase().trim();
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]|ed|es|e)$/, "");
  const vowels = "aeiouy";
  let count = 0;
  let prevVowel = false;
  for (const ch of w) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevVowel) count += 1;
    prevVowel = isVowel;
  }
  return Math.max(1, count);
}

export interface ReadabilityStats {
  numSentences: number;
  numWords: number;
  fkGrade: number;
  readingEase: number;
  passiveCount: number;
  passivePct: number;
}

export function analyzeReadability(text: string): ReadabilityStats {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = text.match(/\b[A-Za-z0-9'-]+\b/g) ?? [];

  const numSentences = Math.max(1, sentences.length);
  const numWords = Math.max(1, words.length);
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);

  const wordsPerSentence = numWords / numSentences;
  const syllablesPerWord = totalSyllables / numWords;

  const fkGrade = Math.max(
    1,
    Math.round((0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59) * 100) / 100
  );
  const readingEase = Math.min(
    100,
    Math.max(0, Math.round((206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord) * 100) / 100)
  );

  const passiveRe =
    /\b(?:is|are|was|were|been|being|be|become|becomes|became)\s+(?:[A-Za-z]+ed|written|seen|taken|done|proven|built|developed|made|processed|unveiled|launched)\b/gi;
  const passiveCount = (text.match(passiveRe) ?? []).length;
  const passivePct = Math.round((passiveCount / numSentences) * 100 * 10) / 10;

  return { numSentences, numWords, fkGrade, readingEase, passiveCount, passivePct };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class VoiceToneEngine {
  constructor(private spec: VoiceSpecData) {}

  auditText(text: string): RawFinding[] {
    const t0 = performance.now();
    const findings: RawFinding[] = [];
    const stats = analyzeReadability(text);

    // 1. Formulaic AI cliché scan (canonical forbidden list)
    for (const cliche of this.spec.forbiddenCliches) {
      const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(cliche)}(?![\\p{L}])`, "giu");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        findings.push({
          pillar: "VOICE",
          ruleId: "RULE-VOICE-CLICHE",
          severity: "MEDIUM",
          verdict: "FORMULAIC_CLICHE",
          originalSpan: m[0],
          charStart: m.index,
          charEnd: m.index + m[0].length,
          suggestedDiff: this.clicheReplacement(m[0]),
          explanation: `Formulaic AI cliché detected: '${m[0]}'. The brand voice mandates grounded, engineering-grade phrasing over generic LLM filler.`,
          provenance: {
            engine: "DETERMINISTIC_ENGINE_LOCAL",
            algorithm: "Regex Cliché Lexicon Scanner",
            citation: "Brand Voice Spec §3.4: Anti-Formulaic LLM Clichés",
            latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
            contextMode: "LOCKED_CANON_VOICE",
            retrievedClauses: [
              {
                id: "VOICE-CLICHE-LIST",
                text: `Forbidden cliché list includes: ${this.spec.forbiddenCliches.slice(0, 4).join(", ")}…`,
                retrieval: "LOCKED",
              },
            ],
          },
          intentPreservation: 0.95,
        });
      }
    }

    // 2. Passive voice ceiling
    if (stats.passivePct > this.spec.passiveVoiceMaxPct) {
      findings.push({
        pillar: "VOICE",
        ruleId: "RULE-VOICE-PASSIVE",
        severity: "LOW",
        verdict: "PASSIVE_VOICE_EXCESS",
        originalSpan: `${stats.passivePct}% passive constructions (${stats.passiveCount}/${stats.numSentences} sentences)`,
        charStart: 0,
        charEnd: Math.min(text.length, 120),
        suggestedDiff: null,
        explanation: `Passive voice percentage (${stats.passivePct}%) exceeds the brand ceiling of ${this.spec.passiveVoiceMaxPct}%. Prefer active subject-verb phrasing.`,
        provenance: {
          engine: "DETERMINISTIC_ENGINE_LOCAL",
          algorithm: "Part-of-Speech Heuristic Parser",
          citation: "Brand Voice Spec §2.1: Active Construction Mandate",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "LOCKED_CANON_VOICE",
        },
        intentPreservation: 1.0,
      });
    }

    // 3. Readability band — exempt short rhetorical pieces (deliberate style)
    if (
      stats.numWords > 40 &&
      (stats.fkGrade < this.spec.fleschKincaidMin || stats.fkGrade > this.spec.fleschKincaidMax)
    ) {
      findings.push({
        pillar: "VOICE",
        ruleId: "RULE-VOICE-READABILITY",
        severity: "LOW",
        verdict: "READABILITY_OUT_OF_BAND",
        originalSpan: `Document readability grade ${stats.fkGrade} (Reading Ease ${stats.readingEase})`,
        charStart: 0,
        charEnd: Math.min(text.length, 120),
        suggestedDiff: null,
        explanation: `Flesch-Kincaid Grade Level ${stats.fkGrade} falls outside the approved band [${this.spec.fleschKincaidMin} – ${this.spec.fleschKincaidMax}] for the '${this.spec.personaName}' voice.`,
        provenance: {
          engine: "DETERMINISTIC_ENGINE_LOCAL",
          algorithm: "Flesch-Kincaid / Reading Ease Formula",
          citation: "Brand Voice Spec §2.3: Readability Range",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "LOCKED_CANON_VOICE",
        },
        intentPreservation: 1.0,
      });
    }

    return findings;
  }

  private clicheReplacement(cliche: string): string {
    const map: Record<string, string> = {
      "delve into": "examine",
      "testament to": "demonstration of",
      "game-changer": "milestone",
      "revolutionary paradigm": "new architecture",
      "harness the power of": "apply",
      "in today's fast-paced world": "today",
      "cutting-edge innovation": "modern engineering",
      "seamlessly integrate": "integrate",
      "embark on a journey": "begin",
    };
    const lower = cliche.toLowerCase();
    for (const k of Object.keys(map)) {
      if (lower.includes(k)) {
        const replacement = map[k];
        return cliche[0] === cliche[0]?.toUpperCase() && /^[a-z]/.test(cliche[0] ?? "")
          ? replacement
          : cliche[0] === cliche[0]?.toUpperCase()
            ? replacement[0].toUpperCase() + replacement.slice(1)
            : replacement;
      }
    }
    return "a grounded alternative";
  }
}
