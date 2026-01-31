import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60000, // 60s for container startup
    hookTimeout: 60000,
    pool: "forks", // Ensure isolation between test files
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in same process to share container
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
