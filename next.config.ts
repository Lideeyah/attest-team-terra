import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: { NEXT_PUBLIC_ATTEST_API_MODE: process.env.ATTEST_API_MODE || "mock" },
  async rewrites() {
    if (process.env.ATTEST_API_MODE !== "live") return [];
    const upstream = process.env.ATTEST_API_ORIGIN || "http://127.0.0.1:8080";
    return { beforeFiles: [
      { source: "/api/:path*", destination: `${upstream}/api/:path*` },
      { source: "/auth/:path*", destination: `${upstream}/auth/:path*` },
      { source: "/receipt/:path*", destination: `${upstream}/receipt/:path*` },
      { source: "/hooks/forge", destination: `${upstream}/hooks/forge` },
      { source: "/hooks/whatsapp", destination: `${upstream}/hooks/whatsapp` },
    ] };
  },
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
