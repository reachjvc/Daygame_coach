import { defineConfig } from "vitest/config"
import path from "path"

/**
 * THE DATABASE SUITE: one real test backend, files in parallel, nothing truncated.
 *
 * The backend is a throwaway local Supabase built from production's own schema
 * (scripts/db/test-stack.mjs; Plans/tests-worth-their-keep.md, Phase 7).
 * `tests/db/globalSetup.ts` starts it once — or reuses the one already running —
 * and hands its address to every worker.
 *
 * PARALLEL BECAUSE EVERY TEST OWNS ITS DATA. Each test makes its own users
 * (`newUser`, `createTestUser`) and asserts only about rows hanging off them, so
 * two files running at once never see each other. Nothing wipes a table between
 * tests: a suite that needs wiping cannot run in parallel, and one that wipes a
 * shared backend breaks every other run using it. `TEST_SHARED_USER=1` puts
 * every test on one account; the cross-user tests must go red with it set, or
 * the parallel run is green for the wrong reason (R5).
 */
export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    include: ["tests/integration/**/*.integration.test.ts"],
    exclude: ["node_modules/**/*"],
    environment: "node",
    globalSetup: [path.resolve(__dirname, "tests/db/globalSetup.ts")],

    // Generous, because a cold stack and eight workers share one machine. A
    // test that wants a performance bound should assert one out loud.
    testTimeout: 30000,
    hookTimeout: 60000,

    pool: "forks",
    fileParallelism: true,
    // Vitest 4.1 has no poolOptions; this is the cap. A CI runner has 4 cores.
    maxWorkers: process.env.CI ? 4 : 8,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./tests/__mocks__/server-only.ts"),
    },
  },
})
