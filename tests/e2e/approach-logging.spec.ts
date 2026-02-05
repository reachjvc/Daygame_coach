import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Approach Logging Flow', () => {
  // Run tests sequentially to avoid session conflicts
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
        await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
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

    // Start a fresh session for each test
    const startButton = page.getByTestId(SELECTORS.session.startButton)
    await expect(startButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await startButton.click({ timeout: ACTION_TIMEOUT })

    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
    await confirmButton.evaluate((el: HTMLElement) => el.click())
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: Close quick log modal if open
    const quickLogModal = page.getByTestId(SELECTORS.session.quickLogModal)
    if (await quickLogModal.isVisible().catch(() => false)) {
      await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
      await expect(quickLogModal).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // Cleanup: End session if still active
    const endButton = page.getByTestId(SELECTORS.session.endButton)
    const hasActiveSession = await endButton.isVisible().catch(() => false)
    if (hasActiveSession) {
      await endButton.click({ timeout: ACTION_TIMEOUT })
      await page.getByRole('button', { name: /end session/i }).click({ timeout: AUTH_TIMEOUT })
      await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
    }
  })

  test('should open quick log modal after tapping approach', async ({ page }) => {
    // Act: Tap for approach
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })

    // Assert: Quick log modal should appear
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogSave)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogDismiss)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should save approach with outcome selection', async ({ page }) => {
    // Arrange: Tap for approach to open quick log
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Select an outcome and save
    await page.getByTestId(SELECTORS.session.outcome('number')).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })

    // Assert: Modal should close and approach should be counted
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })
  })

  test('should save approach with mood and tags', async ({ page }) => {
    // Arrange: Tap for approach to open quick log
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Select mood, tag, and save
    await page.getByTestId(SELECTORS.session.mood(4)).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.tag('day')).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })

    // Assert: Modal should close and approach should be counted
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })
  })

  test('should dismiss modal without saving details', async ({ page }) => {
    // Arrange: Tap for approach to open quick log
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Dismiss the modal without selecting anything
    await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })

    // Assert: Modal should close and approach should still be counted
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })
  })

  test('should toggle outcome selection', async ({ page }) => {
    // Arrange: Tap for approach to open quick log
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Select an outcome then deselect it
    const outcomeButton = page.getByTestId(SELECTORS.session.outcome('blowout'))
    await outcomeButton.click({ timeout: ACTION_TIMEOUT })

    // Verify it's selected (has active styling)
    await expect(outcomeButton).toHaveClass(/bg-red-500/, { timeout: ACTION_TIMEOUT })

    // Deselect by clicking again
    await outcomeButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Button should no longer have active styling
    await expect(outcomeButton).not.toHaveClass(/bg-red-500/, { timeout: ACTION_TIMEOUT })
  })

  test('should allow selecting multiple tags', async ({ page }) => {
    // Arrange: Tap for approach to open quick log
    await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Select multiple tags
    const dayTag = page.getByTestId(SELECTORS.session.tag('day'))
    const streetTag = page.getByTestId(SELECTORS.session.tag('street'))
    const soloTag = page.getByTestId(SELECTORS.session.tag('solo'))

    await dayTag.click({ timeout: ACTION_TIMEOUT })
    await streetTag.click({ timeout: ACTION_TIMEOUT })
    await soloTag.click({ timeout: ACTION_TIMEOUT })

    // Assert: All selected tags should have active styling
    await expect(dayTag).toHaveClass(/border-primary/, { timeout: ACTION_TIMEOUT })
    await expect(streetTag).toHaveClass(/border-primary/, { timeout: ACTION_TIMEOUT })
    await expect(soloTag).toHaveClass(/border-primary/, { timeout: ACTION_TIMEOUT })

    // Save and verify modal closes
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).not.toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
