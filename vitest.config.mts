import path from "node:path"

import react from "@vitejs/plugin-react"
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
        // fast and isolated, needs nothing running: part of `pnpm test`
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [
            ...configDefaults.exclude,
            "src/**/*.integration.test.ts",
          ],
        },
      },
      {
        // React components in a simulated browser: part of `pnpm test`
        extends: true,
        plugins: [react()],
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/vitest.setup.ts"],
        },
      },
      {
        // talks to the real test database, so files run one at a time
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./src/test/global-setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
})
