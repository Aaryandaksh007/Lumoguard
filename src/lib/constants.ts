// Client-safe shared constants (no server imports).

import type { VisualMeta } from "@/lib/types";

export const DEMO_VISUAL_META: VisualMeta = {
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
