import { test as setup, expect } from '@playwright/test'
import { TEST_USER, validateTestConfig } from './fixtures/test-user'
import { SELECTORS } from './helpers/selectors'
import { ensureNoActiveSessionViaAPI } from './helpers/auth.helper'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 5000

const authFile = 'tests/e2e/.auth/user.json'

setup('authenticate as test user', async ({ page }) => {
  validateTestConfig()

  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER.email, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

  await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT })

  const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await page.getByTestId(SELECTORS.auth.errorMessage).textContent()
    throw new Error(`Auth setup login failed: ${errorText}`)
  }

  // Wait for page to fully settle - the server may redirect /dashboard → /preferences
  // if onboarding is not completed yet
  await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

  // If login redirected to /redirect intermediate page, navigate to /dashboard
  // to trigger any onboarding redirects
  if (!page.url().includes('/preferences') && !page.url().includes('/dashboard')) {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  }

  // If user lands on preferences (onboarding not completed), complete it
  if (page.url().includes('/preferences')) {
    await completeOnboarding(page)
  }

  // Clean up any leftover active sessions from previous test runs
  await ensureNoActiveSessionViaAPI(page)

  await page.context().storageState({ path: authFile })
})

/**
 * Walks through all 5 onboarding steps via UI to complete user setup.
 * This ensures the test user has onboarding_completed=true in the database.
 */
async function completeOnboarding(page: import('@playwright/test').Page) {
  // Step 1: Tell us about yourself - select foreigner status options
  await expect(page.getByText('Step 1 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByText("No, I'm local").click({ timeout: ACTION_TIMEOUT })
  await page.getByText('Mostly dating locals').click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.onboarding.nextButton).click({ timeout: ACTION_TIMEOUT })

  // Step 2: Select region on world map
  await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.waitForSelector('svg path[data-region]', { timeout: AUTH_TIMEOUT })
  await page.locator('path[data-region="western-europe"]').first().click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.onboarding.nextButton).click({ timeout: ACTION_TIMEOUT })

  // Step 3: Choose archetype (click first available archetype card)
  await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.locator('[class*="cursor-pointer"][class*="hover:border-primary"]').first().click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.onboarding.nextButton).click({ timeout: ACTION_TIMEOUT })

  // Step 4: Experience level (click first option)
  await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByText('Intermediate').click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.onboarding.nextButton).click({ timeout: ACTION_TIMEOUT })

  // Step 5: Primary goal (click first option)
  await expect(page.getByText('Step 5 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByText('Build Confidence').click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.onboarding.completeButton).click({ timeout: ACTION_TIMEOUT })

  // Wait for redirect to dashboard after onboarding completion
  await page.waitForURL(/\/dashboard/, { timeout: AUTH_TIMEOUT })
}
