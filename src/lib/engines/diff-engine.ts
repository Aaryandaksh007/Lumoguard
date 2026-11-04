// ============================================================
// Intent-Preserving Surgical Diff Engine
// - LCS-based inline diff chunks (red/green) for the UI
// - Intent Preservation Gate: compares the FULL containing
//   sentence before/after the proposed edit (approximating the
//   spec's embedding-cosine check lexically) with
//   content-word retention + named-entity retention.
//   Numeric corrections (outdated figures, superlative
//   removal) are expected for claim fixes and are excluded
//   from the entity-drop penalty there.
// ============================================================

import type { DiffChunk } from "@/lib/types";

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/\b[\w'$%#.-]+\b/g) ?? [];
}

/** Stemming-lite so 'bottleneck' matches 'bottlenecks'. */
function stem(w: string): string {
  return w.replace(/(?:ies)$/, "y").replace(/(?:es|s|ing|ed)$/, "");
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/** Word-level inline diff producing equal/remove/add chunks for surgical display. */
export function generateInlineDiffChunks(original: string, suggested: string): DiffChunk[] {
  const a = tokenize(original);
  const b = tokenize(suggested);
  const dp = lcsMatrix(a, b);
  const chunks: DiffChunk[] = [];
  const push = (type: DiffChunk["type"], text: string) => {
    const last = chunks[chunks.length - 1];
    if (last && last.type === type) last.text += ` ${text}`;
    else chunks.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("remove", a[i]);
      i += 1;
    } else {
      push("add", b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    push("remove", a[i]);
    i += 1;
  }
  while (j < b.length) {
    push("add", b[j]);
    j += 1;
  }
  return chunks;
}

const STOPWORDS = new Set(
  "a an the and or but while whereas is are was were be been being of for to in on at with by from as that this our your their it its we you they i not no per into over under more most than then so such very can will would should may might must have has had do does did".split(" ")
);

export interface IntentOptions {
  /** Claim corrections intentionally change numbers/superlatives — don't count them as dropped entities. */
  numericCorrectionsExpected?: boolean;
}

/**
 * Intent Preservation score ∈ [0,1] between the original sentence and the
 * proposed sentence. 0.5 · content-word retention + 0.5 · entity retention.
 */
export function computeIntentPreservation(
  originalSentence: string,
  proposedSentence: string,
  options?: IntentOptions
): number {
  const a = tokenize(originalSentence);
  const b = tokenize(proposedSentence);
  if (a.length === 0 && b.length === 0) return 1;

  const stemsA = new Set(a.filter((w) => !STOPWORDS.has(w) && w.length > 2).map(stem));
  const stemsB = new Set(b.map(stem));
  let contentKept = 0;
  for (const w of stemsA) if (stemsB.has(w)) contentKept += 1;
  const contentRetention = stemsA.size === 0 ? 1 : contentKept / stemsA.size;

  const rawA = originalSentence.match(/\b[\w'$%#.-]+\b/g) ?? [];
  // Sentence-initial capitalization is not an entity marker — skip the first word
  const entities = rawA.slice(1).filter((w) =>
    /\d/.test(w) && !options?.numericCorrectionsExpected
      ? true
      : /^[A-Z][a-zA-Z]{2,}$/.test(w)
  );
  const stemsBLower = new Set(b.map(stem));
  const retained = entities.filter((w) => stemsBLower.has(stem(w.toLowerCase()))).length;
  const entityRetention = entities.length === 0 ? 1 : retained / entities.length;

  return Math.round((0.5 * contentRetention + 0.5 * entityRetention) * 100) / 100;
}

/** Expands a character span to the full containing sentence. */
export function expandToSentence(text: string, start: number, end: number): { start: number; end: number } {
  if (start < 0 || end <= start) return { start, end };
  let s = start;
  while (s > 0 && !/[.!?\n]/.test(text[s - 1] ?? "")) s -= 1;
  let e = end;
  while (e < text.length && !/[.!?\n]/.test(text[e] ?? "")) e += 1;
  return { start: s, end: e };
}
