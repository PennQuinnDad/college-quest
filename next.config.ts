import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      // Long-lived cache for hashed static assets (JS, CSS chunks)
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      // Cache public assets (SVGs, favicons) for 1 day
      source: "/:path(.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico))",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default nextConfig;
