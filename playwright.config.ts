import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { startTestStack, type StackEnv } from './tests/e2e/fixtures/stack'

// Load environment variables from .env and .env.local (local takes precedence)
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

/**
 * THE BACKEND THE APP UNDER TEST TALKS TO: the throwaway local Supabase built
 * from production's schema (`scripts/db/test-stack.mjs`), never the live
 * project. Until Phase 8 of Plans/tests-worth-their-keep.md every browser
 * run created and wiped rows in production through three real accounts.
 *
 * Started, or reused in about a second, once per run, here in the runner;
 * workers inherit its env (tests/e2e/fixtures/stack.ts says why only once).
 *
 * The production keys `.env.local` just loaded are overwritten in this
 * process, so no test, helper or worker can reach the live project by reading
 * `process.env` — the service-role key above all.
 *
 * Not when a unit test imports this file for its project list
 * (tests/unit/ciWorkflows.test.ts): that must not need Docker.
 */
const STACK: StackEnv | null = process.env.VITEST ? null : startTestStack()
if (STACK) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = STACK.API_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = STACK.ANON_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = STACK.SERVICE_ROLE_KEY
}

/**
 * The app under test runs on its own port and build folder, so a run never
 * touches the `npm run dev` on :3000 (and its `.next`) that the owner and other
 * sessions use — which also talks to the live project.
 */
const E2E_PORT = 3200

/**
 * WHERE THE APP UNDER TEST IS: the server `webServer` below starts on
 * E2E_PORT, pointed at the test backend.
 *
 * Overridable because some things cannot be tested against `next dev` at all.
 * The service worker is the case that forced this: `OfflineShell` registers
 * only in a production build, by design, so "can this page be opened with no
 * connection" is untestable on the dev server — and a test that went green
 * there would be asserting nothing. An override must be a server started with
 * the test backend's three Supabase variables (the ones `webServer.env` sets
 * below); one pointed at the live project cannot sign in as the accounts the
 * fixtures create, and the fixture says so.
 *
 * `webServer.url` follows it, so Playwright checks the server it is actually
 * pointed at rather than starting a second one.
 */
const BASE_URL = process.env.PW_BASE_URL ?? `http://localhost:${E2E_PORT}`

/**
 * THE LOCAL DEPLOYMENT HAS ITS OWN CERTIFICATE AUTHORITY.
 *
 * https://localhost (infra/run-local.sh) is served by Caddy with a certificate
 * from Caddy's local CA, which the browsers Playwright starts do not trust.
 * For an https address on this machine only, certificate errors are ignored,
 * by the browsers and by `webServer` alike. Without the second, `webServer`
 * cannot see the running server and starts one of its own instead.
 * Plans/caddy-deploy-and-cicd.md, Phase 3 step 10.
 */
const LOCAL_HTTPS = /^https:\/\/(localhost|127\.0\.0\.1|[a-z0-9-]+\.localhost)(:\d+)?(\/|$)/.test(BASE_URL)

/**
 * WHICH TESTS RUN WHERE: LANES, CHOSEN BY TAG, NOT BY FILE LISTS.
 *
 * Every spec signs in as an account of its own (tests/e2e/fixtures/test.ts):
 * one fresh account per worker in the test backend, nobody else's. So there
 * are no setup projects, no chains, no per-file projects and no worker pins
 * left; until Phase 8 of Plans/tests-worth-their-keep.md there were 33
 * projects, most of them existing only to keep three shared accounts apart.
 *
 * A pattern below is matched against "project file describe title tags", so
 * `mobile\/` selects a whole folder and `@engine` one test or, as a describe's
 * tag, one file. None of them may match a project's name.
 *
 *   @phone   also run on the phones: the iPhone on every pull request, Android
 *            nightly. Everything under mobile/ is a phone test already.
 *   @engine  also run on the other desktop engines, nightly: Firefox and Safari.
 *            Layout, focus, timers and storage events — where engines differ.
 *            The rest is the same JavaScript everywhere and Chromium proves it.
 *            Everything under cross-browser/ is an engine test already; it also
 *            runs on Chromium, so a red engine lane is the engine, not the spec.
 *   @timing  measures real time (a rest clock, a background tab). Runs in a lane
 *            of its own with one worker, so a busy machine cannot fail it.
 */
const PHONE = /mobile\/|@phone/
const ENGINE = /@engine|cross-browser\//
const TIMING = /@timing/
const PHONE_TIMING = /^(?=.*(?:mobile\/|@phone))(?=.*@timing)/
const SWEEPS = /sweep\//

/**
 * The derived sweeps open every page in the app (tests/support/appRoutes.ts).
 * Against `next dev` each route compiles on first request, so the default 60s
 * is not enough locally; CI runs a production build and never approaches it.
 */
const SWEEP_TIMEOUT = 180_000

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry (Q6): a test that fails twice is red. Two hid flakes.
  retries: process.env.CI ? 1 : 0,
  // Two, because each CI runner also hosts the test backend and the app.
  workers: process.env.CI ? 2 : undefined,
  // Under CI each shard writes a blob, and e2e.yml's `report` job merges them
  // into one HTML report; `list` is the job's own log.
  reporter: process.env.CI ? [['blob'], ['list']] : 'html',
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: LOCAL_HTTPS,
    // Off under CI: a trace records typed values, request bodies and auth
    // cookies, and CI's artifacts on this public repo are downloadable.
    trace: process.env.CI ? 'off' : 'on-first-retry',
    headless: true,
  },
  projects: [
    // === Every pull request ===
    {
      name: 'desktop',
      testIgnore: [/mobile\//, SWEEPS],
      grepInvert: TIMING,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'timing',
      testIgnore: [/mobile\//, SWEEPS],
      grep: TIMING,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * A workout is logged in a gym, on a phone, and the tracker is used on one:
     * the first phone runs found a sync badge hidden below 640px, an entry menu
     * opening under the bottom bar, a page 2264px tall. The iPhone is WebKit,
     * so this is also the pull-request lane for Safari's cookie handling, which
     * the sign-up confirmation link depends on.
     */
    {
      name: 'phone',
      testIgnore: SWEEPS,
      grep: PHONE,
      grepInvert: TIMING,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'timing-phone',
      testIgnore: SWEEPS,
      grep: PHONE_TIMING,
      workers: 1,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'sweep-desktop',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sweep-phone',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['iPhone 14'] },
    },

    // === Nightly (Q5): the other engines ===
    // One worker each: they are small, and they carry the @timing tests that
    // are engine-sensitive (a background tab's timers differ by engine).
    {
      name: 'firefox',
      testIgnore: SWEEPS,
      grep: ENGINE,
      workers: 1,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: SWEEPS,
      grep: ENGINE,
      workers: 1,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'android',
      testIgnore: SWEEPS,
      grep: PHONE,
      workers: 1,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'sweep-webkit',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  /**
   * THE APP, ON ITS OWN PORT AND ITS OWN BUILD FOLDER, AGAINST THE TEST BACKEND.
   *
   * `env` reaches the BUILD as well as the server: Next inlines every
   * `NEXT_PUBLIC_*` value into the client bundle at build time, so a CI build
   * made without these would send the browser to whichever backend the build
   * machine's env named. The server's own `.env.local` loading never overrides
   * a variable already set, so these win over the live project's there too.
   *
   * Locally a dev server: a production build freezes this WSL machine
   * (scripts/build.sh). CI builds with webpack and starts it; Phase 9 moves the
   * build into a job of its own.
   */
  webServer: {
    command: process.env.CI
      ? `npm run build && npm start -- -p ${E2E_PORT}`
      : `npx next dev -p ${E2E_PORT}`,
    url: BASE_URL,
    ignoreHTTPSErrors: LOCAL_HTTPS,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Allow more time for build in CI
    env: STACK
      ? {
          NEXT_PUBLIC_SUPABASE_URL: STACK.API_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: STACK.ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: STACK.SERVICE_ROLE_KEY,
          NEXT_DIST_DIR: '.next-e2e',
        }
      : undefined,
  },
})
