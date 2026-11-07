import path from "node:path"

import { config } from "dotenv"
import { configDefaults, defineConfig } from "vitest/config"

// .env.test holds the local test database URL. Variables already set (as in
// CI) win, and the test workers inherit the result.
config({ path: ".env.test", quiet: true })

export default defineConfig({
  resolve: {
    // mirrors the "@/*" path in tsconfig.json
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    projects: [
      {
        // fast and isolated, needs nothing running: the default `pnpm test`
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            ...configDefaults.exclude,
            "src/**/*.integration.test.{ts,tsx}",
          ],
        },
      },
      {
        // talks to the real test database, so files run one at a time
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.{ts,tsx}"],
          globalSetup: ["./src/test/global-setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
})
