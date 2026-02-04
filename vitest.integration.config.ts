import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    // Only include integration tests
    include: ["tests/integration/**/*.integration.test.ts"],
    exclude: ["node_modules/**/*"],

    // Node environment for database access
    environment: "node",

    // Longer timeout for container startup
    testTimeout: 30000,
    hookTimeout: 60000,

    // Run tests sequentially - files share one database
    pool: "forks",
    fileParallelism: false, // Run test files one at a time

    // Global setup (returns teardown function) for container lifecycle
    globalSetup: "./tests/integration/globalSetup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
