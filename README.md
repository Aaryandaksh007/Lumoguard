# LoomGuard — Hackathon Delivery Package

**The Fabric of Trust: pre-publication brand governance with a two-stage deterministic × AI verification engine — and checkout truth, verified live through the PayPal Orders API.**

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Aaryandaksh007/Lumoguard.git
cd Lumoguard
bun install   # or npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your credentials:
- **NVIDIA NIM API Key**: Get a key with free credits at [build.nvidia.com](https://build.nvidia.com) (powered by `meta/muse-glimmer-30b`).
- **PayPal Credentials (Optional)**: Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from [developer.paypal.com](https://developer.paypal.com). If omitted, runs in offline `SIMULATION` mode automatically.

### 3. Setup Database & Run
```bash
bun run db:generate   # or npm run db:generate
bun run dev           # or npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📦 Deliverables & Features

| Feature | Description |
|---------|-------------|
| **Two-Stage Hybrid Engine** | Stage 1 deterministic (<50ms) + Stage 2 semantic AI pass (~6s live LLM pass). |
| **PayPal Checkout Truth Engine** | Catches advertised vs charged drip pricing using the **PayPal Orders API v2**. |
| **Context Trace Provenance** | Every finding carries full model, prompt version, latency, and PayPal order receipts. |
| **Surgical Diff Theater** | Generates proposed inline corrections with computed intent-preservation metrics. |
| **Governance Insights & Canon Refiner** | Identifies guideline ambiguity and synthesizes rule upgrades from human overrides. |
| **Append-Only Audit Trail** | Tamper-evident log of all asset changes, preflight runs, and reviewer actions. |

---

## 🏆 Hackathon Criteria & Technical Architecture

### 1. PayPal Technology, Meaningfully Integrated
**The Checkout Truth Engine (Pillar 7 — Transaction Integrity).**
The most expensive class of brand failure lives in the gap between what a campaign *advertises* and what the checkout *charges* (drip pricing — FTC §5 / EU Omnibus territory):

1. **Deterministic Scan**: Extracts monetary offer spans and currency figures from the draft.
2. **AI Enrichment Pass**: Structures each offer (`{ item, amount, currency, sku }`) against the Merchant Pricing Canon.
3. **PayPal Orders API v2**: Creates a verified order via OAuth2 client credentials against the sandbox (or live environment).
4. **Discrepancy Detection**: Advertised vs charged is compared field-by-field. Drift is flagged as a **CRITICAL finding** carrying the PayPal order ID in its tamper-evident receipt.

### 2. AI & Zero-Hallucination Architecture
- **NVIDIA NIM Integration**: Fast, low-latency reasoning and semantic grounding via NVIDIA's OpenAI-compatible endpoints (`meta/muse-glimmer-30b`).
- **Stage-2 Semantic Pass**: Retrieval-grounded claim verification against the living Fact Ledger (FActScore decomposition + entailment).
- **Presidio-Style Privacy Shield**: Confidential codenames and sensitive data are masked into reversible tokens (`{{SECRET_CODENAME}}`) before transmission to any external AI, and restored on return.
- **Guideline Ambiguity Score (GAS) Refiner**: Synthesizes reviewer override friction into actionable brand rule upgrades.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Frontend**: React 19, Tailwind CSS v4, Radix UI, Framer Motion, Lucide Icons
- **Database & ORM**: SQLite, Prisma ORM
- **APIs & Integrations**: PayPal Orders API v2, NVIDIA NIM Inference API

