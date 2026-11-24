import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end scenarios A–E plus smoke checks.
 *
 * Requires PostgreSQL with migrations and demo seed applied
 * (`npm run db:migrate && SEED_DEMO_CONTENT=true npm run db:seed`) and the
 * development simulators enabled (`ALLOW_DEV_SIMULATORS=true`).
 *
 * If no server is running on E2E_BASE_URL, Playwright starts `next dev`
 * with rate limiting disabled (the suite registers many accounts from one
 * IP). When reusing your own dev server, start it with
 * `RATE_LIMIT_DISABLED=true`.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const port = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    locale: "en-GB",
    // Password-protected preview deployment (PREVIEW_MODE): E2E_PREVIEW_PASSWORD=…
    httpCredentials: process.env.E2E_PREVIEW_PASSWORD ? { username: "vorschau", password: process.env.E2E_PREVIEW_PASSWORD } : undefined,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { RATE_LIMIT_DISABLED: "true", APP_URL: baseURL },
  },
});
