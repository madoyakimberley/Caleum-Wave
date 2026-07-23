import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/search": [
      "./node_modules/cheerio/**/*",
      "./node_modules/dom*/**/*",
      "./node_modules/htmlparser2/**/*",
      "./node_modules/css-select/**/*",
      "./node_modules/entities/**/*",
      "./node_modules/boolbase/**/*",
      "./node_modules/nth-check/**/*",
      "./node_modules/parse5/**/*",
    ],
  },
};

export default nextConfig;
