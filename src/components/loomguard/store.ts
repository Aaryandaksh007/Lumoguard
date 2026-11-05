"use client";

import { create } from "zustand";
import type { WorkflowRole } from "@/lib/types";

export type TabKey =
  | "studio"
  | "canon"
  | "workflow"
  | "insights"
  | "trail";

interface LoomGuardState {
  activeRole: WorkflowRole;
  privacyLock: boolean; // Inkloom-style air-gapped mode
  activeTab: TabKey;
  activeAssetId: string | null;
  setActiveRole: (role: WorkflowRole) => void;
  togglePrivacyLock: () => void;
  setActiveTab: (tab: TabKey) => void;
  setActiveAssetId: (id: string | null) => void;
}

export const useLoomGuard = create<LoomGuardState>((set) => ({
  activeRole: "CREATOR",
  privacyLock: false,
  activeTab: "studio",
  activeAssetId: null,
  setActiveRole: (activeRole) => set({ activeRole }),
  togglePrivacyLock: () => set((s) => ({ privacyLock: !s.privacyLock })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveAssetId: (activeAssetId) => set({ activeAssetId }),
}));
