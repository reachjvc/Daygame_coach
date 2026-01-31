import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Data Persistence - Session State', () => {
  // Run tests sequentially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  async function ensureCleanSession(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const startButton = page.getByTestId(SELECTORS.session.startButton)
    const endButton = page.getByTestId(SELECTORS.session.endButton)
    await expect(startButton.or(endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const hasActiveSession = await endButton.isVisible().catch(() => false)
    if (hasActiveSession) {
      const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
      if (await quickLogModal.isVisible().catch(() => false)) {
        await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
        await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
      }

      await endButton.click({ timeout: ACTION_TIMEOUT })
      await page.getByRole('button', { name: /end session/i }).click({ timeout: AUTH_TIMEOUT })
      await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
      await ensureCleanSession(page)
    }
  }

  async function startSession(page: import('@playwright/test').Page) {
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toBeVisible({ timeout: AUTH_TIMEOUT })
  }

  async function endSession(page: import('@playwright/test').Page) {
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    if (await quickLogModal.isVisible().catch(() => false)) {
      await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
      await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: AUTH_TIMEOUT })
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  }

  test.beforeEach(async ({ page }) => {
    // Arrange: Login and ensure clean state
    await login(page)
    await ensureCleanSession(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: End any active session
    await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const endButton = page.getByTestId(SELECTORS.session.endButton)
    const hasActiveSession = await endButton.isVisible().catch(() => false)
    if (hasActiveSession) {
      await endSession(page)
    }
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
    // Arrange: Login and navigate to tracking dashboard
    await login(page)
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Get initial stats values
    const totalApproaches = page.getByTestId(SELECTORS.trackingDashboard.totalApproaches)
    const totalSessions = page.getByTestId(SELECTORS.trackingDashboard.totalSessions)
    await expect(totalApproaches).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(totalSessions).toBeVisible({ timeout: AUTH_TIMEOUT })

    const initialApproaches = await totalApproaches.textContent()
    const initialSessions = await totalSessions.textContent()

    // Act: Refresh the page
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Stats should persist (same values after refresh)
    await expect(totalApproaches).toHaveText(initialApproaches!, { timeout: AUTH_TIMEOUT })
    await expect(totalSessions).toHaveText(initialSessions!, { timeout: AUTH_TIMEOUT })
  })
})
