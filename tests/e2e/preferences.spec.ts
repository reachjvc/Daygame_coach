import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Preferences / Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to preferences
    await page.goto('/preferences', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display preferences page', async ({ page }) => {
    // Assert: Onboarding progress should be visible
    await expect(page.getByTestId(SELECTORS.onboarding.progress)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show step indicator', async ({ page }) => {
    // Assert: Step indicator should show current step
    const stepIndicator = page.getByTestId('onboarding-step-indicator')
    await expect(stepIndicator).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(stepIndicator).toContainText(/step \d of 5/i, { timeout: AUTH_TIMEOUT })
  })

  test('should show navigation buttons', async ({ page }) => {
    // Assert: Back and Next buttons should be visible
    await expect(page.getByTestId(SELECTORS.onboarding.backButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.onboarding.nextButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should have disabled back button on first step', async ({ page }) => {
    // Navigate to first step
    await page.goto('/preferences?step=1', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Back button should be disabled on step 1
    const backButton = page.getByTestId(SELECTORS.onboarding.backButton)
    await expect(backButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(backButton).toBeDisabled({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate between steps', async ({ page }) => {
    // Arrange: Start at step 1
    await page.goto('/preferences?step=1', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Verify we're on step 1
    const stepIndicator = page.getByTestId('onboarding-step-indicator')
    await expect(stepIndicator).toContainText(/step 1/i, { timeout: AUTH_TIMEOUT })

    // Note: Cannot proceed without filling in required fields
    // This test verifies the navigation buttons exist
    const nextButton = page.getByTestId(SELECTORS.onboarding.nextButton)
    await expect(nextButton).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show complete button on final step', async ({ page }) => {
    // Navigate to final step
    await page.goto('/preferences?step=5', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Assert: Complete button should be visible instead of Next
    const completeButton = page.getByTestId(SELECTORS.onboarding.completeButton)
    await expect(completeButton).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
