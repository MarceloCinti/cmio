import { defineConfig, devices } from "@playwright/test";
import { E2E_ENV, E2E_PORT } from "./tests/e2e/env";

// Pruebas de punta a punta contra el build de producción (salida standalone).
// Requisitos: `pnpm build` previo y PostgreSQL disponible. Ver docs/PLAN-DE-PRUEBAS.md.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    locale: "es-PY",
    timezoneId: "America/Asuncion",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "movil", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node scripts/start-standalone.mjs",
    url: `http://localhost:${E2E_PORT}/api/salud`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: E2E_ENV,
  },
});
