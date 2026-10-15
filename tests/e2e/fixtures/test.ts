/**
 * EVERY PLAYWRIGHT WORKER GETS AN ACCOUNT OF ITS OWN.
 *
 * Until Phase 8 of Plans/tests-worth-their-keep.md the whole browser suite
 * signed in as three real accounts, so two tests on one account deleted each
 * other's rows, and ten projects, `workers: 1` pins and `describe.serial`
 * blocks existed only to keep them apart. Here each worker makes a fresh,
 * confirmed account in the local test backend (fixtures/stack.ts), signs in to
 * it once through the app's own login page, and every test in that worker
 * opens its pages already signed in. Nothing is shared, so nothing is wiped.
 *
 * HOW A SPEC OPTS IN
 *
 *   import { test, expect } from './fixtures/test'      // not '@playwright/test'
 *
 * and nothing else: `page` and `context` are now signed in as the worker's
 * `account`. The spec must run in a project WITHOUT a `storageState` and
 * without a setup dependency — `desktop` in playwright.config.ts; add the file
 * to its list and take it out of the old project. Then, as the spec needs:
 *
 *   test('…', async ({ page, account }) => …)          // account.email, .id
 *   test('…', async ({ browser, secondUser }) => …)     // another person, for
 *       // row-security specs: browser.newContext({ storageState: secondUser.storageState })
 *   test('…', async ({ page, throwawayAccount }) => …)  // made for this test
 *       // alone, NOT signed in: for logging out (signOut is global, so it
 *       // would end every other test's session on a shared account) and for
 *       // anything else that ends or damages an account. signIn(page, it).
 *   test.use({ storageState: SIGNED_OUT })               // a signed-out file
 *   test.use({ accountTimezone: 'UTC' })                 // a different zone
 *
 * WHAT A FRESH ACCOUNT HOLDS: the profile row the real signup trigger makes,
 * and the timezone below, recorded as chosen. No dating answers, no program,
 * no goals, no purchase. A spec seeds what it needs itself, through the app's
 * routes (`seedDatingPreferences` is here for the scenario specs).
 *
 * A worker's tests run one after another on its account, so a spec whose tests
 * each need a clean slate still resets it in `beforeEach` (the training
 * helper's `resetAndEnroll`). What a spec no longer needs is `describe.serial`
 * or a project of its own for the sake of OTHER files.
 *
 * `E2E_SHARED_ACCOUNT=1` hands every worker the SAME account instead. A suite
 * that stays green with it set is not relying on its isolation; the proof the
 * plan asks for (R5) is that the pilot goes red with it and green without.
 * `secondUser` and `throwawayAccount` stay fresh either way: they are someone
 * else by definition.
 */
import { test as base, expect, type Browser, type Page, type WorkerInfo } from '@playwright/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { SELECTORS } from '../helpers/selectors'
import { fillSecret } from '../helpers/secret'
import { whenHydrated } from '../helpers/hydration'
import { findUserId, stackAdmin } from './stack'

export { expect }

/** For `test.use({ storageState: SIGNED_OUT })`: a page with no session at all. */
export const SIGNED_OUT = { cookies: [], origins: [] }

const AUTH_TIMEOUT = 15000

export interface Credentials {
  id: string
  email: string
  /** A random UUID. Typed only through `fillSecret`, never printed. */
  password: string
}

export interface SignedInAccount extends Credentials {
  /** Saved signed-in browser state, for `browser.newContext({ storageState })`. */
  storageState: string
}

/** A confirmed account in the test backend, its profile row made by the real trigger. */
async function createAccount(label: string): Promise<Credentials> {
  const email = `e2e-${label}-${randomUUID()}@test.local`
  const password = randomUUID()
  const { data, error } = await stackAdmin().auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`could not create the test account ${email}: ${error?.message}`)
  return { id: data.user.id, email, password }
}

/**
 * THE ONE ACCOUNT `E2E_SHARED_ACCOUNT=1` HANDS EVERY WORKER. A fixed address
 * makes it the same account in every worker process. Whichever worker arrives
 * first creates it; the rest are refused and look it up.
 */
async function theSharedAccount(): Promise<Credentials> {
  const email = 'e2e-shared-account@test.local'
  const password = 'e2e-shared-account-password'
  const created = await stackAdmin().auth.admin.createUser({ email, password, email_confirm: true })
  if (created.data.user) return { id: created.data.user.id, email, password }
  const id = await findUserId(email)
  if (!id) throw new Error(`could not create ${email} (${created.error?.message}), and it does not exist`)
  return { id, email, password }
}

/**
 * Signs in through the app's own login page, the way a person does — so a
 * login page that stops working fails every spec, loudly, at its first step.
 * Fails with the page's own error message rather than a URL timeout.
 */
export async function signIn(page: Page, account: Credentials): Promise<void> {
  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
  // Typing before React owns the form does a native submit: helpers/hydration.ts.
  await whenHydrated(page.getByTestId(SELECTORS.auth.emailInput), AUTH_TIMEOUT)
  await page.getByTestId(SELECTORS.auth.emailInput).fill(account.email, { timeout: AUTH_TIMEOUT })
  await fillSecret(page.getByTestId(SELECTORS.auth.passwordInput), account.password, { timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: AUTH_TIMEOUT })

  const refusal = page.getByTestId(SELECTORS.auth.errorMessage)
  await expect
    .poll(
      async () => {
        if (await refusal.isVisible()) return `refused: ${await refusal.textContent()}`
        return new URL(page.url()).pathname.startsWith('/auth/') ? 'still on the login page' : 'signed in'
      },
      {
        timeout: AUTH_TIMEOUT,
        message:
          `signing in as ${account.email} through the login page did not land. If PW_BASE_URL points at ` +
          'a server, it must use the test backend (playwright.config.ts, webServer.env).',
      },
    )
    .toBe('signed in')
}

/** Records the account's zone as CHOSEN, so the one-time browser sync never overwrites it. */
async function pinTimezone(page: Page, timezone: string): Promise<void> {
  const res = await page.request.put('/api/settings/time-preferences', { data: { timezone, source: 'chosen' } })
  expect(res.status(), `could not pin the account's timezone: ${await res.text()}`).toBe(200)
  expect(((await res.json()) as { timezone?: string }).timezone).toBe(timezone)
}

/** Creates (or, shared, finds) an account, signs it in once, and saves the signed-in state. */
async function provision(
  browser: Browser,
  workerInfo: WorkerInfo,
  label: string,
  timezone: string,
  credentials: () => Promise<Credentials>,
): Promise<SignedInAccount> {
  const account = await credentials()
  // Not under test-results/: every other Playwright run empties that folder when
  // it starts, and a second context opened from this file mid-run then finds
  // nothing. One folder per run — the workers' parent is the runner — so two
  // runs at once cannot overwrite each other's worker files either.
  const storageState = path.join(
    os.tmpdir(),
    'daygame-e2e-accounts',
    String(process.ppid),
    `${workerInfo.project.name}-${workerInfo.workerIndex}-${label}.json`,
  )
  const context = await browser.newContext({
    baseURL: workerInfo.project.use.baseURL,
    ignoreHTTPSErrors: workerInfo.project.use.ignoreHTTPSErrors,
  })
  try {
    const page = await context.newPage()
    await signIn(page, account)
    await pinTimezone(page, timezone)
    await context.storageState({ path: storageState })
  } finally {
    await context.close()
  }
  return { ...account, storageState }
}

/**
 * True while a test runs signed in as an account these fixtures made — a
 * throwaway in the local backend, never a person's. The training helper's
 * guard accepts it in place of the old training account.
 */
let onFixtureAccount = false
export function isOnFixtureAccount(): boolean {
  return onFixtureAccount
}

interface WorkerFixtures {
  /** This worker's own account, signed in. Every `page` is this account unless a spec says otherwise. */
  account: SignedInAccount
  /** A second person, signed in, for checking one account cannot reach another's rows. */
  secondUser: SignedInAccount
  /** The zone the worker's account is pinned to. Copenhagen, not UTC: a test that assumes the account and the CI runner share a calendar should fail. */
  accountTimezone: string
}

interface TestFixtures {
  /** An account made for this test alone, not signed in. Log it out, break it: nobody else is on it. */
  throwawayAccount: Credentials
}

// The second argument is Playwright's `use`, named `provide` here: the React
// hooks lint rule reads any `use(...)` call as a hook.
export const test = base.extend<TestFixtures, WorkerFixtures>({
  accountTimezone: ['Europe/Copenhagen', { scope: 'worker', option: true }],

  account: [
    async ({ browser, accountTimezone }, provide, workerInfo) => {
      const shared = process.env.E2E_SHARED_ACCOUNT === '1'
      await provide(
        await provision(browser, workerInfo, 'account', accountTimezone, () =>
          shared ? theSharedAccount() : createAccount(`w${workerInfo.workerIndex}`),
        ),
      )
    },
    { scope: 'worker' },
  ],

  secondUser: [
    async ({ browser }, provide, workerInfo) => {
      // Deliberately a different zone from the account's: a test that quietly
      // assumes two people share a calendar should fail here, not in production.
      await provide(
        await provision(browser, workerInfo, 'second', 'UTC', () => createAccount(`w${workerInfo.workerIndex}-b`)),
      )
    },
    { scope: 'worker' },
  ],

  storageState: async ({ account }, provide) => {
    onFixtureAccount = true
    try {
      await provide(account.storageState)
    } finally {
      onFixtureAccount = false
    }
  },

  // Playwright reads the fixtures a function needs from its first argument's
  // pattern, so it must be one, even when it needs none.
  // eslint-disable-next-line no-empty-pattern
  throwawayAccount: async ({}, provide, testInfo) => {
    await provide(await createAccount(`t${testInfo.workerIndex}`))
  },
})

/**
 * The answers the scenario screens ask for, given once on /preferences — the
 * same steps a person takes. For the specs that open scenarios; a fresh
 * account has none.
 */
export async function seedDatingPreferences(page: Page): Promise<void> {
  await page.goto(ROUTES.scenarioPreferences, { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.datingPreferences.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
  // The list, not the map: a country shape is ~9px on a phone.
  await page.getByTestId('region-option-western-europe').click()
  await page.getByTestId(SELECTORS.datingPreferences.archetype('Corporate Powerhouse')).click()
  await page.getByTestId(SELECTORS.datingPreferences.userIsForeign).getByRole('button', { name: 'No' }).click()
  await page.getByTestId(SELECTORS.datingPreferences.datingForeigners).getByRole('button', { name: 'No' }).click()
  const submit = page.getByTestId(SELECTORS.datingPreferences.submit)
  await expect(submit).toBeEnabled()
  await submit.click()
  await page.waitForURL(urlOf(ROUTES.dashboard), { timeout: AUTH_TIMEOUT })
}
