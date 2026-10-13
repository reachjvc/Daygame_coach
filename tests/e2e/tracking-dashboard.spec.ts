import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { ensureNoActiveSessionViaAPI } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * The tracking dashboard's doors lead where they say, and Quick Add opens.
 *
 * Two tests. Of the nine, four were achievement tests wrapped in
 * `if (visible)`, which pass on an account with no achievements — this one —
 * and the stat tiles are tracking-tiles.spec.ts's.
 */
test.describe('Tracking Dashboard', () => {
  test.afterEach(async ({ page }) => {
    // "New session" links to `?autostart=true`, which can start one
    await ensureNoActiveSessionViaAPI(page)
  })

  test('the dashboard links open a session, a field report and the weekly review', async ({ page }) => {
    for (const [testId, destination] of [
      [SELECTORS.trackingDashboard.newSessionLink, /\/dashboard\/tracking\/session/],
      [SELECTORS.trackingDashboard.fieldReportLink, /\/dashboard\/tracking\/report/],
      [SELECTORS.trackingDashboard.weeklyReviewLink, /\/dashboard\/tracking\/review/],
    ] as const) {
      await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
      await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
      await page.getByTestId(testId).click({ timeout: ACTION_TIMEOUT })
      await page.waitForURL(destination, { timeout: AUTH_TIMEOUT })
    }
  })

  test('Quick Add opens a form for a past session, and closes again', async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.getByTestId(SELECTORS.trackingDashboard.quickAddButton).click({ timeout: AUTH_TIMEOUT })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
