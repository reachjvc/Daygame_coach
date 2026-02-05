import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { ensureNoActiveSessionViaAPI } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

test.describe('Session Tracking Flow', () => {
  // Run tests sequentially to avoid session conflicts (same user can only have one active session)
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
      // Close quick log modal if open (might be left from previous test)
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
    // Arrange: Navigate to session tracker
    await ensureCleanSession(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: End any active session via API to prevent conflicts
    await ensureNoActiveSessionViaAPI(page)
  })

  test('should display start session screen when no active session', async ({ page }) => {
    // Assert: Start session button should be visible
    await expect(page.getByTestId(SELECTORS.session.startButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Session Tracker')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should open start session dialog when clicking start button', async ({ page }) => {
    // Wait for start button and click
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Dialog should appear with goal input and confirm button
    await expect(page.getByTestId(SELECTORS.session.goalInput)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.confirmButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should start session and show counter at 0', async ({ page }) => {
    // Wait for start button and click
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for confirm button and click
    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())

    // Assert: Should show approach counter at 0
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
  })

  test('should start session with custom goal', async ({ page }) => {
    // Wait for start button and click
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    // Fill goal input
    await page.getByTestId(SELECTORS.session.goalInput).fill('5', { timeout: ACTION_TIMEOUT })

    // Wait for confirm button and click
    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())

    // Assert: Should show approach counter at 0 and goal progress
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Goal Progress')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should increment approach counter when tapping', async ({ page }) => {
    // Arrange: Start a session first
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Act: Tap for approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Counter should increment to 1
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })
  })

  test('should show quick log modal after tapping approach', async ({ page }) => {
    // Arrange: Start a session
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Act: Tap for approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Quick log modal should appear
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogSave)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show session duration during active session', async ({ page }) => {
    // Arrange: Start a session
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Duration should be visible
    await expect(page.getByTestId(SELECTORS.session.duration)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show end session button during active session', async ({ page }) => {
    // Arrange: Start a session
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: End button should be visible
    await expect(page.getByTestId(SELECTORS.session.endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should end session and navigate to tracking dashboard', async ({ page }) => {
    // Arrange: Start a session
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click end button and confirm
    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })

    // Wait for end dialog to appear and click End Session
    await expect(page.getByRole('button', { name: /end session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to tracking dashboard
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
    expect(page.url()).toContain('/dashboard/tracking')
  })

  // Regression tests: Session reset behavior
  // User reported session persisting after clicking end - could not replicate 30-01-2026
  // These tests guard against sessions not properly resetting

  test('should reset counter to 0 when starting new session after ending with approaches', async ({ page }) => {
    // Arrange: Start a session and add an approach
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Tap for an approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })

    // Dismiss quick log modal if visible
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    if (await quickLogModal.isVisible().catch(() => false)) {
      await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
      await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // Act: End the session
    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByRole('button', { name: /end session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate back to session page and start a new session
    await ensureCleanSession(page)

    const newStartButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(newStartButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await newStartButton.click({ timeout: ACTION_TIMEOUT })

    const newConfirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(newConfirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await newConfirmButton.evaluate((el: HTMLElement) => el.click())

    // Assert: Counter should be 0, not carrying over from previous session
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
  })

  test('should reset counter to 0 when starting new session after ending without approaches', async ({ page }) => {
    // Arrange: Start a session but don't add any approaches
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Act: End the session immediately (no approaches)
    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByRole('button', { name: /end session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate back to session page and start a new session
    await ensureCleanSession(page)

    const newStartButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(newStartButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await newStartButton.click({ timeout: ACTION_TIMEOUT })

    const newConfirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(newConfirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await newConfirmButton.evaluate((el: HTMLElement) => el.click())

    // Assert: Counter should be 0
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
  })

  // Zombie session prevention: browser back navigation should not show ended session as active
  // Bug: bfcache restores old React state, showing active session UI for an ended session
  test('should show session-ended state when navigating back to ended session via browser history', async ({ page }) => {
    // Arrange: Start a session and add an approach
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Add an approach to create some interaction
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })

    // Dismiss quick log modal
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    if (await quickLogModal.isVisible().catch(() => false)) {
      await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
      await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // End session via dialog (clicks "End Session" which redirects to dashboard)
    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByRole('button', { name: /end session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate to field report page (simulating user writing report after session)
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Navigate back via browser history (simulating user pressing back button)
    // This should trigger the zombie session scenario where bfcache restores old state
    await page.goBack({ timeout: AUTH_TIMEOUT })
    await page.goBack({ timeout: AUTH_TIMEOUT })

    // Wait for page to settle
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Should NOT show the active session UI (tap button, active counter)
    // The tap button should NOT be visible - that's the "zombie" state we want to prevent
    const tapButton = page.getByTestId(SELECTORS.session.tapButton)
    const isZombie = await tapButton.isVisible().catch(() => false)

    if (isZombie) {
      // If we see the tap button, the zombie bug exists - test should fail with clear message
      // Expected behavior: show session-ended banner with edit option
      await expect(page.getByTestId(SELECTORS.session.sessionEndedBanner)).toBeVisible({
        timeout: AUTH_TIMEOUT,
      })
    } else {
      // Good path: either shows start screen or session-ended state
      // Both are acceptable - just not the active session UI
      const sessionEndedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
      const startButton = page.getByTestId(SELECTORS.session.startButton)

      // One of these should be visible
      await expect(sessionEndedBanner.or(startButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should provide edit session option when viewing ended session', async ({ page }) => {
    // Arrange: Start a session and add an approach
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

    // Add an approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })

    // Dismiss quick log modal
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    if (await quickLogModal.isVisible().catch(() => false)) {
      await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
      await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // End session
    await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByRole('button', { name: /end session/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByRole('button', { name: /end session/i }).click({ timeout: ACTION_TIMEOUT })
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate to field report then back
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await page.goBack({ timeout: AUTH_TIMEOUT })
    await page.goBack({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: If session-ended banner is shown, edit button should be available
    const sessionEndedBanner = page.getByTestId(SELECTORS.session.sessionEndedBanner)
    const bannerVisible = await sessionEndedBanner.isVisible().catch(() => false)

    if (bannerVisible) {
      // Edit button should be visible when in session-ended state
      await expect(page.getByTestId(SELECTORS.session.editSessionButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
    // If banner isn't visible, we're in start-session state which is also acceptable
  })

  // Note: The UI now handles checking for active sessions before starting a new one.
  // When an active session exists and user tries to start a new one, a dialog is shown
  // offering "Resume Session" or "Start Fresh" options. The "Start Fresh" option
  // abandons the old session and marks it with end_reason='abandoned'.
  // Testing this flow requires more complex E2E setup with multiple browser contexts.
})
