import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // For Cloudflare Pages deployment, remove serverExternalPackages
  // Local dev with Turso still works
};

export default nextConfig;
