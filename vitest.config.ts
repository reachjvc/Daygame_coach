import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  /**
   * ABSOLUTE, SO THE SUITE SURVIVES A GIT WORKTREE.
   *
   * `root` and `setupFiles` were relative. Vite then resolved them against
   * whatever it decided the project root was, and inside a `git worktree` it
   * decides on the PARENT checkout — so every one of the 178 test files failed
   * with `Cannot find module '/@fs/<parent>/tests/setup.ts'`, all at once, for a
   * reason that looks nothing like its cause.
   *
   * That matters more than it sounds. This repository is worked on by more than
   * one agent at a time, and a worktree is the one safe way to check out a
   * second branch without disturbing the shared checkout. Making the safe move
   * break the entire test suite pushes people back to switching branches under
   * each other's feet, which is how main was broken on 2026-09-09.
   */
  root: path.resolve(__dirname),
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // tests/manual/** talks to the REAL project database and creates and deletes
    // its own accounts. It is never part of `npm test` — run it deliberately with
    // `npx vitest run --config vitest.manual.config.ts`.
    exclude: ['tests/integration/**/*', 'tests/manual/**/*', 'node_modules/**/*'],
    globals: true,
    /**
     * NOT THE DEFAULT 5s, because nothing here is measuring speed.
     *
     * 2026-09-24: two different tests timed out at 5000ms in full-suite runs
     * minutes apart — a 2,520-row paging simulation at 5043ms, then a mocked
     * repo test — and both passed alone. Neither asserts a duration; they
     * assert that no row is lost at size and that a closed workout returns its
     * summary. This checkout is worked on by more than one agent at a time with
     * a `next dev` compiling beside them, so a five-second budget on 5,901
     * mocked tests fails on contention rather than on defects, and a build that
     * goes red for the machine it ran on teaches people to re-run it rather
     * than read it.
     *
     * A genuine hang now takes 20s to report instead of 5. That is the trade,
     * and it is the right way round. Anything that wants a performance bound
     * should assert one out loud, with a number.
     */
    testTimeout: 20000,
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})
