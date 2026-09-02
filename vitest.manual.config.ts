import { defineConfig } from "vitest/config"
import path from "path"

/**
 * Checks that talk to the REAL project database and are therefore never part of
 * `npm test`. Each one creates the account and rows it needs and deletes them
 * again. Run deliberately:
 *
 *   npx vitest run --config vitest.manual.config.ts
 */
export default defineConfig({
  test: {
    include: ["tests/manual/**/*.test.ts"],
    environment: "node",
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./tests/__mocks__/server-only.ts"),
    },
  },
})
