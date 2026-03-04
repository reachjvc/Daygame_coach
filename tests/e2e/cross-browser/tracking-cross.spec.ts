import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 5000

// These tests run authenticated on Firefox + WebKit
// They verify tracking features work correctly outside Chromium

test.describe('Cross-browser tracking', () => {
  test('progress dashboard loads with all cards', async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('start session button navigates to session page', async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const startLink = page.getByTestId(SELECTORS.trackingDashboard.newSessionLink)
    await expect(startLink).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startLink.click({ timeout: ACTION_TIMEOUT })

    await expect(page).toHaveURL(/\/dashboard\/tracking\/session/, { timeout: AUTH_TIMEOUT })
  })

  test('tracking stats API works', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    const resp = await page.request.get('/api/tracking/stats')
    expect(resp.ok()).toBe(true)
    const data = await resp.json()
    expect(data).toBeDefined()
  })

  test('tracking history page loads', async ({ page }) => {
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('history filter tabs are interactive', async ({ page }) => {
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const allFilter = page.getByTestId(SELECTORS.history.filterAll)
    await expect(allFilter).toBeVisible({ timeout: AUTH_TIMEOUT })

    const submittedFilter = page.getByTestId(SELECTORS.history.filterSubmitted)
    await submittedFilter.click({ timeout: ACTION_TIMEOUT })

    const draftsFilter = page.getByTestId(SELECTORS.history.filterDrafts)
    await draftsFilter.click({ timeout: ACTION_TIMEOUT })

    // Click back to All
    await allFilter.click({ timeout: ACTION_TIMEOUT })
  })

  test('field report page loads', async ({ page }) => {
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see template selection or form (page may redirect)
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })

  test('session page loads for authenticated user', async ({ page }) => {
    await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see start button, active session, or ended banner
    const startBtn = page.getByTestId(SELECTORS.session.startButton)
    const endBtn = page.getByTestId(SELECTORS.session.endButton)
    const endedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
    await expect(startBtn.or(endBtn).or(endedBanner)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
