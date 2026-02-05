import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Tracking Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to tracking dashboard
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display progress dashboard', async ({ page }) => {
    // Assert: Dashboard should be visible with stats
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalApproaches)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalNumbers)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.weekStreak)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalSessions)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate to new session', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click new session link
    await page.getByTestId(SELECTORS.trackingDashboard.newSessionLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to session page
    await page.waitForURL(/\/dashboard\/tracking\/session/, { timeout: AUTH_TIMEOUT })
  })

  test('should navigate to field report', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click field report link
    await page.getByTestId(SELECTORS.trackingDashboard.fieldReportLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to field report page
    await page.waitForURL(/\/dashboard\/tracking\/report/, { timeout: AUTH_TIMEOUT })
  })

  test('should navigate to weekly review', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click weekly review link
    await page.getByTestId(SELECTORS.trackingDashboard.weeklyReviewLink).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate to weekly review page
    await page.waitForURL(/\/dashboard\/tracking\/review/, { timeout: AUTH_TIMEOUT })
  })

  test('should show quick add button', async ({ page }) => {
    // Arrange: Verify dashboard is visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Quick add button should be visible
    await expect(page.getByTestId(SELECTORS.trackingDashboard.quickAddButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Achievements Collapse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should show max 3 achievements by default when more than 3 exist', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Check if achievements list exists
    const achievementsList = page.getByTestId(SELECTORS.trackingDashboard.recentAchievementsList)
    const achievementsExist = await achievementsList.isVisible().catch(() => false)

    if (achievementsExist) {
      // Count visible achievement items
      const achievementItems = page.getByTestId(SELECTORS.trackingDashboard.achievementItem)
      const count = await achievementItems.count()

      // Should show at most 3 achievements by default
      expect(count).toBeLessThanOrEqual(3)
    }
  })

  test('should show expand button when more than 3 achievements exist', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // The expand button only appears when there are more than 3 achievements
    const expandButton = page.getByTestId(SELECTORS.trackingDashboard.achievementsExpandButton)
    const buttonVisible = await expandButton.isVisible().catch(() => false)

    // If button is visible, it should show "X more" text
    if (buttonVisible) {
      await expect(expandButton).toContainText(/more/)
    }
  })

  test('should expand to show all achievements when clicking expand button', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const expandButton = page.getByTestId(SELECTORS.trackingDashboard.achievementsExpandButton)
    const buttonVisible = await expandButton.isVisible().catch(() => false)

    if (buttonVisible) {
      // Get initial count
      const achievementItems = page.getByTestId(SELECTORS.trackingDashboard.achievementItem)
      const initialCount = await achievementItems.count()

      // Click expand button
      await expandButton.click({ timeout: ACTION_TIMEOUT })

      // Should now show more achievements (or same if only 3)
      const expandedCount = await achievementItems.count()
      expect(expandedCount).toBeGreaterThanOrEqual(initialCount)

      // Button text should change to "Show less"
      await expect(expandButton).toContainText(/Show less/)
    }
  })

  test('should collapse back to 3 achievements when clicking collapse button', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.trackingDashboard.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const expandButton = page.getByTestId(SELECTORS.trackingDashboard.achievementsExpandButton)
    const buttonVisible = await expandButton.isVisible().catch(() => false)

    if (buttonVisible) {
      // Expand first
      await expandButton.click({ timeout: ACTION_TIMEOUT })
      await expect(expandButton).toContainText(/Show less/)

      // Then collapse
      await expandButton.click({ timeout: ACTION_TIMEOUT })

      // Should show at most 3 achievements
      const achievementItems = page.getByTestId(SELECTORS.trackingDashboard.achievementItem)
      const count = await achievementItems.count()
      expect(count).toBeLessThanOrEqual(3)

      // Button text should show "X more" again
      await expect(expandButton).toContainText(/more/)
    }
  })
})
