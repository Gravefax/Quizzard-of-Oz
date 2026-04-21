import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Prevent incorrect workspace root inference when unrelated lockfiles exist elsewhere.
    root: __dirname,
  },
};

export default nextConfig;
