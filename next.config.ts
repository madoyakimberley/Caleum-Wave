import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/search": [
      "./node_modules/cheerio/**/*",
      "./node_modules/domutils/**/*",
      "./node_modules/htmlparser2/**/*",
      "./node_modules/css-select/**/*",
      "./node_modules/domhandler/**/*",
      "./node_modules/dom-serializer/**/*",
      "./node_modules/entities/**/*",
    ],
  },
};

export default nextConfig;
