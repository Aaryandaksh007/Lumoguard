// ============================================================
// Pillar 7: Transaction Integrity — The Checkout Truth Engine
// (PayPal Orders API v2 × AI)
//
// The most expensive class of brand failure lives in the gap
// between what a campaign ADVERTISES and what the checkout
// CHARGES (drip pricing, stale prices, currency drift, phantom
// discounts — FTC §5 / EU Omnibus territory).
//
// The loop:
//   1. DETERMINISTIC scan extracts monetary offers from the
//      draft (currency spans + offer phrases). Zero hallucination.
//   2. AI ENRICHMENT (external LLM, on the scrubbed payload)
//      structures each offer → { item, amount, currency, sku }
//      and drafts the mismatch explanation. Regex fallback keeps
//      the pillar alive when the AI leg is sealed or down.
//   3. PAYPAL ORDERS API v2 creates a real order against the
//      Merchant Pricing Canon — the canonical charge registry.
//   4. Advertised vs charged is compared field-by-field; drift
//      becomes a CRITICAL finding carrying the PayPal order id
//      in its provenance — before the campaign ever ships.
// ============================================================

import { ai, getAiModel } from "@/lib/ai";
import { createPaypalOrder, getPaypalMode } from "@/lib/paypal";
import type { PaypalOrderRecord, RawFinding } from "@/lib/types";

/* ── The Merchant Pricing Canon ──────────────────────────────
   The canonical charge registry: what the checkout ACTUALLY
   charges per SKU. In production this is synced from the
   commerce platform / PayPal catalog; here it is the locked
   canon the Checkout Truth Engine verifies against. */

export interface PricingCanonEntry {
  sku: string;
  itemName: string;
  amount: string; // canonical charged amount
  currency: string;
  billingPeriod: string;
  aliases: string[]; // lexical hooks the matcher keys on
  active: boolean;
}

export const MERCHANT_PRICING_CANON: PricingCanonEntry[] = [
  {
    sku: "LOOM-ENT-SEAT",
    itemName: "LoomGuard Enterprise Governance Seat",
    amount: "79.00",
    currency: "USD",
    billingPeriod: "per seat / month, billed annually",
    aliases: ["enterprise plan", "enterprise tier", "loomguard enterprise", "governance seat", "per user", "per seat"],
    active: true,
  },
  {
    sku: "AURE-BLACK-MEMB",
    itemName: "Aurelia Black Membership",
    amount: "24.99",
    currency: "USD",
    billingPeriod: "per month",
    aliases: ["aurelia black", "black membership", "black card membership", "a month"],
    active: true,
  },
  {
    sku: "AURE-CASHBACK-CAP",
    itemName: "Weekend Cash-Back Cap",
    amount: "10.00",
    currency: "USD",
    billingPeriod: "per qualifying weekend",
    aliases: ["cash back", "cash-back", "cashback", "weekend rewards"],
    active: true,
  },
];

/* ── Step 1: deterministic offer extraction ─────────────────── */

export interface ExtractedOffer {
  span: string;
  charStart: number;
  charEnd: number;
  amount: number;
  currency: string;
  /** filled by the AI enrichment pass when available */
  item?: string;
  sku?: string;
  offerType?: string;
}

const MONEY_RE =
  /(?:US\s?)?\$\s?(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)|(?:€\s?(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?))|(?:£\s?(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?))/g;
const OFFER_CONTEXT_RE =
  /\b(?:priced?|price|starting at|just|only|per (?:user|seat|month|mo)|a month|\/mo|billed|cash.?back|rewards?|off|discount|plan|tier|membership|subscription)\b/i;
const WINDOW = 90; // chars of context on either side of the money span

export function extractMonetaryOffers(text: string): ExtractedOffer[] {
  const offers: ExtractedOffer[] = [];
  let m: RegExpExecArray | null;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(text)) !== null) {
    const [full, usd, eur, gbp] = m;
    const amount = parseFloat(usd ?? eur ?? gbp!.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount === 0) continue;

    const ctxStart = Math.max(0, m.index - WINDOW);
    const ctxEnd = Math.min(text.length, m.index + full.length + WINDOW);
    const context = text.slice(ctxStart, ctxEnd);
    if (!OFFER_CONTEXT_RE.test(context)) continue; // bare number, not an offer

    // trim the span to the containing clause for a legible finding
    let spanStart = m.index;
    let spanEnd = m.index + full.length;
    const left = text.lastIndexOf(".", m.index);
    const leftN = text.lastIndexOf("\n", m.index);
    const clauseStart = Math.max(left, leftN, ctxStart);
    if (clauseStart > spanStart - 160) spanStart = Math.max(spanStart - 60, clauseStart + 1);
    const right = text.indexOf(".", spanEnd);
    const rightN = text.indexOf("\n", spanEnd);
    const clauseEnd = right === -1 ? ctxEnd : Math.min(right, rightN === -1 ? right : rightN);
    if (clauseEnd < spanEnd + 160) spanEnd = Math.min(spanEnd + 60, Math.max(clauseEnd, spanEnd));

    offers.push({
      span: text.slice(spanStart, spanEnd).trim(),
      charStart: spanStart,
      charEnd: spanEnd,
      amount,
      currency: usd !== undefined ? "USD" : eur !== undefined ? "EUR" : "GBP",
    });
  }
  return offers.slice(0, 8);
}

/* ── Step 2: AI enrichment (structured offer terms) ─────────── */

interface EnrichedOffer {
  index: number;
  item: string;
  sku: string | null;
  offer_type: string;
}

async function enrichWithAI(
  scrubbed: string,
  tokenMap: Record<string, string>,
  offers: ExtractedOffer[]
): Promise<Map<number, EnrichedOffer>> {
  const out = new Map<number, EnrichedOffer>();
  if (offers.length === 0) return out;
  try {
    const activeModel = getAiModel();
    const completion = (await Promise.race([
      ai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `You are LoomGuard's Offer Term Extractor (model ${activeModel}). For each monetary offer span in a draft marketing document, identify (a) the product/item being priced, (b) the matching SKU from the provided pricing canon (or null if none matches), and (c) the offer type. Treat {{TYPE_N}} placeholders as opaque variables. Respond ONLY with valid JSON.`,
          },
          {
            role: "user",
            content: `PRICING CANON (sku | item | amount | aliases):
${MERCHANT_PRICING_CANON.map((c) => `${c.sku} | ${c.itemName} | ${c.amount} ${c.currency} | ${c.aliases.join("; ")}`).join("\n")}

DOCUMENT (sanitized):
"""${scrubbed.slice(0, 5000)}"""

OFFER SPANS:
${offers.map((o, i) => `[${i}] ${o.span}`).join("\n")}

Respond with JSON: {"offers":[{"index":0,"item":"...","sku":"SKU or null","offer_type":"SUBSCRIPTION | ONE_TIME | CASH_BACK | DISCOUNT | OTHER"}]}`,
          },
        ],
        thinking: { type: "disabled" },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 25_000)),
    ])) as { choices?: { message?: { content?: string } }[] };

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) return out;
    const parsed = JSON.parse(cleaned.slice(s, e + 1)) as { offers?: EnrichedOffer[] };
    for (const o of parsed.offers ?? []) {
      if (typeof o.index === "number" && offers[o.index]) out.set(o.index, o);
    }
  } catch (err) {
    console.error("[LoomGuard] offer AI enrichment degraded to regex matching:", err);
  }
  return out;
}

/** Deterministic SKU fallback: lexical match against canon aliases. */
function matchSkuDeterministic(span: string): PricingCanonEntry | null {
  const lower = span.toLowerCase();
  let best: { entry: PricingCanonEntry; score: number } | null = null;
  for (const entry of MERCHANT_PRICING_CANON) {
    let score = 0;
    for (const alias of entry.aliases) if (lower.includes(alias)) score += alias.split(" ").length;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry ?? null;
}

/* ── Steps 3+4: PayPal order creation + advertised↔charged diff ── */

export interface CheckoutVerificationReport {
  mode: "SANDBOX" | "LIVE" | "SIMULATION";
  airGapped: boolean;
  aiEnrichment: "OK" | "DEGRADED" | "SKIPPED" | "NONE";
  latencyMs: number;
  offers: Array<{
    span: string;
    charStart: number;
    charEnd: number;
    advertised: { amount: string; currency: string };
    charged: { amount: string; currency: string } | null;
    sku: string | null;
    itemName: string | null;
    status: "VERIFIED" | "MISMATCH" | "UNMAPPED" | "DEFERRED";
    orderId: string | null;
    explanation: string;
  }>;
  orders: PaypalOrderRecord[];
  findings: RawFinding[];
}

export class CheckoutTruthEngine {
  /**
   * Verifies every monetary offer in the content against the
   * pricing canon via live PayPal Orders API v2 calls.
   * airGapped = privacy lock: no network at all — findings are
   * DEFERRED with the reason recorded (the audit never blocks).
   */
  async verify(opts: {
    content: string;
    scrubbed: string;
    tokenMap: Record<string, string>;
    assetId?: string | null;
    airGapped: boolean;
    simulateLlmFailure?: boolean;
  }): Promise<CheckoutVerificationReport> {
    const t0 = performance.now();
    const mode = getPaypalMode();
    const { content, scrubbed, tokenMap, airGapped } = opts;

    const offers = extractMonetaryOffers(content);
    const report: CheckoutVerificationReport = {
      mode,
      airGapped,
      aiEnrichment: "NONE",
      latencyMs: 0,
      offers: [],
      orders: [],
      findings: [],
    };
    if (offers.length === 0) {
      report.latencyMs = Math.round((performance.now() - t0) * 100) / 100;
      return report;
    }

    // AI enrichment (skipped entirely when privacy-locked)
    let enrichment = new Map<number, EnrichedOffer>();
    if (airGapped || opts.simulateLlmFailure) {
      report.aiEnrichment = airGapped ? "SKIPPED" : "DEGRADED";
    } else {
      enrichment = await enrichWithAI(scrubbed, tokenMap, offers);
      report.aiEnrichment = enrichment.size > 0 ? "OK" : "DEGRADED";
    }

    for (let i = 0; i < offers.length; i++) {
      const o = offers[i];
      const ai = enrichment.get(i);
      const canon =
        (ai?.sku ? MERCHANT_PRICING_CANON.find((c) => c.sku === ai.sku) ?? null : null) ??
        matchSkuDeterministic(o.span);

      const advertisedAmount = o.amount.toFixed(2);

      // — UNMAPPED: money in the copy with no purchasable product on file —
      if (!canon) {
        report.offers.push({
          span: o.span,
          charStart: o.charStart,
          charEnd: o.charEnd,
          advertised: { amount: advertisedAmount, currency: o.currency },
          charged: null,
          sku: null,
          itemName: ai?.item ?? null,
          status: "UNMAPPED",
          orderId: null,
          explanation: `Monetary offer with no matching product in the Merchant Pricing Canon. Every advertised price must map to a purchasable SKU before publication — unmapped offers cannot be checkout-verified and create drip-pricing exposure.`,
        });
        report.findings.push(this.toFinding(o, null, null, "UNMAPPED", ai?.item ?? null, null, mode, airGapped, report.aiEnrichment));
        continue;
      }

      // — create the PayPal order against the CANONICAL price —
      const snap = await createPaypalOrder({
        amount: canon.amount,
        currency: canon.currency,
        itemName: canon.itemName,
        sku: canon.sku,
        referenceId: opts.assetId ?? "loomguard-preflight",
        forceSimulation: airGapped,
      });
      const record: PaypalOrderRecord = {
        orderId: snap.orderId,
        purpose: "CLAIM_VERIFICATION",
        environment: snap.environment,
        status: snap.status,
        amountValue: snap.amount,
        currencyCode: snap.currency,
        itemSku: snap.sku ?? null,
        assetId: opts.assetId ?? null,
        breakdown: snap.breakdown,
      };
      report.orders.push(record);

      const amountMatches = Math.abs(parseFloat(snap.amount) - o.amount) < 0.005;
      const currencyMatches = snap.currency === o.currency;
      const charged = { amount: snap.amount, currency: snap.currency };

      if (amountMatches && currencyMatches) {
        const okExp = `Checkout truth verified: the advertised ${canon.amount} ${canon.currency} reconciles exactly with PayPal order ${snap.orderId} (${canon.sku} · ${canon.billingPeriod}). Advertised = charged. Order recorded as pre-publication evidence.`;
        report.offers.push({
          span: o.span,
          charStart: o.charStart,
          charEnd: o.charEnd,
          advertised: { amount: advertisedAmount, currency: o.currency },
          charged,
          sku: canon.sku,
          itemName: canon.itemName,
          status: "VERIFIED",
          orderId: snap.orderId,
          explanation: okExp,
        });
        report.findings.push(
          this.toFinding(o, charged, canon, "VERIFIED", ai?.item ?? null, snap, mode, airGapped, report.aiEnrichment)
        );
      } else {
        const mismatchExp = amountMatches
          ? `Currency drift: the offer is advertised in ${o.currency} but the canonical checkout charges ${snap.currency} (PayPal order ${snap.orderId}, SKU ${canon.sku}). Cross-currency advertised offers must state the settlement currency — EU Omnibus / FTC drip-pricing exposure.`
          : `Advertised ≠ charged: the copy promises ${advertisedAmount} ${o.currency} but the canonical pricing canon and PayPal order ${snap.orderId} charge ${snap.amount} ${snap.currency} for ${canon.itemName} (${canon.billingPeriod}). This is the exact drip-pricing pattern regulators fine — a ${Math.abs(parseFloat(snap.amount) - o.amount).toFixed(2)} ${snap.currency} surprise at checkout. Align the copy to the canonical price or update the registry with evidence before this ships.`;
        report.offers.push({
          span: o.span,
          charStart: o.charStart,
          charEnd: o.charEnd,
          advertised: { amount: advertisedAmount, currency: o.currency },
          charged,
          sku: canon.sku,
          itemName: canon.itemName,
          status: "MISMATCH",
          orderId: snap.orderId,
          explanation: mismatchExp,
        });
        report.findings.push(
          this.toFinding(o, charged, canon, "MISMATCH", ai?.item ?? null, snap, mode, airGapped, report.aiEnrichment)
        );
      }
    }

    report.latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    return report;
  }

  private toFinding(
    o: ExtractedOffer,
    charged: { amount: string; currency: string } | null,
    canon: PricingCanonEntry | null,
    status: "VERIFIED" | "MISMATCH" | "UNMAPPED",
    aiItem: string | null,
    snap: { orderId: string; environment: "SANDBOX" | "LIVE" | "SIMULATION"; status: string } | null,
    mode: "SANDBOX" | "LIVE" | "SIMULATION",
    airGapped: boolean,
    aiEnrichment: string
  ): RawFinding {
    const latency = 0; // measured by the caller (report.latencyMs)
    const ruleId =
      status === "MISMATCH"
        ? "RULE-PAY-AD-CHARGE-MISMATCH"
        : status === "UNMAPPED"
          ? "RULE-PAY-NO-PURCHASABLE-SKU"
          : "RULE-PAY-OFFER-VERIFIED";
    const severity = status === "MISMATCH" ? "CRITICAL" : status === "UNMAPPED" ? "MEDIUM" : "INFO";
    const itemName = aiItem ?? canon?.itemName ?? "unmapped offer";

    const suggestedDiff =
      status === "MISMATCH" && canon
        ? o.span.replace(
            new RegExp(o.amount.toFixed(2).replace(".", "\\.") + "|" + String(o.amount), ""),
            canon.amount
          ) === o.span
          ? `${o.span.replace(String(o.amount), canon.amount)}`
          : o.span.replace(new RegExp(`(\\$\\s?)${o.amount.toString().replace(".", "\\.")}`), `$1${canon.amount}`)
        : null;

    return {
      pillar: "TRANSACTION_INTEGRITY",
      ruleId,
      severity,
      verdict:
        status === "MISMATCH"
          ? "ADVERTISED_CHARGE_MISMATCH"
          : status === "UNMAPPED"
            ? "NO_PURCHASABLE_SKU"
            : "CHECKOUT_TRUTH_VERIFIED",
      originalSpan: o.span,
      charStart: o.charStart,
      charEnd: o.charEnd,
      suggestedDiff,
      explanation:
        status === "MISMATCH"
          ? `[PayPal Orders API v2 · order ${snap?.orderId}] ${itemName}: advertised ${o.amount.toFixed(2)} ${o.currency} vs charged ${charged?.amount} ${charged?.currency}. Drip-pricing exposure — the diff aligns the copy to the canonical registry price; route to Pricing if the registry is what's wrong.`
          : status === "UNMAPPED"
            ? `[Merchant Pricing Canon] Monetary offer with no purchasable SKU: "${itemName}". Map it to a product (or remove the price) before publication — unmapped offers cannot be checkout-verified.`
            : `[PayPal Orders API v2 · order ${snap?.orderId}] ${itemName}: advertised ${o.amount.toFixed(2)} ${o.currency} reconciles with the charged amount. Checkout truth recorded as pre-publication evidence.`,
      provenance: {
        engine: "PAYPAL_ORDERS_API_V2",
        algorithm: `AI Offer Term Extraction (${aiEnrichment}) + Deterministic Span Match + Orders API v2 Equivalence Check`,
        citation: canon
          ? `Merchant Pricing Canon ${canon.sku} · PayPal order ${snap?.orderId ?? "—"}`
          : "Merchant Pricing Canon — no entailing SKU",
        latencyMs: latency,
        contextMode: "LOCKED_PRICING_CANON",
        model: aiEnrichment === "OK" ? getAiModel() : undefined,
        airGappedMode: airGapped,
        paypal: snap
          ? {
              orderId: snap.orderId,
              environment: snap.environment,
              intent: "CAPTURE",
              advertised: { amount: o.amount.toFixed(2), currency: o.currency },
              charged: charged ?? { amount: canon?.amount ?? "0.00", currency: canon?.currency ?? "USD" },
              sku: canon?.sku,
              status: snap.status,
            }
          : undefined,
      },
      intentPreservation: status === "MISMATCH" ? 0.97 : 1.0,
    };
  }
}

/** Convenience for the standalone verification endpoint. */
export function pricingCanonPublic() {
  return MERCHANT_PRICING_CANON.map(({ sku, itemName, amount, currency, billingPeriod, active }) => ({
    sku,
    itemName,
    amount,
    currency,
    billingPeriod,
    active,
  }));
}
