import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* allow the sandbox preview gateway origin for dev-time assets/HMR */
  allowedDevOrigins: ["preview-chat-3a03f6e8-4fdf-4e24-ac94-250b348c25d5.space-z.ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
