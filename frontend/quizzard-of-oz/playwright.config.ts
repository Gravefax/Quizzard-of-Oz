import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

// Disable React StrictMode for the Next.js dev server spawned by Playwright.
// StrictMode double-mounts cause WebSocket connections to fire twice per component
// mount, which triggers backend forfeits before the battle can begin.
process.env.DISABLE_STRICT_MODE = "1";

// Cross-platform backend command that activates venv first
const isWindows = os.platform() === "win32";
const backendDir = path.resolve(__dirname, "..", "..", "backend");
const activateScript = isWindows ? String.raw`.venv\Scripts\activate.bat` : ".venv/bin/activate";
const backendCommand = isWindows
  ? `cmd /c "cd /d ${backendDir} && ${activateScript} && python -m uvicorn main:app --host 0.0.0.0 --port 8000"`
  : `bash -c "source ${backendDir}/${activateScript} && python -m uvicorn main:app --host 0.0.0.0 --port 8000"`;

export default defineConfig({
  testDir: "./app/__tests__/e2e",
  // Run all tests sequentially. WebSocket game tests (battle queue, battle arena)
  // share a single backend and use fixed test accounts — parallel execution causes
  // e2etestuser to appear in the queue from multiple test contexts simultaneously,
  // producing unexpected self-matches and flaky failures.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  outputDir: "./test-results/playwright",
  reporter: [["html", { outputFolder: "test-results/playwright-report" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: backendCommand,
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      cwd: backendDir,
    },
  ],
});
