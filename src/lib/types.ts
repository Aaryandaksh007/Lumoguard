// ============================================================
// LoomGuard — Shared Types (engines ↔ API ↔ frontend)
// ============================================================

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type Pillar =
  | "TERMINOLOGY"
  | "VOICE"
  | "FACT_CLAIM"
  | "TRANSACTION_INTEGRITY"
  | "VISUAL_GEOMETRY"
  | "ACCESSIBILITY_WCAG"
  | "CONFIDENTIALITY";

export type WorkflowRole =
  | "CREATOR"
  | "BRAND_MANAGER"
  | "LEGAL_COMPLIANCE"
  | "GOVERNANCE_ADMIN";

export type AssetStatus =
  | "DRAFT"
  | "PREFLIGHT_CHECKED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED_FOR_PUBLISH";

export type OverrideReason =
  | "INTENTIONAL_STYLE"
  | "UNCLEAR_GUIDELINE"
  | "APPROVED_EXCEPTION";

/** Context Trace provenance attached to every finding (Inkloom Trace Button). */
export interface Provenance {
  engine:
    | "DETERMINISTIC_ENGINE_LOCAL"
    | "EXTERNAL_AI_SERVICE"
    | "MINICHECK_ENTAILMENT_LOCAL"
    | "MICROSOFT_PRESIDIO_REVERSIBLE_PROXY"
    | "PAYPAL_ORDERS_API_V2";
  algorithm: string;
  citation?: string;
  latencyMs: number;
  contextMode: string;
  // External AI service details
  model?: string;
  promptVersion?: string;
  retrievedClauses?: { id: string; text: string; retrieval: "LOCKED" | "DYNAMIC" }[];
  // Confidentiality shield audit proof
  sanitizedPayloadPreview?: string;
  airGappedMode?: boolean;
  // PayPal Orders API v2 verification proof
  paypal?: {
    orderId: string;
    environment: "SANDBOX" | "LIVE" | "SIMULATION";
    intent: string;
    advertised: { amount: string; currency: string };
    charged: { amount: string; currency: string };
    sku?: string;
    status: string;
  };
}

export interface DiffChunk {
  type: "equal" | "remove" | "add";
  text: string;
}

export interface RawFinding {
  pillar: Pillar;
  ruleId: string;
  severity: Severity;
  verdict?: string;
  originalSpan: string;
  charStart: number;
  charEnd: number;
  suggestedDiff?: string | null;
  explanation: string;
  provenance: Provenance;
  intentPreservation: number;
  diffChunks?: DiffChunk[];
  autoResolvedToken?: {
    tokenName: string;
    hex: string;
    contrastRatio: number;
    deltaE00: number;
  };
  contrastRatio?: number;
  requiredContrastRatio?: number;
  apcaLc?: number;
  placeholderToken?: string;
}

export interface TerminologyRuleData {
  termId: string;
  surfaceForm: string;
  ruleType: string;
  replacementToken?: string | null;
  allowedContextRegex?: string | null;
  rationaleCitation: string;
}

export interface VoiceSpecData {
  personaName: string;
  fleschKincaidMin: number;
  fleschKincaidMax: number;
  passiveVoiceMaxPct: number;
  approvedSamples: string[];
  forbiddenCliches: string[];
}

export interface FactData {
  factId: string;
  claimAssertion: string;
  atomicBreakdown: string[];
  status: "CANONICAL" | "SUPERSEDED" | "ROADMAP_ASPIRATIONAL";
  effectiveDate?: string | null;
  expirationDate?: string | null;
  evidenceDocUrl?: string | null;
  requiredDisclaimerText?: string | null;
  supersededByFactId?: string | null;
}

export interface SwatchData {
  tokenName: string;
  hexValue: string;
  role: string;
  isBrandCore: boolean;
}

export interface LogoRules {
  assetName: string;
  canonicalWidth: number;
  canonicalHeight: number;
  aspectRatio: number;
  clearSpaceRatio: number;
}

export interface VisualColorPair {
  fg: string;
  bg: string;
  elementName: string;
  isLarge: boolean;
}

export interface VisualLogoBox {
  width: number;
  height: number;
  adjacentTextDist: number;
}

export interface VisualMeta {
  assetName?: string;
  extractedColors?: { name: string; hex: string }[];
  colorPairs?: VisualColorPair[];
  logoBox?: VisualLogoBox;
  headline?: string;
}

export interface AuditSummary {
  runId: string;
  readinessScore: number;
  stage1LatencyMs: number;
  stage2LatencyMs: number;
  totalLatencyMs: number;
  llmStatus: string;
  llmModel?: string | null;
  promptVersion?: string | null;
  findingsByPillar: Record<string, number>;
  findingsBySeverity: Record<string, number>;
  scrubbedContent: string;
  tokenMap: Record<string, string>;
  paypalStatus?: string;
  paypalLatencyMs?: number;
}

export interface AuditResult extends AuditSummary {
  findings: RawFinding[];
  paypalOrders?: PaypalOrderRecord[];
}

/** A PayPal order created during verification or billing (Orders API v2). */
export interface PaypalOrderRecord {
  orderId: string;
  purpose: "CLAIM_VERIFICATION" | "SEAT_SUBSCRIPTION";
  environment: "SANDBOX" | "LIVE" | "SIMULATION";
  status: string;
  amountValue: string;
  currencyCode: string;
  itemSku?: string | null;
  assetId?: string | null;
  breakdown: Record<string, unknown>;
}

export const PILLAR_LABELS: Record<Pillar, string> = {
  TERMINOLOGY: "Terminology & Lexicon",
  VOICE: "Tone, Voice & Messaging",
  FACT_CLAIM: "Fact & Claim Substantiation",
  TRANSACTION_INTEGRITY: "Transaction Integrity (PayPal)",
  VISUAL_GEOMETRY: "Visual Geometry & Palette",
  ACCESSIBILITY_WCAG: "Accessibility (WCAG 2.2)",
  CONFIDENTIALITY: "Confidentiality Protection",
};

export const ROLE_LABELS: Record<WorkflowRole, string> = {
  CREATOR: "Creator",
  BRAND_MANAGER: "Brand Manager",
  LEGAL_COMPLIANCE: "Legal & Compliance",
  GOVERNANCE_ADMIN: "Governance Admin",
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  DRAFT: "Draft",
  PREFLIGHT_CHECKED: "Preflight Checked",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED_FOR_PUBLISH: "Approved for Publish",
};

export const PROMPT_VERSION = "loomguard-semantic-pass-v3.2.0";
export const LLM_MODEL_ID = "glm-4.6";
