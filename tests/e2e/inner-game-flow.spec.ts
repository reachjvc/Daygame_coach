import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Inner Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to inner game page
    await page.goto('/dashboard/inner-game', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should show welcome card on page load', async ({ page }) => {
    // Assert: Welcome card should be visible (either loading or welcome)
    const loading = page.getByTestId(SELECTORS.innerGame.loading)
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)

    // Wait for either loading to disappear or welcome card to appear
    await expect(loading.or(welcomeCard)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // If loading was shown, wait for it to disappear
    const isLoading = await loading.isVisible().catch(() => false)
    if (isLoading) {
      await expect(loading).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    }

    // Welcome card should now be visible
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display progress section in welcome card', async ({ page }) => {
    // Wait for welcome card
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Should show "Your Progress" heading specifically (use exact match)
    await expect(welcomeCard.getByText('Your Progress', { exact: true })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should have action button in welcome card', async ({ page }) => {
    // Wait for welcome card
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Should have either start button (authenticated) or signup button (preview)
    const startButton = page.getByTestId(SELECTORS.innerGame.welcomeStartButton)
    const signupButton = page.getByRole('link', { name: /get started free/i })

    // Either the start button or signup button should be visible
    const hasStartButton = await startButton.isVisible().catch(() => false)
    const hasSignupButton = await signupButton.isVisible().catch(() => false)

    expect(hasStartButton || hasSignupButton).toBe(true)
  })

  test('should dismiss welcome card when clicking start (if not preview)', async ({ page }) => {
    // Arrange: Wait for welcome card
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Check if we're in preview mode (signup button visible) or authenticated mode (start button visible)
    const startButton = page.getByTestId(SELECTORS.innerGame.welcomeStartButton)
    const hasStartButton = await startButton.isVisible().catch(() => false)

    if (!hasStartButton) {
      // Skip this test if in preview mode
      test.skip()
      return
    }

    // Act: Click start button
    await startButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Welcome card should disappear and main page should be visible
    await expect(welcomeCard).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.innerGame.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show back button to dashboard (if not preview)', async ({ page }) => {
    // Arrange: Wait for welcome card
    const welcomeCard = page.getByTestId(SELECTORS.innerGame.welcomeCard)
    await expect(welcomeCard).toBeVisible({ timeout: AUTH_TIMEOUT })

    const startButton = page.getByTestId(SELECTORS.innerGame.welcomeStartButton)
    const hasStartButton = await startButton.isVisible().catch(() => false)

    if (!hasStartButton) {
      // Skip this test if in preview mode
      test.skip()
      return
    }

    // Dismiss welcome card
    await startButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for main page
    await expect(page.getByTestId(SELECTORS.innerGame.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Back button should be visible
    const backButton = page.getByRole('link', { name: /back/i })
    await expect(backButton).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
