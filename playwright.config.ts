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
/**
 * LIVE_CHECK=1 is live-check.yml: the `live` project opens the real site, so it
 * needs neither the test backend nor a local app (see `LIVE` below).
 */
const LIVE_CHECK = process.env.LIVE_CHECK === '1'
const STACK: StackEnv | null = process.env.VITEST || LIVE_CHECK ? null : startTestStack()
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
 *   @phone   also run on the phones: Android (Pixel 7, Chromium) on every pull
 *            request, the iPhone (WebKit, Safari's cookies) nightly. Everything under mobile/ is a phone test already.
 *   @engine  also run on the other desktop engines, nightly: Firefox and Safari.
 *            Layout, focus, timers and storage events — where engines differ.
 *            The rest is the same JavaScript everywhere and Chromium proves it.
 *            Everything under cross-browser/ is an engine test already; it also
 *            runs on Chromium, so a red engine lane is the engine, not the spec.
 *   @timing  measures real time (a rest clock, a background tab). Runs in a lane
 *            of its own with one worker, so a busy machine cannot fail it.
 */
const PHONE = /mobile\/|@phone\b/
const ENGINE = /@engine\b|cross-browser\//
const TIMING = /@timing\b/
const PHONE_TIMING = /^(?=.*(?:mobile\/|@phone\b))(?=.*@timing\b)/
const SWEEPS = /sweep\//
/**
 * The live-site check (tests/e2e/live, Plans/tests-catch-what-matters.md Phase 6)
 * runs in the `live` project only, from live-check.yml, against LIVE_URL. Every
 * other project ignores the folder: it needs no test backend and must never
 * run in the pull-request lanes.
 */
const LIVE = /(^|\/)live\//
/**
 * The Time Log guard (tests/e2e/timelog-guard): the owner's everyday Time Log
 * stories, run at phone and PC size by two projects of their own, on every
 * push (e2e.yml, job `timelog-guard`). Every other project ignores the folder,
 * so nothing runs twice.
 */
const GUARD = /\/e2e\/timelog-guard\/[^/]*\.spec\.ts$/
/**
 * The Time Log's approved screen photos (tests/e2e/timelog-guard/photos): run by
 * the two `timelog-photos-*` projects only, and only inside the pinned Docker
 * image (scripts/timelog-photos.sh), because a photo is compared pixel by pixel
 * and fonts and edges differ on every other machine. A subfolder, so GUARD
 * (direct children only) never matches it; every other project ignores it.
 */
const PHOTOS = /\/e2e\/timelog-guard\/photos\//

const PHOTO_PATH = 'tests/e2e/timelog-guard/photos/__screens__/{projectName}/{arg}{ext}'

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
  // Three under CI for the Chromium lanes (desktop, android); the iPhone and
  // engine lanes set their own below. Each CI runner also hosts the test
  // backend and the app.
  workers: process.env.CI ? 3 : undefined,
  // A broken lane stops after 15 failures instead of retrying every test for
  // 19 minutes (Plans/tests-green-and-fast.md, D3). Per shard, not per run.
  maxFailures: process.env.CI ? 15 : undefined,
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
    /**
     * NO SERVICE WORKER, EXCEPT IN THE SPEC THAT TESTS IT (vice-offline).
     *
     * `public/sw.js` registers in production builds only, so CI ran a
     * different app from every local run. Once it controls a page, Chromium
     * sends that page's requests through the worker's own network stack, where
     * `context.setOffline` does not reach: in CI run 38437166271 the Black
     * Box's "filed with no signal" went straight to the account while the
     * context was offline, and it depended on whether the worker had claimed
     * the page yet, so the same test passed, failed, and passed on retry. Its
     * background shell fetches also re-rendered pages beside the test.
     */
    serviceWorkers: 'block',
  },
  projects: [
    // === Every pull request ===
    {
      name: 'desktop',
      testIgnore: [/mobile\//, SWEEPS, LIVE, GUARD, PHOTOS],
      grepInvert: TIMING,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'timing',
      testIgnore: [/mobile\//, SWEEPS, LIVE, GUARD, PHOTOS],
      grep: TIMING,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * A workout is logged in a gym, on a phone, and the tracker is used on one:
     * the first phone runs found a sync badge hidden below 640px, an entry menu
     * opening under the bottom bar, a page 2264px tall. The owner's phone is
     * Android, so this is the pull-request phone (Plans/tests-green-and-fast.md,
     * D1): Chromium, faster in CI than WebKit.
     */
    {
      name: 'android',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: PHONE,
      grepInvert: TIMING,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'timing-android',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: PHONE_TIMING,
      workers: 1,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'sweep-desktop',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The per-push phone sweep is Android (Chromium), like the other phone lanes (D1).
      name: 'sweep-android',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['Pixel 7'] },
    },

    // === The Time Log guard: every push, both sizes (e2e.yml, job `timelog-guard`) ===
    {
      name: 'timelog-guard-phone',
      testMatch: GUARD,
      use: { ...devices['Pixel 7'], timezoneId: 'Europe/Copenhagen' },
    },
    {
      name: 'timelog-guard-desktop',
      testMatch: GUARD,
      use: { ...devices['Desktop Chrome'], timezoneId: 'Europe/Copenhagen' },
    },

    // === The Time Log's screen photos: every push, inside Docker only (e2e.yml, job `timelog-photos`) ===
    // Photos are stored without an operating-system suffix, because they are only ever made in one place:
    // the Playwright image pinned in scripts/timelog-photos.sh.
    {
      name: 'timelog-photos-phone',
      testMatch: PHOTOS,
      snapshotPathTemplate: PHOTO_PATH,
      use: { ...devices['Pixel 7'], timezoneId: 'Europe/Copenhagen' },
    },
    {
      name: 'timelog-photos-desktop',
      testMatch: PHOTOS,
      snapshotPathTemplate: PHOTO_PATH,
      use: { ...devices['Desktop Chrome'], timezoneId: 'Europe/Copenhagen' },
    },

    // === Nightly (Q5): the other engines and the iPhone ===
    // One worker each: they are small, and they carry the @timing tests that
    // are engine-sensitive (a background tab's timers differ by engine).
    {
      name: 'firefox',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: ENGINE,
      workers: 1,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: ENGINE,
      workers: 1,
      use: { ...devices['Desktop Safari'] },
    },
    /**
     * The iPhone, nightly: WebKit is where Safari's cookie handling lives, which
     * the sign-up confirmation link depends on. Two workers: WebKit on a CI
     * runner does not take a third.
     */
    {
      name: 'phone',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: PHONE,
      grepInvert: TIMING,
      workers: process.env.CI ? 2 : undefined,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'timing-phone',
      testIgnore: [SWEEPS, LIVE, GUARD, PHOTOS],
      grep: PHONE_TIMING,
      workers: 1,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'sweep-phone',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'sweep-webkit',
      testMatch: SWEEPS,
      timeout: SWEEP_TIMEOUT,
      use: { ...devices['Desktop Safari'] },
    },

    // === After every production deploy (live-check.yml) ===
    // Read-only against the real site; LIVE_URL names it (the workflow's one copy).
    {
      name: 'live',
      testMatch: LIVE,
      timeout: 60_000,
      use: { ...devices['Desktop Chrome'], baseURL: process.env.LIVE_URL },
    },
  ],
  /**
   * THE APP, ON ITS OWN PORT AND ITS OWN BUILD FOLDER, AGAINST THE TEST BACKEND.
   *
   * The backend's address and keys reach the build and the server through
   * `process.env`, which the top of this file has already pointed at the test
   * backend and which the web server inherits. Not through `env` here: the blob
   * reporter writes this whole object into every CI report, and those are
   * public. Next inlines every `NEXT_PUBLIC_*` value into the client bundle at
   * build time, and its own `.env.local` loading never overrides a variable
   * already set, so the live project's values cannot win.
   *
   * Locally a dev server: a production build freezes this WSL machine
   * (scripts/build.sh). In CI each shard builds its own (e2e.yml says why).
   */
  webServer: LIVE_CHECK ? undefined : {
    command: process.env.CI
      ? `npm run build && npm start -- -p ${E2E_PORT}`
      : `npx next dev -p ${E2E_PORT}`,
    url: BASE_URL,
    ignoreHTTPSErrors: LOCAL_HTTPS,
    // Under CI a server that is already there is an error (a leftover from another step), except when
    // the run was told where the app is: the photo job starts the app on the runner, outside Docker.
    reuseExistingServer: !process.env.CI || !!process.env.PW_BASE_URL,
    // The CI build alone measured ~90 s on a 4-CPU runner, and every shard
    // builds; 120 s left a shard one slow runner away from failing unbuilt.
    timeout: process.env.CI ? 300_000 : 120_000,
    env: { NEXT_DIST_DIR: '.next-e2e' },
  },
})
