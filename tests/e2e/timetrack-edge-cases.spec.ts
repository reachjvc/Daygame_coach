/**
 * The situations that are not the happy path.
 *
 * The first test here is a bug that reached the user: their session expired
 * while the tab was open, the queue retried against a dead session forever, and
 * the badge sat on "Saving 43…". The only way out was to notice, reload, and
 * sign in by hand. That is the app failing quietly and making the person work
 * it out — the exact thing a status indicator exists to prevent.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const PAGE = '/test/toggl'
const STORAGE_KEY = 'toggl-clone:v1'
const PENDING_KEY = 'toggl-clone:pending'

async function openFresh(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([state, pending]) => {
      window.localStorage.removeItem(state)
      window.localStorage.removeItem(pending)
    },
    [STORAGE_KEY, PENDING_KEY],
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)

  // the account is shared between these tests, so a timer left running by an
  // earlier one arrives with the server copy. Stop it, or the next Start click
  // has no button to press.
  const stop = page.locator('main').getByRole('button', { name: 'Stop timer' })
  if (await stop.isVisible().catch(() => false)) {
    await stop.click()
    await page.waitForTimeout(800)
  }
}

async function trackEntry(page: Page, description: string) {
  await page.getByPlaceholder('What are you working on?').fill(description)
  await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
  const stop = page.locator('main').getByRole('button', { name: 'Stop timer' })
  await stop.waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  await stop.click()
  await expect(page.locator(`main input[value="${description}"]`).first()).toBeVisible({ timeout: 15000 })
}

/** Throw away the session cookies without touching anything else */
async function expireSession(context: BrowserContext) {
  await context.clearCookies()
}

test.describe('edge cases', () => {
  test.describe.configure({ mode: 'serial' })

  test('being signed out mid-session says so, and offers the way back', async ({ page, context }) => {
    await openFresh(page)
    await expireSession(context)
    await trackEntry(page, 'typed after the session ended')

    // it must notice by itself, without a reload
    const banner = page.getByText('You have been signed out')
    await expect(banner).toBeVisible({ timeout: 20000 })

    // and the way back is a link, not a guess
    const signIn = page.getByRole('link', { name: 'Sign in again' })
    await expect(signIn).toBeVisible()
    const href = await signIn.getAttribute('href')
    expect(href, 'signing in must return you to where you were').toContain('next=')

    // the work itself is untouched
    await expect(page.locator('main input[value="typed after the session ended"]').first()).toBeVisible()
  })

  test('nothing queued is thrown away while signed out', async ({ page, context }) => {
    await openFresh(page)
    await expireSession(context)
    await trackEntry(page, 'still mine')
    await page.waitForTimeout(4000)

    const pending = await page.evaluate((key) => window.localStorage.getItem(key), PENDING_KEY)
    expect(pending, 'the queue was dropped when the session ended').toBeTruthy()
    expect(pending!.length).toBeGreaterThan(2)
  })

  test('the tracker keeps working with no account at all', async ({ browser }) => {
    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await anon.newPage()
    await openFresh(page)
    await trackEntry(page, 'signed out entirely')

    // it says where the work is, rather than pretending to sync
    await expect(page.getByText('This device only')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('main input[value="signed out entirely"]').first()).toBeVisible()
    await anon.close()
  })

  // The "expand and choose" behaviour is covered in
  // tests/unit/timetrack/importOfferBanner.test.tsx. It lived here first and
  // needed three page reloads against a shared account to set itself up, which
  // made it flaky without making it more truthful.

  test('"Not now" is not a one-way door', async ({ page }) => {
    await openFresh(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Data', exact: true }).click()
    await expect(page.getByRole('button', { name: /Upload this browser/ })).toBeVisible({ timeout: 10000 })
  })
})
