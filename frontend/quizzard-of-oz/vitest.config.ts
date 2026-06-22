import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "app/__tests__/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./test-results/coverage",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.config.*",
        "**/coverage/**",
        "vitest.setup.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
