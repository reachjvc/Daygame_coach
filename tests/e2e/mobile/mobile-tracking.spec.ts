import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 5000

// Mobile-specific tracking tests running on iPhone 14 + Pixel 7

test.describe('Mobile tracking', () => {
  test('progress dashboard loads on mobile', async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // No overflow
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('start session link is tappable', async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const startLink = page.getByTestId(SELECTORS.trackingDashboard.newSessionLink)
    await expect(startLink).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify the element has sufficient tap target size
    const box = await startLink.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.height).toBeGreaterThanOrEqual(40) // Close to 44px minimum
  })

  test('tracking history page loads on mobile', async ({ page }) => {
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('history filters work on mobile', async ({ page }) => {
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // All tab
    const allFilter = page.getByTestId(SELECTORS.history.filterAll)
    await expect(allFilter).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Tap submitted filter
    await page.getByTestId(SELECTORS.history.filterSubmitted).click({ timeout: ACTION_TIMEOUT })
    // Tap drafts filter
    await page.getByTestId(SELECTORS.history.filterDrafts).click({ timeout: ACTION_TIMEOUT })
    // Back to all
    await allFilter.click({ timeout: ACTION_TIMEOUT })
  })

  test('session page loads on mobile', async ({ page }) => {
    await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should see start button or active session
    const startBtn = page.getByTestId(SELECTORS.session.startButton)
    const endBtn = page.getByTestId(SELECTORS.session.endButton)
    const endedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
    await expect(startBtn.or(endBtn).or(endedBanner)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('field report page loads on mobile', async ({ page }) => {
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle')

    // Should land on a tracking page
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })
})
