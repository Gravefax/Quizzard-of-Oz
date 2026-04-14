import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

// Cross-platform backend command that activates venv first
const isWindows = os.platform() === "win32";
const backendDir = path.resolve(__dirname, "..", "..", "backend");
const activateScript = isWindows ? String.raw`.venv\Scripts\activate.bat` : ".venv/bin/activate";
const backendCommand = isWindows
  ? `cmd /c "cd /d ${backendDir} && ${activateScript} && python -m uvicorn main:app --host 0.0.0.0 --port 8000"`
  : `bash -c "source ${backendDir}/${activateScript} && python -m uvicorn main:app --host 0.0.0.0 --port 8000"`;

export default defineConfig({
  testDir: "./app/__tests__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
