import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL;
const apiBase = process.env.NEXT_PUBLIC_API_BASE;

if (!backendUrl) {
  throw new Error("Missing required env var BACKEND_URL");
}

if (!apiBase) {
  throw new Error("Missing required env var NEXT_PUBLIC_API_BASE");
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Prevent incorrect workspace root inference when unrelated lockfiles exist elsewhere.
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: `${apiBase}/:path*`,
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
