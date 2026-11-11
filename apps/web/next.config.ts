import type { NextConfig } from "next";

/**
 * The browser calls same-origin `/api/v1/*` and Next.js forwards it to the NestJS backend.
 * Same origin means no CORS setup, and in production the refresh-token cookie
 * (httpOnly, SameSite=Lax) stays first-party even when web and API are on different domains.
 */
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
