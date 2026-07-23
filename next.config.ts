import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Tell Next.js to leave yt-search for Node runtime resolution
  serverExternalPackages: ["yt-search", "cheerio"],

  // 2. Cover all App Router route key variations for file tracing
  outputFileTracingIncludes: {
    "app/api/search/route": ["./node_modules/**/*"],
    "/api/search/route": ["./node_modules/**/*"],
    "/api/search": ["./node_modules/**/*"],
  },
};

export default nextConfig;
