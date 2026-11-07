import { defineConfig, devices } from "@playwright/test"
import { config } from "dotenv"

// the same local test database and mail catcher the other tests use
config({ path: ".env.test", quiet: true })

// A port of its own, so a running dev server is never reused or disturbed.
const port = 3100
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  outputDir: ".reports/playwright/results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["github"],
        [
          "html",
          {
            outputFolder: ".reports/playwright/html",
            open: "never",
          },
        ],
      ]
    : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Tests run against the production build, which is what ships.
  webServer: {
    command: "pnpm build && pnpm start",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      ...(process.env as Record<string, string>),
      PORT: String(port),
      NEXT_PUBLIC_APP_URL: baseURL,
      // a build directory of its own, so `pnpm dev` and this build can coexist
      NEXT_DIST_DIR: ".reports/next",
    },
  },
})
