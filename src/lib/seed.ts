// ============================================================
// LoomGuard — Brand Canon & Demo Packet Seeder
// Idempotent: safe to call on every request; only seeds empty
// tables. The demo "Product Launch Campaign Packet" contains
// the six canonical planted errors from the demo script:
// 1. Deprecated product name (InkLoom Studio)
// 2. Unsubstantiated superlative claim (replaces legal team, 100%)
// 3. Secret project codename (Project Chronos)
// 4. Off-brand banner color (#2563EB, ΔE00 = 7.13 drift)
// 5. Squashed logo with encroaching text
// 6. Low-contrast #60A5FA on #F8FAFC (2.43:1)
// ============================================================

import { db } from "@/lib/db";

export const DEMO_PRESS_RELEASE = `# Announcing InkLoom Studio: The Next Era of Brand Governance

Today we are thrilled to unveil InkLoom Studio, our enterprise publication platform. Built under the confidential initiative Project Chronos, our new engine replaces your entire legal team with 100% accuracy, eliminating every compliance bottleneck overnight.

Inkloom AI verification executes Stage 1 deterministic passes in under 50 milliseconds. The Enterprise plan is available starting today at $49 per user monthly billed annually. Delve into our documentation to harness the power of seamless brand compliance.

<div class="cta-banner">
  <p>Learn more about our governance architecture: <a href="#">click here</a></p>
  <img src="brand_mark.png" alt="image" />
</div>`;

export const DEMO_VISUAL_META = {
  assetName: "Hero_Promotional_Banner_Q1.png",
  extractedColors: [
    { name: "Surface Background", hex: "#F8FAFC" },
    { name: "Primary Banner Accent", hex: "#2563EB" },
  ],
  colorPairs: [
    {
      fg: "#60A5FA",
      bg: "#F8FAFC",
      elementName: "Hero Subtitle Text",
      isLarge: false,
    },
  ],
  logoBox: {
    width: 120,
    height: 50,
    adjacentTextDist: 4.5,
  },
};

// ── Demo asset 2: the Checkout Truth Engine showcase ──────────
// Planted errors (PayPal Orders API v2 × AI):
// 7. Drip pricing: "$19 a month" advertised vs AURE-BLACK-MEMB
//    canonical charge $24.99 (CRITICAL mismatch)
// 8. Verified offer: "$10 cash back" reconciles with
//    AURE-CASHBACK-CAP $10.00 (checkout truth recorded)
// 9. Unmapped offer: "$200 a year" Concierge tier has no SKU
// Plus voice clichés for the deterministic pillar.
export const DEMO_REWARDS_EMAIL = `# Aurelia Black — Spring Rewards Refresh

Spring arrives early for members. This season, the Aurelia Black membership is just $19 a month — our lowest spring rate ever — with every benefit unlocked from day one.

Members earn $10 cash back every weekend, credited automatically to their Aurelia wallet by Monday morning. No caps, no asterisks, no fine print.

For a limited time, add the Concierge tier for $200 a year and unlock white-glove travel planning around the clock.

The new Aurelia Black Card ensures you save more. Delve into the details and harness the power of seamless rewards.`;

export async function ensureSeeded(): Promise<void> {
  const termCount = await db.canonTerm.count();

  if (termCount === 0) {
    await db.canonTerm.createMany({
      data: [
        {
          termId: "TERM-001",
          surfaceForm: "InkLoom",
          ruleType: "CASE_SENSITIVE",
          replacementToken: "Inkloom AI",
          allowedContextRegex: "formerly known as",
          rationaleCitation:
            "Brand Canon §1.2: The official brand mark is 'Inkloom AI' with standard title casing — never 'InkLoom'.",
        },
        {
          termId: "TERM-002",
          surfaceForm: "InkLoom Studio",
          ruleType: "DEPRECATED",
          replacementToken: "Inkloom Manuscript Studio",
          rationaleCitation:
            "Product Taxonomy v2.4: 'InkLoom Studio' was renamed to 'Inkloom Manuscript Studio' in Q1 2026.",
        },
        {
          termId: "TERM-003",
          surfaceForm: "AI magic",
          ruleType: "FORBIDDEN",
          replacementToken: "intelligent verification",
          rationaleCitation:
            "Brand Canon §3.1: Prohibits mystical AI jargon; use grounded technical descriptions.",
        },
      ],
    });
  }

  if ((await db.canonVoice.count()) === 0) {
    await db.canonVoice.create({
      data: {
        voiceId: "VOICE-001",
        personaName: "Engineering-Grade Authoritative & Grounded",
        fleschKincaidMin: 7.0,
        fleschKincaidMax: 13.0,
        passiveVoiceMaxPct: 15.0,
        approvedSamples: JSON.stringify([
          "Inkloom AI couples deterministic verification with retrieval-grounded semantic passes to guarantee brand integrity.",
          "Every proposal is presented as a surgical diff requiring explicit human authorization.",
        ]),
        forbiddenCliches: JSON.stringify([
          "delve into",
          "testament to",
          "game-changer",
          "revolutionary paradigm",
          "harness the power of",
          "in today's fast-paced world",
          "cutting-edge innovation",
          "seamlessly integrate",
          "embark on a journey",
        ]),
      },
    });
  }

  if ((await db.canonFact.count()) === 0) {
    await db.canonFact.createMany({
      data: [
        {
          factId: "FACT-001",
          claimAssertion:
            "Inkloom AI verification executes Stage 1 deterministic passes in under 50 milliseconds.",
          atomicBreakdown: JSON.stringify([
            "Inkloom AI features a two-stage pipeline",
            "Stage 1 deterministic passes run in sub-50ms",
          ]),
          status: "CANONICAL",
          effectiveDate: "2026-01-01",
          expirationDate: "2027-01-01",
          evidenceDocUrl: "https://inkloom.ai/benchmarks/engine-v3",
        },
        {
          factId: "FACT-002",
          claimAssertion:
            "The LoomGuard Enterprise plan is priced at $79 per seat per month, billed annually.",
          atomicBreakdown: JSON.stringify([
            "Enterprise tier price is $79/user/month",
            "Billing cycle is annual",
          ]),
          status: "CANONICAL",
          effectiveDate: "2026-01-15",
          expirationDate: "2027-01-15",
          evidenceDocUrl: "https://inkloom.ai/pricing/enterprise-2026",
        },
        {
          factId: "FACT-003",
          claimAssertion:
            "The LoomGuard Enterprise plan was priced at $49 per seat per month (legacy 2024 pricing).",
          atomicBreakdown: JSON.stringify(["Legacy tier price was $49/user/month"]),
          status: "SUPERSEDED",
          effectiveDate: "2024-01-01",
          expirationDate: "2025-12-31",
          evidenceDocUrl: "https://inkloom.ai/archive/pricing-2024",
          supersededByFactId: "FACT-002",
        },
        {
          factId: "FACT-004",
          claimAssertion:
            "LoomGuard will provide real-time print dieline checking and CMYK spot-color separation.",
          atomicBreakdown: JSON.stringify([
            "Print dieline automation",
            "CMYK color separation",
          ]),
          status: "ROADMAP_ASPIRATIONAL",
          effectiveDate: "2026-10-01",
          expirationDate: "2027-12-31",
          evidenceDocUrl: "https://inkloom.ai/roadmap/h2-2026",
        },
        {
          factId: "FACT-005",
          claimAssertion:
            "LoomGuard assists compliance teams by flagging regulatory and FTC claims, but does not substitute for certified legal counsel.",
          atomicBreakdown: JSON.stringify([
            "LoomGuard assists compliance workflows",
            "LoomGuard is not a human attorney substitute",
          ]),
          status: "CANONICAL",
          effectiveDate: "2026-01-01",
          expirationDate: "2027-01-01",
          evidenceDocUrl: "https://inkloom.ai/legal/compliance-boundaries",
          requiredDisclaimerText:
            "Notice: LoomGuard is an assistive brand governance system and does not constitute certified legal counsel or formal statutory indemnification.",
        },
      ],
    });
  }

  if ((await db.canonVisual.count()) === 0) {
    await db.canonVisual.createMany({
      data: [
        { tokenName: "Brand-Blue-700", hexValue: "#1D4ED8", role: "PRIMARY", isBrandCore: true },
        { tokenName: "Brand-Slate-900", hexValue: "#0F172A", role: "TEXT", isBrandCore: true },
        { tokenName: "Brand-Slate-50", hexValue: "#F8FAFC", role: "SURFACE", isBrandCore: true },
        { tokenName: "Brand-White", hexValue: "#FFFFFF", role: "SURFACE", isBrandCore: true },
        { tokenName: "Brand-Sky-600", hexValue: "#0284C7", role: "ACCENT", isBrandCore: true },
      ],
    });
  }

  if ((await db.canonLogo.count()) === 0) {
    await db.canonLogo.create({
      data: {
        logoId: "LOGO-001",
        assetName: "Inkloom AI Canonical Master Mark",
        canonicalWidth: 200,
        canonicalHeight: 50,
        aspectRatio: 4.0,
        clearSpaceRatio: 0.25,
      },
    });
  }

  if ((await db.canonSecret.count()) === 0) {
    await db.canonSecret.createMany({
      data: [
        { codename: "Project Chronos" },
        { codename: "Project Hyperion" },
        { codename: "Project Titan" },
        { codename: "Project Olympus" },
        { codename: "Project Prometheus" },
      ],
    });
  }

  if ((await db.guidelineTelemetry.count()) === 0) {
    await db.guidelineTelemetry.createMany({
      data: [
        {
          ruleId: "RULE-TERM-001",
          ruleName: "Standard Mark Casing (Inkloom AI, never InkLoom)",
          pillar: "TERMINOLOGY",
          triggersCount: 40,
          overridesCount: 3,
          disputesCount: 2,
          meanResolutionHours: 1.5,
        },
        {
          ruleId: "RULE-VOICE-002",
          ruleName: "Bold Challenger Tone with Humble Understatement",
          pillar: "VOICE",
          triggersCount: 35,
          overridesCount: 22,
          disputesCount: 18,
          meanResolutionHours: 36.0,
        },
        {
          ruleId: "RULE-FACT-002",
          ruleName: "Current Enterprise Pricing Tier Substantiation",
          pillar: "FACT_CLAIM",
          triggersCount: 28,
          overridesCount: 4,
          disputesCount: 3,
          meanResolutionHours: 2.1,
        },
        {
          ruleId: "RULE-VIS-003",
          ruleName: "Primary Palette Consistency (CIEDE2000 ΔE00 < 3.0)",
          pillar: "VISUAL_GEOMETRY",
          triggersCount: 19,
          overridesCount: 2,
          disputesCount: 1,
          meanResolutionHours: 0.8,
        },
        {
          ruleId: "RULE-WCAG-001",
          ruleName: "Strict WCAG 2.2 AA Contrast Ratio (≥ 4.5:1)",
          pillar: "ACCESSIBILITY_WCAG",
          triggersCount: 24,
          overridesCount: 3,
          disputesCount: 2,
          meanResolutionHours: 1.2,
        },
      ],
    });
    await recomputeGasScores();
  }

  if ((await db.asset.count()) === 0) {
    await db.asset.create({
      data: {
        title: "Product Launch Campaign Packet — Press Release",
        assetType: "MARKDOWN",
        content: DEMO_PRESS_RELEASE,
        visualMeta: JSON.stringify(DEMO_VISUAL_META),
        status: "DRAFT",
      },
    });
  }

  // Second demo asset — seeded independently so existing databases pick it up.
  const hasRewardsEmail = await db.asset.findFirst({
    where: { title: "Aurelia Black — Spring Rewards Email" },
    select: { id: true },
  });
  if (!hasRewardsEmail) {
    await db.asset.create({
      data: {
        title: "Aurelia Black — Spring Rewards Email",
        assetType: "MARKDOWN",
        content: DEMO_REWARDS_EMAIL,
        status: "DRAFT",
      },
    });
  }
}

/** Recomputes GAS + classification for every telemetry row. */
export async function recomputeGasScores(): Promise<void> {
  const rows = await db.guidelineTelemetry.findMany();
  for (const r of rows) {
    const n = Math.max(0, r.triggersCount);
    if (n === 0) continue;
    const overrideRate = Math.min(1, r.overridesCount / n);
    const disputeRate = Math.min(1, r.disputesCount / n);
    const latencyFactor = Math.min(1, r.meanResolutionHours / 48);
    const gas =
      Math.round(
        Math.log(1 + n) * (0.5 * overrideRate + 0.3 * disputeRate + 0.2 * latencyFactor) * 1000
      ) / 1000;
    await db.guidelineTelemetry.update({
      where: { id: r.id },
      data: { gasScore: gas, classification: gas >= 1.0 ? "UNCLEAR_GUIDELINE" : "HABITUAL_MISTAKE" },
    });
  }
}

/** Loads the canon in engine-ready form. */
export async function loadCanon() {
  const [terms, voice, facts, visuals, logo, secrets] = await Promise.all([
    db.canonTerm.findMany(),
    db.canonVoice.findFirst(),
    db.canonFact.findMany(),
    db.canonVisual.findMany(),
    db.canonLogo.findFirst(),
    db.canonSecret.findMany(),
  ]);

  const fallbackLogo = {
    assetName: "Canonical Mark",
    canonicalWidth: 200,
    canonicalHeight: 50,
    aspectRatio: 4.0,
    clearSpaceRatio: 0.25,
  };

  return {
    terms: terms.map((t) => ({
      termId: t.termId,
      surfaceForm: t.surfaceForm,
      ruleType: t.ruleType,
      replacementToken: t.replacementToken,
      allowedContextRegex: t.allowedContextRegex,
      rationaleCitation: t.rationaleCitation,
    })),
    voice: {
      personaName: voice?.personaName ?? "Engineering-Grade Authoritative",
      fleschKincaidMin: voice?.fleschKincaidMin ?? 7,
      fleschKincaidMax: voice?.fleschKincaidMax ?? 13,
      passiveVoiceMaxPct: voice?.passiveVoiceMaxPct ?? 15,
      approvedSamples: JSON.parse(voice?.approvedSamples ?? "[]") as string[],
      forbiddenCliches: JSON.parse(voice?.forbiddenCliches ?? "[]") as string[],
    },
    facts: facts.map((f) => ({
      factId: f.factId,
      claimAssertion: f.claimAssertion,
      atomicBreakdown: JSON.parse(f.atomicBreakdown ?? "[]") as string[],
      status: f.status as "CANONICAL" | "SUPERSEDED" | "ROADMAP_ASPIRATIONAL",
      effectiveDate: f.effectiveDate,
      expirationDate: f.expirationDate,
      evidenceDocUrl: f.evidenceDocUrl,
      requiredDisclaimerText: f.requiredDisclaimerText,
      supersededByFactId: f.supersededByFactId,
    })),
    swatches: visuals.map((v) => ({
      tokenName: v.tokenName,
      hexValue: v.hexValue,
      role: v.role,
      isBrandCore: v.isBrandCore,
    })),
    logoRules: logo
      ? {
          assetName: logo.assetName,
          canonicalWidth: logo.canonicalWidth,
          canonicalHeight: logo.canonicalHeight,
          aspectRatio: logo.aspectRatio,
          clearSpaceRatio: logo.clearSpaceRatio,
        }
      : fallbackLogo,
    codenames: secrets.map((s) => s.codename),
  };
}
