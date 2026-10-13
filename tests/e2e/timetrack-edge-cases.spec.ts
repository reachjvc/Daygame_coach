/**
 * The situations that are not the happy path, on the product route.
 *
 * The first test here is a bug that reached the user: their session expired
 * while the tab was open, the queue retried against a dead session forever, and
 * the badge sat on "Saving 43…". The only way out was to notice, reload, and
 * sign in by hand. That is the app failing quietly and making the person work
 * it out — the exact thing a status indicator exists to prevent.
 *
 * "The tracker keeps working with no account at all" lived here and is gone:
 * it opened the signed-out lab page. The product route sends a stranger to log
 * in (protected-routes.spec.ts), so that state cannot be reached from it.
 */

import { type Page } from '@playwright/test'
import { test, expect } from './fixtures/test'
import { PENDING_KEY, entryInList, openFreshTracker, trackEntry } from './helpers/timetrack'

/**
 * Settings is a tab on a pointer device and lives behind "More" on a phone,
 * where the section bar is four tabs plus a sheet — six at 390px meant 10px
 * labels. This spec runs in both projects, so it has to know both ways in.
 */
async function goToSettings(page: Page) {
  // Whichever bar is on screen. Only the phone bar carries `aria-label="Sections"`
  // — the pointer-device tab row is an unnamed <nav> — and deliberately so: the
  // product-route test in timetrack-sync asserts exactly ONE element has that
  // label, which is how it proves two bottom bars are never stacked.
  const tabs = page.getByRole('button', { name: 'Settings', exact: true })
  for (let i = 0; i < (await tabs.count()); i++) {
    if (await tabs.nth(i).isVisible()) {
      await tabs.nth(i).click()
      return
    }
  }
  await page.locator('nav[aria-label="Sections"]').getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click()
}

// No serial mode: each worker signs in to an account of its own and every test
// empties it first, so these may run side by side. `clearCookies` drops only
// this test's browser cookies; the session itself is not ended on the server.
test.describe('edge cases', () => {
  test('being signed out mid-session says so, and offers the way back', async ({ page, context }) => {
    await openFreshTracker(page)
    // Throw away the session cookies without touching anything else
    await context.clearCookies()
    await trackEntry(page, 'typed after the session ended')

    // it must notice by itself, without a reload
    await expect(page.getByText('You have been signed out')).toBeVisible({ timeout: 20_000 })

    // and the way back is a link, not a guess
    const signIn = page.getByRole('link', { name: 'Sign in again' })
    await expect(signIn).toBeVisible()
    const href = await signIn.getAttribute('href')
    expect(href, 'signing in must return you to where you were').toContain('next=')

    // the work itself is untouched
    await expect(entryInList(page, 'typed after the session ended').first()).toBeVisible()
  })

  test('nothing queued is thrown away while signed out', async ({ page, context }) => {
    await openFreshTracker(page)
    await context.clearCookies()
    await trackEntry(page, 'still mine')

    // the upload has been tried and refused — that is when a queue could be dropped
    await expect(page.getByText('You have been signed out')).toBeVisible({ timeout: 20_000 })

    const pending = await page.evaluate((key) => window.localStorage.getItem(key), PENDING_KEY)
    expect(pending, 'the queue was dropped when the session ended').toBeTruthy()
    expect(pending).toContain('still mine')
  })

  // The "expand and choose" behaviour is covered in
  // tests/unit/timetrack/importOfferBanner.test.tsx. It lived here first and
  // needed three page reloads against a shared account to set itself up, which
  // made it flaky without making it more truthful.

  test('"Not now" is not a one-way door', async ({ page }) => {
    await openFreshTracker(page)
    await goToSettings(page)
    await page.getByRole('button', { name: 'Data', exact: true }).click()
    await expect(page.getByRole('button', { name: /Upload this browser/ })).toBeVisible({ timeout: 10_000 })
  })
})
