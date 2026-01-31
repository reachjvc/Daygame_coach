import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Weekly Review', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Login and navigate to weekly review page
    await login(page)
    await page.goto('/dashboard/tracking/review', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display weekly review page', async ({ page }) => {
    // Assert: Wait for loading to finish and page to appear
    const loading = page.getByTestId(SELECTORS.weeklyReview.loading)
    const reviewPage = page.getByTestId(SELECTORS.weeklyReview.page)

    // Wait for either loading or page to be visible
    await expect(loading.or(reviewPage)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // If loading was shown, wait for it to disappear
    const isLoading = await loading.isVisible().catch(() => false)
    if (isLoading) {
      await expect(loading).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // Review page should now be visible
    await expect(reviewPage).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display weekly stats summary', async ({ page }) => {
    // Wait for page to load
    const reviewPage = page.getByTestId(SELECTORS.weeklyReview.page)
    await expect(reviewPage).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Stats card should be visible
    const statsCard = page.getByTestId(SELECTORS.weeklyReview.statsCard)
    await expect(statsCard).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display header with title', async ({ page }) => {
    // Wait for page to load
    const reviewPage = page.getByTestId(SELECTORS.weeklyReview.page)
    await expect(reviewPage).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Header should contain "Weekly Review"
    await expect(page.getByRole('heading', { name: /weekly review/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should have back link to tracking', async ({ page }) => {
    // Wait for page to load
    const reviewPage = page.getByTestId(SELECTORS.weeklyReview.page)
    await expect(reviewPage).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Back link should be visible
    const backLink = page.getByRole('link', { name: /back to tracking/i })
    await expect(backLink).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click back link
    await backLink.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should navigate back to tracking
    await page.waitForURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })

  test('should show template selection or empty state', async ({ page }) => {
    // Wait for page to load
    const reviewPage = page.getByTestId(SELECTORS.weeklyReview.page)
    await expect(reviewPage).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Should show either template cards or a message about templates
    const templateHeading = page.getByRole('heading', { name: /choose a review template/i })
    await expect(templateHeading).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
