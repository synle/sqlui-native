/** Playwright smoke test configuration — lightweight subset of e2e for fast validation. */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: "smoke-test-results.xml" }],
      ]
    : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  /* Only run Phase 0 (GitHub Pages links), Phase 1 (App Launch), and Phase 2 (Connection CRUD) for smoke. */
  grep: /Phase 0|Phase 1|Phase 2/,
  webServer: {
    command: process.env.CI ? "npm run start-e2e" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
