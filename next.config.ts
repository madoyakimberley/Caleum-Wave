import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/search": ["./node_modules/**/*"],
  },
};

export default nextConfig;
