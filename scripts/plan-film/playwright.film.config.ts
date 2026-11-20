import { defineConfig } from "@playwright/test"
import base from "../../playwright.config"

/**
 * THE FILMSTRIP WALK OF THE PLAN VERSIONS (Plans/plan-new-from-real.md, Phase 7.2). Not part of any test lane: it lives
 * outside `tests/` and runs only by hand:
 *
 *   E2E_STACK_ENV="$(node scripts/db/test-stack.mjs env)" PW_BASE_URL=http://localhost:3481 \
 *     npx playwright test -c scripts/plan-film/playwright.film.config.ts --workers=1
 *
 * It writes PNGs, `summary.json` and `summary.md` under `FILM_OUT` (default ~/.cache/daygame-research/plan-steps/p7-film).
 */
export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: /film\.spec\.ts$/,
  testIgnore: undefined,
  fullyParallel: false,
  reporter: "list",
  timeout: 1_800_000,
  projects: base.projects?.filter((p) => p.name === "desktop").map((p) => ({ ...p, testIgnore: undefined, grepInvert: undefined })),
})
