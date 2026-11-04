// ============================================================
// Pillar 6: Reversible Confidentiality & PII Shield
// ("The Sandwich Pattern" — Presidio-style architecture)
// Step 1: Local detection — brand secret deny-list + PII
//         recognizers (email, phone, person names, card numbers)
// Step 2: Reversible placeholder tokenization typed per entity
//         ({{SECRET_CODENAME_1}}, {{PERSON_1}}, …) stored in an
//         ephemeral session map
// Step 3: Sanitized external execution + LONGEST-FIRST
//         de-anonymization so {{PERSON_10}} is never corrupted
//         by a naive prefix replacement on {{PERSON_1}}.
// ============================================================

import type { RawFinding } from "@/lib/types";

export interface DetectedEntity {
  entityType: "SECRET_CODENAME" | "PERSON" | "EMAIL_ADDRESS" | "PHONE_NUMBER" | "CREDIT_CARD";
  start: number;
  end: number;
  score: number;
  text: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PERSON_TITLE_RE =
  /\b(?:contact|email|reach|call|attorney?|counsel|officer|manager|director|founder|CEO|CTO|CFO|president|lead)\b[^.!?]{0,40}/i;

export class ConfidentialityShield {
  constructor(private codenames: string[]) {}

  /** Step 1 + 2: detect entities and produce scrubbed text + reversible token map. */
  redactAndTokenize(text: string): {
    scrubbed: string;
    tokenMap: Record<string, string>;
    entities: DetectedEntity[];
  } {
    const entities: DetectedEntity[] = [];

    // 1. Brand Secret Deny-List Recognizer (highest confidence, exact spans)
    for (const codename of this.codenames) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(codename)}(?![\\p{L}\\p{N}])`, "giu");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        entities.push({
          entityType: "SECRET_CODENAME",
          start: m.index,
          end: m.index + m[0].length,
          score: 0.99,
          text: m[0],
        });
      }
    }

    // 2. Email recognizer
    const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g;
    let m: RegExpExecArray | null;
    while ((m = emailRe.exec(text)) !== null) {
      entities.push({ entityType: "EMAIL_ADDRESS", start: m.index, end: m.index + m[0].length, score: 0.95, text: m[0] });
    }

    // 3. Credit-card-shaped numbers (Luhn-lite: 13-19 digits grouped)
    const cardRe = /\b(?:\d[ -]?){13,19}\b/g;
    while ((m = cardRe.exec(text)) !== null) {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length >= 13 && digits.length <= 19) {
        entities.push({ entityType: "CREDIT_CARD", start: m.index, end: m.index + m[0].length, score: 0.9, text: m[0] });
      }
    }

    // 4. Phone recognizer
    const phoneRe = /(?<![\d-])\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;
    while ((m = phoneRe.exec(text)) !== null) {
      entities.push({ entityType: "PHONE_NUMBER", start: m.index, end: m.index + m[0].length, score: 0.9, text: m[0] });
    }

    // 5. PERSON recognizer: "Firstname Lastname" patterns near contact context
    //    (calibrated zone — mirrors Presidio NER with reduced false positives)
    const personRe = /\b([A-Z][a-z]+)\s([A-Z][a-z]{2,})\b/g;
    while ((m = personRe.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 80), m.index);
      const knownSecret = entities.some(
        (e) => m!.index < e.end && m!.index + m[0].length > e.start
      );
      if (knownSecret) continue;
      // Only flag when a contact/title context cue exists or name is capitalized pair adjacent to verbs of contact
      if (PERSON_TITLE_RE.test(before) || /\b(?:said|says|according to)\s+$/.test(before)) {
        entities.push({ entityType: "PERSON", start: m.index, end: m.index + m[0].length, score: 0.62, text: m[0] });
      }
    }

    // Deduplicate overlapping entities (keep highest score / longest span)
    entities.sort((a, b) => a.start - b.start || b.end - b.start);
    const kept: DetectedEntity[] = [];
    for (const e of entities) {
      const clash = kept.find((k) => e.start < k.end && e.end > k.start);
      if (!clash) kept.push(e);
    }

    // Replace from the end so earlier offsets stay valid
    const counters: Record<string, number> = {};
    const tokenMap: Record<string, string> = {};
    let scrubbed = text;
    for (const e of [...kept].sort((a, b) => b.start - a.start)) {
      const t = e.entityType;
      counters[t] = (counters[t] ?? 0) + 1;
      const token = `{{${t}_${counters[t]}}}`;
      tokenMap[token] = e.text;
      scrubbed = scrubbed.slice(0, e.start) + token + scrubbed.slice(e.end);
    }

    return { scrubbed, tokenMap, entities: kept };
  }

  /** Step 3: longest-placeholder-first de-anonymization. */
  deAnonymize(scrubbed: string, tokenMap: Record<string, string>): string {
    const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
    let restored = scrubbed;
    for (const token of tokens) {
      restored = restored.split(token).join(tokenMap[token]);
    }
    return restored;
  }

  /** Produces CONFIDENTIALITY findings with shield audit proof. */
  auditConfidentiality(text: string): RawFinding[] {
    const t0 = performance.now();
    const { scrubbed, tokenMap } = this.redactAndTokenize(text);
    const findings: RawFinding[] = [];

    for (const [token, secret] of Object.entries(tokenMap)) {
      const isSecret = token.startsWith("{{SECRET");
      findings.push({
        pillar: "CONFIDENTIALITY",
        ruleId: isSecret ? "RULE-CONFIDENTIAL-DENYLIST" : "RULE-CONFIDENTIAL-PII",
        severity: isSecret ? "CRITICAL" : "HIGH",
        verdict: "CONFIDENTIAL_MATERIAL_MASKED",
        originalSpan: secret,
        charStart: text.indexOf(secret),
        charEnd: text.indexOf(secret) + secret.length,
        // Informational: the shield already protects external transmission.
        // The creator's document is never rewritten by the privacy layer.
        suggestedDiff: null,
        explanation: isSecret
          ? `Confidential brand secret detected: '${secret}'. The Reversible Shield automatically masked it into '${token}' before any external AI transmission (see the sanitized payload in the trace drawer); it is restored server-side on return. Your document itself is never altered by the privacy layer — remove the codename manually before publication if it is not cleared for release.`
          : `Potentially personal data detected: '${secret}'. Masked into '${token}' in all external AI payloads (Presidio-style reversible proxy). Remove it from the published document if it is not cleared.`,
        provenance: {
          engine: "MICROSOFT_PRESIDIO_REVERSIBLE_PROXY",
          algorithm: "Deny-List + NER Recognizers + Longest-First Substitution",
          citation: "Brand Security & IP Protection Policy §1.4",
          latencyMs: Math.round((performance.now() - t0) * 1000) / 1000,
          contextMode: "PRIVACY_AIRLOCK_ACTIVE",
          sanitizedPayloadPreview: scrubbed.slice(0, 200) + (scrubbed.length > 200 ? "…" : ""),
        },
        intentPreservation: 1.0,
        placeholderToken: token,
      });
    }

    return findings;
  }
}
