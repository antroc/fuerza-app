import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/fuerza-app/",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command:
      "VITE_GITHUB_API_BASE=/fuerza-app/__github npm run build && node scripts/e2e-preview.mjs",
    url: "http://127.0.0.1:4173/fuerza-app/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
