import type { NextConfig } from "next";

// Security headers applied to all routes
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      // Apply security headers to all routes
      source: "/:path*",
      headers: securityHeaders,
    },
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
