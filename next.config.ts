import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The gate builds two configurations — one carrying the developer tooling
     and the mock, one without — and serves them side by side, so each needs
     its own output directory. */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
