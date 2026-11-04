// Client-facing API DTOs (serialized forms of the Prisma models)

import type { Pillar, Provenance, Severity } from "@/lib/types";

export interface AssetListItem {
  id: string;
  title: string;
  assetType: string;
  status: string;
  assigneeRole: string | null;
  contentLength: number;
  updatedAt: string;
  latestRun: {
    runId: string;
    readinessScore: number;
    totalLatencyMs: number;
    llmStatus: string;
    findingsCount: number;
    createdAt: string;
  } | null;
}

export interface FindingDTO {
  id: string;
  findingId: string;
  pillar: Pillar;
  ruleId: string;
  severity: Severity;
  verdict: string | null;
  originalSpan: string;
  charStart: number;
  charEnd: number;
  suggestedDiff: string | null;
  explanation: string;
  provenance: Provenance;
  status: "PENDING" | "ACCEPTED" | "OVERRIDDEN";
  intentPreservation: number;
  createdAt: string;
}

export interface RunDTO {
  id: string;
  runId: string;
  assetId: string;
  readinessScore: number;
  stage1LatencyMs: number;
  stage2LatencyMs: number;
  totalLatencyMs: number;
  llmStatus: string;
  llmModel: string | null;
  promptVersion: string | null;
  scrubbedContent: string | null;
  tokenMap: Record<string, string>;
  findingsByPillar: Record<string, number>;
  findingsBySeverity: Record<string, number>;
  createdAt: string;
  findings: FindingDTO[];
}

export interface AssetDetail {
  id: string;
  title: string;
  assetType: string;
  content: string;
  visualMeta: string | null;
  visualMetaParsed: {
    assetName?: string;
    extractedColors?: { name: string; hex: string }[];
    colorPairs?: { fg: string; bg: string; elementName: string; isLarge: boolean }[];
    logoBox?: { width: number; height: number; adjacentTextDist: number };
  } | null;
  status: string;
  assigneeRole: string | null;
  createdAt: string;
  updatedAt: string;
  runs: RunDTO[];
}

export interface CanonDTO {
  terms: {
    termId: string;
    surfaceForm: string;
    ruleType: string;
    replacementToken: string | null;
    allowedContextRegex: string | null;
    rationaleCitation: string;
  }[];
  voice: {
    personaName: string;
    fleschKincaidMin: number;
    fleschKincaidMax: number;
    passiveVoiceMaxPct: number;
    approvedSamples: string[];
    forbiddenCliches: string[];
  };
  facts: {
    factId: string;
    claimAssertion: string;
    status: string;
    effectiveDate: string | null;
    expirationDate: string | null;
    evidenceDocUrl: string | null;
    requiredDisclaimerText: string | null;
    supersededByFactId: string | null;
  }[];
  swatches: { tokenName: string; hexValue: string; role: string; isBrandCore: boolean }[];
  logoRules: {
    assetName: string;
    canonicalWidth: number;
    canonicalHeight: number;
    aspectRatio: number;
    clearSpaceRatio: number;
  };
  codenames: string[];
}

export interface TelemetryDTO {
  id: string;
  ruleId: string;
  ruleName: string;
  pillar: string;
  triggersCount: number;
  overridesCount: number;
  disputesCount: number;
  meanResolutionHours: number;
  gasScore: number;
  classification: string;
  overrideRatePct: number;
  disputeRatePct: number;
  latencyPctOfSla: number;
  recommendation: string;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface RefinerResult {
  ruleId: string;
  previousGas: number;
  refined: {
    upgraded_guideline: string;
    do_examples: string[];
    dont_examples: string[];
    rationale: string;
  };
  provenance: {
    engine: string;
    model: string;
    promptVersion: string;
    synthesizedFromOverrides: number;
    degraded: boolean;
  };
}
