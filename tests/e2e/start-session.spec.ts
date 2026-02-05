import { test, expect } from '@playwright/test'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from './helpers/auth.helper'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

test.describe('Start Session', () => {
  // Run serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Arrange: Ensure clean session state
    await ensureCleanSessionPage(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: End any active session via API to prevent conflicts
    await ensureNoActiveSessionViaAPI(page)
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
