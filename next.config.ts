import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* App dinâmico (sessões por cookie + store demo mutável):
     cacheComponents desativado para manter o comportamento dinâmico clássico. */
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
