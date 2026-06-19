import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // StrictMode double-mounts cause WS connections to fire twice, triggering
  // backend forfeits during E2E tests. Disable it when Playwright is running.
  reactStrictMode: !process.env.DISABLE_STRICT_MODE,
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const keycloakUrl = process.env.KEYCLOAK_INTERNAL_URL || "http://keycloak:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        // Keycloak wird nur intern erreicht und über das Frontend unter /auth getunnelt.
        source: "/auth/:path*",
        destination: `${keycloakUrl}/auth/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  turbopack: {
    // Prevent incorrect workspace root inference when unrelated lockfiles exist elsewhere.
    root: __dirname,
  },
};

export default nextConfig;
