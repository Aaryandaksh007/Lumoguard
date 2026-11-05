import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* allow the sandbox preview gateway origin for dev-time assets/HMR */
  allowedDevOrigins: ["preview-chat-3a03f6e8-4fdf-4e24-ac94-250b348c25d5.space-z.ai"],
  /* the SQLite database lives inside the project tree — every audit run
     writes to it, which would otherwise trigger dev-watcher full reloads
     and wipe in-progress client state mid-demo. */
  watchOptions: {
    ignored: ["**/db/**", "**/*.db", "**/*.db-journal"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* hide the dev-tools dock button so screen recordings stay clean */
  devIndicators: false,
};

export default nextConfig;
