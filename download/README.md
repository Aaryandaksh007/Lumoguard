# LoomGuard — Hackathon Delivery Package

**The Fabric of Trust: pre-publication brand governance with a two-stage
deterministic × AI verification engine — and checkout truth, verified live
through the PayPal Orders API.**

---

## 📦 Deliverables

| File | What it is |
|------|------------|
| `loomguard-demo.mp4` | **2:42 cinematic demo film** (1080p30, H.264 + AAC voiceover) — the full movie-trailer journey from the 23:47 incident through the seven pillars, the surgical diff theater (including the PayPal drip-pricing catch), into the live product run. Under the 3-minute limit. |
| `LOOMGUARD_VOICEOVER_SCRIPT.md` | The 2-minute voiceover script (7 timed sections, TTS-ready) with the compliance note mapping each judging criterion to where it appears. |

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
2. **Proofing Studio** → select *“Aurelia Black — Spring Rewards Email”* → **Run Pre-Publication Audit**.
3. Watch the **Checkout Truth Engine** panel: the $19-advertised vs $24.99-charged
   drip is caught with a PayPal order on record; the $10 cash-back offer
   verifies; the $200 Concierge tier flags unmapped.
4. Open **Trace Provenance** on any Transaction Integrity finding → the PayPal
   Order Receipt (order ID, environment, advertised vs. charged, SKU, status).
5. The header shows the live PayPal mode badge; the Audit Trail records the
   PayPal orders with every run.

**To go live with PayPal:** create a REST app at
<https://developer.paypal.com/dashboard/applications>, paste the Client ID and
Secret into `.env` (`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`), and re-run
any audit.
