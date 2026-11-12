import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

/** End-to-end smoke against a running app + PostgreSQL + Mailpit. See docs/TESTING.md. */
export default defineConfig({
  testDir: ".",
  outputDir: "test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", locale: "pt-BR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    // Production server from `pnpm --filter app build` (output: standalone).
    command: "cp -r apps/app/.next/static apps/app/.next/standalone/apps/app/.next/static && cp -r apps/app/public apps/app/.next/standalone/apps/app/public && node apps/app/.next/standalone/apps/app/server.js",
    cwd: "..",
    env: { HOSTNAME: "127.0.0.1", PORT: port },
    url: `${baseURL}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
