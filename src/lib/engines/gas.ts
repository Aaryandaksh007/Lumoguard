// ============================================================
// Secret Weapon #1: The Guideline Ambiguity Score (GAS) Engine
// GAS_r = ln(1 + N_triggers) · ( 0.5·overrideRate
//                              + 0.3·disputeRate
//                              + 0.2·min(1, T̄_resolve / 48h) )
// Distinguishes habitual creator mistakes (clear rules, low GAS)
// from unclear brand guidelines (high override/dispute friction).
// ============================================================

export interface TelemetryInput {
  ruleId: string;
  triggersCount: number;
  overridesCount: number;
  disputesCount: number;
  meanResolutionHours: number;
}

export const GAS_SLA_HOURS = 48;

export function computeGas(t: TelemetryInput): number {
  const n = Math.max(0, t.triggersCount);
  if (n === 0) return 0;
  const overrideRate = Math.min(1, t.overridesCount / n);
  const disputeRate = Math.min(1, t.disputesCount / n);
  const latencyFactor = Math.min(1, t.meanResolutionHours / GAS_SLA_HOURS);
  return Math.round(Math.log(1 + n) * (0.5 * overrideRate + 0.3 * disputeRate + 0.2 * latencyFactor) * 1000) / 1000;
}

export function classify(gas: number): "HABITUAL_MISTAKE" | "UNCLEAR_GUIDELINE" {
  return gas >= 1.0 ? "UNCLEAR_GUIDELINE" : "HABITUAL_MISTAKE";
}

/** Human-readable action recommendation from a GAS classification. */
export function gasRecommendation(gas: number): string {
  if (gas >= 1.0) {
    return "Classified as an UNCLEAR brand guideline: override/dispute friction is disproportionate to trigger volume. Run the Canon Refiner to synthesize override justifications into a disambiguated guideline with concrete Do / Don't examples.";
  }
  if (gas >= 0.5) {
    return "Borderline friction: review recent override comments; consider clarifying examples or enabling the 1-click auto-fix for this rule.";
  }
  return "Classified as a REPEATED CREATOR MISTAKE against a clear rule: recommend enabling 1-click auto-fix and creator onboarding micro-tips.";
}
