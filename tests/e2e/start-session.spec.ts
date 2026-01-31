import { test, expect } from '@playwright/test'
import { login } from './helpers/auth.helper'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

test.describe('Start Session', () => {
  // Run serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  async function ensureCleanSession(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/tracking/session', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Wait for page content to load (either start button or active session view)
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    const endButton = page.getByTestId(SELECTORS.session.endButton)
    await expect(startButton.or(endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // If there's an active session, end it first to ensure clean state
    const hasActiveSession = await endButton.isVisible().catch(() => false)
    if (hasActiveSession) {
      // Close quick log modal if open
      const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
      if (await quickLogModal.isVisible().catch(() => false)) {
        await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
        await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
      }

      await endButton.click({ timeout: ACTION_TIMEOUT })
      await page.getByRole('button', { name: /end session/i }).click({ timeout: AUTH_TIMEOUT })
      await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

      // Recursively ensure we have a clean session
      await ensureCleanSession(page)
      return
    }
  }

  test.beforeEach(async ({ page }) => {
    // Arrange: Login first
    await login(page)
    await ensureCleanSession(page)
  })

  test('should display 0 approaches when starting a new session', async ({ page }) => {
    // Wait for page to load (Start Session button visible)
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click Start Session button to open dialog
    await page.getByRole('button', { name: /start session/i }).click({ timeout: ACTION_TIMEOUT })

    // Wait for dialog to appear and click the confirm button
    // Button is at bottom of scrollable dialog - use JS click
    const startButton = page.getByTestId('start-session-confirm')
    await expect(startButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await startButton.evaluate((el: HTMLElement) => el.click())

    // Assert: The main counter should show 0 approaches
    await expect(page.getByTestId('approach-counter')).toHaveText('0', { timeout: AUTH_TIMEOUT })
    await expect(page.getByText('approaches')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
