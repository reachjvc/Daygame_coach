import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { startTestStack, type StackEnv } from './tests/e2e/fixtures/stack'

// Load environment variables from .env and .env.local (local takes precedence)
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

/**
 * THE BACKEND THE APP UNDER TEST TALKS TO: the throwaway local Supabase built
 * from production's schema (`scripts/db/test-stack.mjs`), never the live
 * project. Until Phase 8 of docs/plans/tests-worth-their-keep.md every browser
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
 * WHERE THE TRAINING ACCOUNT'S SESSION LIVES.
 *
 * Named once so the config and the wipe helper cannot disagree about which
 * account the destructive helper is allowed to run against.
 */
export const TRAINING_STATE = 'tests/e2e/.auth/training.json'

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
 * THE SPECS THAT RUN ON AN ACCOUNT OF THEIR OWN (Phase 8).
 *
 * Each imports `test` from tests/e2e/fixtures/test.ts, which gives every
 * worker a fresh account in the test backend, so these need no setup project,
 * no storage state, no chain and no worker limit: they run in `desktop`, as
 * parallel as the machine allows. Every other project leaves them out. A spec
 * joins this list in the same change that converts it (the fixture file's
 * header says how), until it is every spec and the old projects go.
 */
const ON_OWN_ACCOUNTS = [
  /(?:^|\/)settings\.spec\.ts$/,
  /tracking-tiles\.spec\.ts/,
  /session-tracking\.spec\.ts/,
  /security-idor\.spec\.ts/,
  /(?:^|\/)auth\.spec\.ts$/,
  /programs-live-menus\.spec\.ts/,
]

/**
 * WHICH TRAINING TESTS RUN OFF CHROMIUM.
 *
 * Matched against "project file describe title tags", so a file name selects
 * the whole file. Three files are engine-sensitive throughout; in the
 * live-workout file only the tests tagged @engine are.
 */
const TRAINING_OFF_CHROMIUM =
  /@engine|mobile-training\.spec\.ts|programs-offline\.spec\.ts|programs-live-desktop\.spec\.ts/

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Recreates the three old test accounts in the test backend for the specs
  // not yet on their own accounts. The file says when it goes.
  globalSetup: './tests/e2e/fixtures/global-setup.ts',
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
    // === Setup projects (run first, log in once, save auth state) ===
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-user-b',
      testMatch: /auth-user-b\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * THE TRAINING SUITE'S OWN LOGIN. The four training projects wipe their
     * account clean on every run; until 2026-09-23 that account was `setup`'s,
     * which the goals and session specs share and which `.claude/rules/ui.md`
     * sends a person to for hand-checking.
     */
    {
      name: 'training-setup',
      testMatch: /auth-training\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // === Specs on accounts of their own: no setup, no chain, no worker limit ===
    // `storageState` is the fixture's (tests/e2e/fixtures/test.ts), one per
    // worker, so the project sets none. Desktop Chrome; the phone and the other
    // engines join as lanes once every spec is converted (Phase 8, step 3).
    {
      name: 'desktop',
      testMatch: ON_OWN_ACCOUNTS,
      use: { ...devices['Desktop Chrome'] },
    },

    // === Authenticated tests (depend on setup, get storageState) ===
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      testIgnore: [
        // runs in its own project: it writes to the live database
        /timetrack-sync\.spec\.ts/,
        /timetrack-edge-cases\.spec\.ts/,
        /error-reporting\.spec\.ts/,
        /(?:^|\/)smoke\.spec\.ts$/,
        /signup-flow\.spec\.ts/,
        /password-reset\.spec\.ts/,
        /security-auth\.spec\.ts/,
        /protected-routes\.spec\.ts/,
        // On accounts of their own, in `desktop`.
        ...ON_OWN_ACCOUNTS,
        // The tracker's own behaviour, on the account the sync specs empty —
        // so it runs in their project, one test at a time.
        /toggl-time-tracker\.spec\.ts/,
        // Training tests run in their own project: they share one account and
        // each wipes it clean, so in parallel they delete each other's data.
        /programs-live-workout\.spec\.ts/,
        /programs-live-desktop\.spec\.ts/,
        /programs-open-workout\.spec\.ts/,
        /programs-history-progress\.spec\.ts/,
        // Measures the rendered boxes on the shared account's program.
        /programs-one-language\.spec\.ts/,
        /programs-build-week\.spec\.ts/,
        // Starts programs on the shared account, so it belongs beside the rest.
        /life-mastery-program-link\.spec\.ts/,
        /dashboard-training-card\.spec\.ts/,
        /programs-past-workout\.spec\.ts/,
        /programs-offline\.spec\.ts/,
        // Goals tests share a user and mutate goals data — run in their own projects
        /life-mastery-track\.spec\.ts/,
        // `goals-4`'s. It was missing from this list, so it ran twice per pass.
        /life-mastery-day-persists\.spec\.ts/,
        // Mobile-specific tests run in dedicated phone projects
        /mobile\//,
        // Cross-browser tests run in dedicated Firefox/WebKit projects
        /cross-browser\//,
        // Derived per-route sweeps run in their own desktop/phone/WebKit projects
        /sweep\//,
        // The signed-OUT half of the cold-open sweep. It asserts what a
        // stranger sees on the sales page and in the auth flow, so a session
        // would render a different app and prove nothing about either.
        /cold-open-signed-out\.spec\.ts/,
      ],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Multi-user security tests (depend on both setups) ===
    // EMPTY since Phase 8: its one spec, security-idor, runs in `desktop` with
    // a `secondUser` of its own. Kept only because e2e.yml still names it;
    // delete it there and here together, with the rest of the chains.
    {
      name: 'security-multi-user',
      testMatch: [],
      dependencies: ['setup', 'setup-user-b'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Safe unauthenticated tests (no deps - don't touch auth state) ===
    {
      name: 'no-auth',
      testMatch: [
        /(?:^|\/)smoke\.spec\.ts$/,
        /signup-flow\.spec\.ts/,
        // Password reset is an unauthenticated flow: half of it asserts what a
        // logged-OUT visitor sees, so it must not inherit the signed-in state.
        /password-reset\.spec\.ts/,
        /security-auth\.spec\.ts/,
        // Opens the sales page and the whole auth flow cold and reads the
        // console. The only pages a person can reach without an account, so the
        // only ones where a hydration failure can be shown to a stranger.
        /cold-open-signed-out\.spec\.ts/,
        // Signed out by its own `test.use`; it logs nothing in or out, so it
        // has no reason to wait for `auth-destructive`.
        /protected-routes\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    // Crash reporting: proves a real crash reaches the database, and that
    // nothing private travels with it.
    {
      name: 'error-reporting',
      testMatch: /error-reporting\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
    },

    // === Training: one account, and each spec cleans it out ===
    // These start workouts, save training weeks and delete workouts on the ONE
    // test account. Run beside each other they remove each other's rows
    // mid-assertion, so they get a project of their own with a single worker.
    //
    // `fullyParallel: false` and `workers: 1` below are what stop them racing —
    // files AND tests, one at a time, in declaration order. An earlier version
    // of this comment credited `describe.configure({ mode: "serial" })` in each
    // file with "stopping the FILES running at the same time as each other",
    // which is not what serial mode does: it is per-describe, and a worker limit
    // is the only thing that serialises files.
    //
    // What serial mode DOES do in these files is skip every remaining test once
    // one fails, and that has a cost worth knowing: on 2026-09-24 another
    // session proved it hides a fault failing half its runs — `blackbox.spec.ts`
    // aborted after its first failure every time, 4 to 21 tests "did not run",
    // so each run reported one data point about one test and five different
    // tests took the blame over six runs. A suite that cannot fail twice in one
    // run cannot show you a 1-in-2 fault.
    //
    // It stays regardless, and not because of the isolation this project already
    // provides. It stays because that isolation is one `testIgnore` entry away
    // from gone: `chromium` matches every `*.spec.ts` and excludes these by
    // name, in this file, which two other sessions edit. Serial is what protects
    // a training spec that ever loses its exclusion. Lost samples are a
    // diagnosis problem; parallel workers on ONE account are corruption that
    // reads as a product bug. `tests/unit/e2e-isolation.test.ts` enforces it.
    {
      name: 'training',
      testMatch: [
        /programs-live-workout\.spec\.ts/,
        // programs-live-menus, the same screen's menus, runs in `desktop` on
        // accounts of its own since Phase 8.
        // The same screen in a WINDOW. Every other file here starts with
        // `setViewportSize(PHONE)`, which is right — a workout is logged on a
        // phone — and meant that until 2026-09-26 nothing had ever pressed the
        // ✓ at a width where `sm:` applies, where a delete button sat on top of
        // it and took the click.
        /programs-live-desktop\.spec\.ts/,
        // Two programs running at once, which every other file here avoids by
        // enrolling in exactly one — and which is the state where the open
        // workout had no door on the training screen.
        /programs-open-workout\.spec\.ts/,
        /programs-history-progress\.spec\.ts/,
        /programs-one-language\.spec\.ts/,
        /programs-build-week\.spec\.ts/,
        /life-mastery-program-link\.spec\.ts/,
        /dashboard-training-card\.spec\.ts/,
        /programs-past-workout\.spec\.ts/,
        /programs-offline\.spec\.ts/,
      ],
      fullyParallel: false,
      workers: 1,
      dependencies: ['training-setup'],
      use: { ...devices['Desktop Chrome'], storageState: TRAINING_STATE },
    },

    // === Time tracker, at /dashboard/time, on the account it syncs to ===
    // Every spec here empties TEST_USER's time-tracking data before it starts
    // (helpers/timetrack.ts), so the files run one at a time: a second worker
    // would empty the account under a test halfway through asserting on it.
    // Until 2026-10-13 two of these files drove `/test/toggl`, a signed-out lab
    // copy that returns 404 in the production build CI runs.
    {
      name: 'timetrack-sync',
      testMatch: [/timetrack-sync\.spec\.ts/, /timetrack-edge-cases\.spec\.ts/, /toggl-time-tracker\.spec\.ts/],
      fullyParallel: false,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
    },

    // The tracker on a phone. Syncing was only ever run on a desktop, and the
    // first phone run found three faults a desktop cannot see: the sync status
    // badge was hidden below 640px, and the entry menu opened underneath the
    // bottom navigation bar, so "Delete" could not be tapped at all.
    //
    // ONE iPhone project. `mobile-toggl` also ran in `mobile-iphone` and
    // `toggl-iphone-safari` — the same device twice, the same tests twice.
    {
      name: 'timetrack-sync-phone',
      testMatch: [/timetrack-sync\.spec\.ts/, /timetrack-edge-cases\.spec\.ts/, /mobile\/mobile-toggl\.spec\.ts/],
      fullyParallel: false,
      workers: 1,
      dependencies: ['setup'],
      /**
       * DO NOT RUN THIS PROJECT AND `timetrack-sync` IN THE SAME INVOCATION
       * LOCALLY. CI is safe because it pins `workers: 1`; locally the two
       * projects run side by side, and both empty the same account. The
       * contention found first was the single `next dev` process both suites
       * drive, which a separate account would not fix either. Run them one at
       * a time:
       *
       *   npx playwright test --project=timetrack-sync
       *   npx playwright test --project=timetrack-sync-phone
       */
      use: { ...devices['iPhone 14'], storageState: 'tests/e2e/.auth/user.json' },
    },

    // === Time tracker on the other engines: NIGHTLY (Q5) ===
    // Desktop Safari and Firefox run only the tests tagged @engine — layout,
    // focus and storage events, where an engine difference can bite. The rest
    // is the same JavaScript on every engine and Chromium proves it.
    {
      name: 'toggl-webkit',
      testMatch: /toggl-time-tracker\.spec\.ts/,
      grep: /@engine/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: 'tests/e2e/.auth/user.json' },
    },
    {
      name: 'toggl-firefox',
      testMatch: /toggl-time-tracker\.spec\.ts/,
      grep: /@engine/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: 'tests/e2e/.auth/user.json' },
    },
    {
      name: 'toggl-android',
      testMatch: /mobile\/mobile-toggl\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: 'tests/e2e/.auth/user.json' },
    },

    // === Training on phones and other engines ===
    // Training is opened in a gym, on a phone, in whatever browser is on it. The
    // page was 2264px tall on a 390px screen with three competing things called
    // logging on it, and Chromium at desktop size showed none of that. These run
    // the real flow — log a session with a set removed — not a load check.
    //
    // TWO THINGS FIXED HERE ON 2026-09-09.
    //
    // They ran in PARALLEL, all three driving the one test account, and each
    // spec wipes it clean — so Firefox was deleting the workout Safari was
    // halfway through asserting on. They are chained now, the same way the
    // goals specs are, and after the Chromium `training` project.
    //
    // And they only ran the old mobile spec. The two flows where an engine
    // difference actually bites are the live workout (a timer that must survive
    // a backgrounded tab, number inputs, a fixed grid at 390px) and the offline
    // queue (`setOffline`, local storage, the `online` event). Those run
    // everywhere now. The rest are API round trips that Chromium proves
    // adequately, and running them three times over would buy minutes of CI for
    // nothing.
    //
    // 2026-10-13: that rule now reaches inside the live-workout file too. Off
    // Chromium it runs only its four tests tagged @engine (the tick, the
    // finish, the backgrounded rest clock, the dropped reply); its other nine
    // are API round trips and single-engine logic. iPhone is a pull-request
    // lane; Android and Firefox are NIGHTLY (Q5).
    {
      name: 'training-iphone-safari',
      testMatch: [
        /mobile\/mobile-training\.spec\.ts/,
        /programs-live-workout\.spec\.ts/,
        /programs-offline\.spec\.ts/,
      ],
      grep: TRAINING_OFF_CHROMIUM,
      fullyParallel: false,
      workers: 1,
      dependencies: ['training'],
      use: { ...devices['iPhone 14'], storageState: TRAINING_STATE },
    },
    {
      name: 'training-android',
      testMatch: [
        /mobile\/mobile-training\.spec\.ts/,
        /programs-live-workout\.spec\.ts/,
        /programs-offline\.spec\.ts/,
      ],
      grep: TRAINING_OFF_CHROMIUM,
      fullyParallel: false,
      workers: 1,
      dependencies: ['training-iphone-safari'],
      use: { ...devices['Pixel 7'], storageState: TRAINING_STATE },
    },
    {
      name: 'training-firefox',
      testMatch: [
        /mobile\/mobile-training\.spec\.ts/,
        /programs-live-workout\.spec\.ts/,
        /programs-offline\.spec\.ts/,
        // A SECOND ENGINE AT DESKTOP WIDTH. The fault this file owns was pure
        // layout — an absolutely positioned delete button sitting on the ✓
        // from 640px up — and layout is exactly what differs between engines,
        // so verifying the fix on Chromium alone verified it on one grid
        // implementation. The file sets its own viewport per test, so the
        // 390px default above does not apply to it.
        /programs-live-desktop\.spec\.ts/,
      ],
      grep: TRAINING_OFF_CHROMIUM,
      fullyParallel: false,
      workers: 1,
      dependencies: ['training-android'],
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 }, storageState: TRAINING_STATE },
    },

    // === Auth on a phone ===
    // The signed-out flows -- signup, confirmation, password reset -- are the
    // first thing every new user meets, and until 2026-09-04 they were tested
    // on Chromium alone. The risk is not layout (measured fine at 390px) but
    // Safari's stricter cookie handling, which is exactly the machinery the
    // confirmation link depends on. No storageState: these are logged-out.
    //
    // Chromium (`no-auth`) and the iPhone, since 2026-10-13. Desktop Safari is
    // the same WebKit cookie machinery as the iPhone, and Firefox and Android
    // had never found a fault here that those two did not (Q5).
    {
      name: 'auth-iphone',
      testMatch: [/signup-flow\.spec\.ts/, /password-reset\.spec\.ts/],
      use: { ...devices['iPhone 14'] },
    },

    // === Cross-browser smoke (unauthenticated only) ===
    // The pattern is anchored. Unanchored, /smoke\.spec\.ts/ also matched
    // variant-a-v4-smoke, variant-b-smoke and variant-d-smoke -- three
    // prototype specs for /test/goalsv4 -- so each of these four projects ran
    // 27 tests of which only 5 were the real smoke test, and the same loose
    // pattern in the chromium ignore list kept the prototypes out of the one
    // project that should have run them. They were deleted on 2026-10-13.
    //
    // Two tests, both about what a browser paints or follows: the auth gate's
    // redirect and the font. The iPhone is a pull-request lane; Firefox,
    // desktop Safari and Android are NIGHTLY (Q5).
    {
      name: 'smoke-firefox',
      testMatch: /(?:^|\/)smoke\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'smoke-webkit',
      testMatch: /(?:^|\/)smoke\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'smoke-iphone',
      testMatch: /(?:^|\/)smoke\.spec\.ts$/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'smoke-android',
      testMatch: /(?:^|\/)smoke\.spec\.ts$/,
      use: { ...devices['Pixel 7'] },
    },

    // === Goals tests (one file per project) ===
    // These files share a test user and write goals data. `goals-1`, `goals-2`
    // and `goals-tour` drove the archived goals hub under `/test/archive` and
    // were deleted on 2026-10-13 with their specs.
    {
      name: 'goals-3',
      testMatch: /life-mastery-track\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    /**
     * The day half's acceptance, and it depends on `setup` ALONE on purpose.
     *
     * It was chained behind `goals-3` for tidiness, which cost it the one thing
     * it is for: Playwright SKIPS a project whose dependency failed, `goals-1`
     * (since deleted) was red, and a skipped spec reports as a green run. The trap
     * this plan already records — a spec that runs nowhere — reached for it
     * through the back door.
     *
     * Safe to run beside the goals files: its day writes use dates in 2019 that
     * nothing else in the suite touches, and its single whole-plan PUT already
     * accepts a 409, which is what a concurrent plan save from another spec
     * looks like. If anything, a plan being saved underneath it while a day is
     * written is a harder version of the thing it is proving.
     */
    {
      name: 'goals-4',
      testMatch: /life-mastery-day-persists\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Session-creating tests ===
    // These create and end sessions for the shared user, and one account can
    // hold one active session, so they run after `chromium` rather than beside
    // it. Three more files used to queue here — approach-logging,
    // data-persistence and start-session — and were merged into this one on
    // 2026-10-13.
    //
    // EMPTY since Phase 8: session-tracking runs in `desktop`, where each
    // worker's account holds its own one active session. Kept only because
    // e2e.yml still names it; delete it there and here together.
    {
      name: 'session-1',
      testMatch: [],
      dependencies: ['chromium', 'security-multi-user'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Auth-destructive tests (run LAST - login/logout invalidates shared session) ===
    // EMPTY since Phase 8: auth.spec logs out a `throwawayAccount` of its own,
    // in `desktop`, so it ends nobody else's session. Kept only because e2e.yml
    // still names it; delete it there and here together.
    {
      name: 'auth-destructive',
      testMatch: [],
      dependencies: ['chromium', 'security-multi-user', 'session-1'],
      use: { ...devices['Desktop Chrome'] },
    },

    // === Phone-only checks, on iPhone 14 ===
    // Things that only exist or only break at phone width. Until 2026-10-13
    // this project re-ran six desktop specs at 390px (and `mobile-pixel` ran
    // them again on a Pixel), and `mobile-nav` was a project of its own on the
    // same iPhone for one file. The session flow keeps one phone test of its
    // own; the tracker's phone suite lives in `timetrack-sync-phone`.
    {
      name: 'mobile-iphone',
      testMatch: [
        /mobile\/mobile-session\.spec\.ts/,
        /mobile\/mobile-life-mastery-day\.spec\.ts/,
        // The header's menu: genuine phone-only UI
        /mobile\/mobile-navigation\.spec\.ts/,
        /*
         * NOT mobile-training.spec.ts. It shares the one test account with the
         * `training` project, which runs in the OTHER CI job — and the two jobs
         * have no `needs:` between them, so they run at the same time and wipe
         * each other's enrollments mid-assertion. That is the exact race the
         * serial `training` project exists to prevent, reintroduced by listing
         * the spec in two places. It runs in `training-iphone-safari`, which is
         * chained behind `training`.
         */
      ],
      dependencies: ['setup'],
      use: {
        ...devices['iPhone 14'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Cross-browser authenticated tests (Firefox + WebKit; traces locally only) ===
    // NIGHTLY (Q5). Only vice-cross is left in cross-browser/ since 2026-10-13.
    {
      name: 'cross-firefox',
      testMatch: /cross-browser\//,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/user.json',
        trace: process.env.CI ? 'off' : 'on',
      },
    },
    {
      name: 'cross-webkit',
      testMatch: /cross-browser\//,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/.auth/user.json',
        trace: process.env.CI ? 'off' : 'on',
      },
    },

    // === Derived sweeps: every page, no hand-written list ===
    // These read the app's own route tree (tests/support/appRoutes.ts) rather
    // than a list somebody maintains, so a new page is covered the day it
    // exists. Run on a desktop, on a phone and on Safari's engine, because the
    // faults they look for -- a garbled URL, a scroll box taller than the
    // screen, a tap target under a thumb -- do not all show up on one of them.
    {
      name: 'sweep-desktop',
      testMatch: /sweep\//,
      dependencies: ['setup'],
      // These navigate to every page in the app. Against `npm run dev` each
      // route is compiled on first request, and three sweep projects at once
      // queue behind that compiler -- so the default 60s is not enough locally.
      // CI runs a production build, where this is never approached.
      timeout: 180_000,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
    },
    {
      name: 'sweep-phone',
      testMatch: /sweep\//,
      dependencies: ['setup'],
      // These navigate to every page in the app. Against `npm run dev` each
      // route is compiled on first request, and three sweep projects at once
      // queue behind that compiler -- so the default 60s is not enough locally.
      // CI runs a production build, where this is never approached.
      timeout: 180_000,
      use: { ...devices['iPhone 14'], storageState: 'tests/e2e/.auth/user.json' },
    },
    // NIGHTLY (Q5): desktop and phone are the pull-request lanes.
    {
      name: 'sweep-webkit',
      testMatch: /sweep\//,
      dependencies: ['setup'],
      // These navigate to every page in the app. Against `npm run dev` each
      // route is compiled on first request, and three sweep projects at once
      // queue behind that compiler -- so the default 60s is not enough locally.
      // CI runs a production build, where this is never approached.
      timeout: 180_000,
      use: { ...devices['Desktop Safari'], storageState: 'tests/e2e/.auth/user.json' },
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
