import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The gate builds two configurations — one carrying the developer tooling
     and the mock, one without — and serves them side by side, so each needs
     its own output directory. */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
  /* Partial prerendering flushes a static shell before the page has looked
     anything up, which fixes the HTTP status at 200. A public register that
     answers 200 for a record that does not exist is wrong for a crawler, for
     a monitor and for anyone scripting against it, so the status is kept
     truthful and the shell is given up. */
  cacheComponents: false,
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
