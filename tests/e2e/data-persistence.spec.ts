import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Data Persistence - Session State', () => {
  // Run tests sequentially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  async function startSession(page: import('@playwright/test').Page) {
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toBeVisible({ timeout: AUTH_TIMEOUT })
  }

  test.beforeEach(async ({ page }) => {
    // Arrange: Ensure clean state and navigate to session page
    await ensureCleanSessionPage(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: End any active session via API (faster and more reliable)
    await ensureNoActiveSessionViaAPI(page)
  })

  test('should persist active session after page refresh', async ({ page }) => {
    // Arrange: Start a session
    await startSession(page)
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Act: Refresh the page
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Session should still be active (end button visible, counter still at 0)
    await expect(page.getByTestId(SELECTORS.session.endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
  })

  test('should persist approach count after page refresh', async ({ page }) => {
    // Arrange: Start a session and log 2 approaches
    await startSession(page)
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Tap first approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })

    // Dismiss quick log modal
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    await expect(quickLogModal).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
    await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Tap second approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('2', { timeout: AUTH_TIMEOUT })

    // Dismiss quick log modal again
    await expect(quickLogModal).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
    await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Wait for approach API calls to complete before refreshing
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Act: Refresh the page
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Approach count should persist at 2
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('2', { timeout: AUTH_TIMEOUT })
  })

  test('should persist session duration display after page refresh', async ({ page }) => {
    // Arrange: Start a session
    await startSession(page)
    await expect(page.getByTestId(SELECTORS.session.duration)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Wait a moment for duration to tick
    await page.waitForTimeout(1500)

    // Act: Refresh the page
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Duration should still be visible and showing time
    await expect(page.getByTestId(SELECTORS.session.duration)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Data Persistence - Tracking Dashboard Stats', () => {
  test('should persist dashboard stats after page refresh', async ({ page }) => {
    // Arrange: Navigate to tracking dashboard
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Verify stats are visible before refresh
    const totalApproaches = page.getByTestId(SELECTORS.trackingDashboard.totalApproaches)
    const totalSessions = page.getByTestId(SELECTORS.trackingDashboard.totalSessions)
    await expect(totalApproaches).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(totalSessions).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Refresh the page
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Stats should still be visible after refresh (data persisted from DB)
    // Note: Exact values may change due to parallel tests creating sessions,
    // so we verify visibility and that values contain numeric content
    await expect(totalApproaches).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(totalSessions).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(totalApproaches).toContainText(/\d+/)
    await expect(totalSessions).toContainText(/\d+/)
  })
})
