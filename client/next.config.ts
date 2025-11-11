import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Completely ignore ESLint during `next build` (Turbopack + Vercel safe)
    ignoreDuringBuilds: true,
  },

};

export default nextConfig;
