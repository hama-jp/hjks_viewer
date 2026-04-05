import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    // Serve the static export directory
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Use a simple static server for the 'out' directory
    command: "npx serve out -l 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
  projects: [
    { name: "chromium", use: { channel: "chromium" } },
  ],
});
