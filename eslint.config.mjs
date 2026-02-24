import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "*.config.*",
      "postcss.config.mjs",
    ],
  },
  ...nextConfig,
];
