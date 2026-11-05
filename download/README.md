# LoomGuard — Hackathon Delivery Package

**The Fabric of Trust: pre-publication brand governance with a two-stage
deterministic × AI verification engine — and checkout truth, verified live
through the PayPal Orders API.**

---

## 📦 Deliverables

| File | What it is |
|------|------------|
| `loomguard-demo.mp4` | **2:33 product demo film** (1080p30, H.264 + AAC) — a clear-voiced, maximum-substance walkthrough of the working prototype: the film cold open (10 s), then the live product for the entire runtime — the Proofing Studio audit run (two-stage engine, ~6 s live LLM pass), the findings feed with surgical diffs and intent-preservation scores, the **PayPal Checkout Truth Engine catching $19-advertised vs $24.99-charged drip pricing**, the trace-provenance drawer with the PayPal order receipt, the review-workflow approval, Governance Insights, and the append-only Audit Trail. Voice mixed to **−16.5 LUFS** for broadcast-clear narration. Under the 3-minute limit. |
| `LOOMGUARD_VOICEOVER_SCRIPT.md` | The narration script (10 timed sections) with the compliance map tying each judging criterion to the moment it appears on screen. |

---

## 🎬 What the video shows (minute map)

| Time | Beat |
|------|------|
| 0:00–0:16 | Film cold open — "Every brand is a fabric" → SKIP → PRODUCT |
| 0:16–0:30 | Proofing Studio: the Aurelia Black spring-rewards draft, empty audit bay |
| 0:31–0:50 | **Run Pre-Publication Audit** — Stage 1 deterministic (<50 ms) + Stage 2 semantic AI pass (live, ~6 s) |
| 0:50–1:11 | The verdict: readiness 0/100, 9 findings — superseded rate, unsubstantiated "lowest rate ever" |
| 1:12–1:26 | Surgical diff theater — 95 % intent preservation; below the gate, humans take over |
| 1:27–1:52 | **PayPal Checkout Truth Engine** — DRIP PRICING ($19 advertised ≠ $24.99 charged), verified order, no-SKU flag; trace drawer → **PayPal Order Receipt** + full provenance (engine, model, prompt, latency) |
| 1:52–2:06 | Review Workflow — Brand Manager approves for publish (toast + state change) |
| 2:06–2:26 | Governance Insights (friction quadrant, Canon Refiner) → append-only Audit Trail |
| 2:26–2:33 | End card — *LoomGuard. AI with receipts. The fabric of trust.* |

---

## 🏆 Hackathon criteria — how they're satisfied

### 1. PayPal technology, meaningfully integrated
**The Checkout Truth Engine (Pillar 7 — Transaction Integrity).**
The most expensive class of brand failure lives in the gap between what a
campaign *advertises* and what the checkout *charges* (drip pricing — FTC §5 /
EU Omnibus territory). LoomGuard closes it:

1. A deterministic scanner extracts every monetary offer from the draft (zero hallucination).
2. An AI enrichment pass (external LLM, on the scrubbed payload) structures each offer → `{item, amount, currency, sku}`.
3. **PayPal Orders API v2** (OAuth2 client-credentials, module-cached token) creates a real order against the Merchant Pricing Canon.
4. Advertised vs. charged is compared field-by-field; drift becomes a **CRITICAL finding carrying the PayPal order ID in its provenance** — *before the campaign ships*.

Three verdicts demo live: `VERIFIED` (advertised = charged), `DRIP PRICING`
(advertised ≠ charged → CRITICAL), `NO SKU` (unmapped offer). Every order is
persisted as a tamper-evident receipt (`PaypalOrder` records joined to audit
runs) and surfaced in the **Context Trace** drawer as a "PayPal Order Receipt".

**Credential handling** — the integration is env-driven and degrades
gracefully: with `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` unset it runs a
deterministic offline *simulation* (clearly labeled `SIMULATION` in the header
badge and every receipt). The moment real keys land in `.env` — placeholders
are already documented there — the identical code path talks to
`api-m.sandbox.paypal.com` with zero code changes (`PAYPAL_ENV=sandbox|live`).

### 2. AI, meaningfully incorporated
- **Stage-2 semantic pass** — retrieval-grounded claim verification against the
  living Fact Ledger (FActScore-style decomposition + LLM entailment), executed
  only on the reversible confidentiality-shield-scrubbed payload, with
  deterministic fallback when the AI leg is down or air-gapped.
- **AI offer-term extraction** — the LLM leg of the Checkout Truth Engine above.
- **Guideline Ambiguity Score refiner** — synthesizes human override history
  into proposed canon rewrites via LLM.
- **Zero-hallucination posture** — deterministic engines anchor every
  syntactic claim; AI only *proposes*, humans *dispose*, and every finding
  carries full model/prompt/latency provenance (the Context Trace drawer).

---

## ▶️ Running it

The app runs at the preview panel (dev server on port 3000):

1. Land on the film → **SKIP → PRODUCT** (or watch the three acts).
2. **Proofing Studio** → *“Aurelia Black — Spring Rewards Email”* → **Run Pre-Publication Audit**.
3. Watch the **Checkout Truth Engine** panel: the $19-advertised vs $24.99-charged
   drip is caught with a PayPal order on record; the $10 cash-back offer
   verifies; the Concierge tier flags unmapped.
4. Open **Trace Provenance** on any Transaction Integrity finding → the PayPal
   Order Receipt (order ID, environment, advertised vs. charged, SKU, status).
5. The header shows the live PayPal mode badge; the Audit Trail records the
   PayPal orders with every run.

**To go live with PayPal:** create a REST app at
<https://developer.paypal.com/dashboard/applications>, paste the Client ID and
Secret into `.env` (`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`), and re-run
any audit.
