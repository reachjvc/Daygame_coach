import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 5000
const AUTH_TIMEOUT = 15000

test.describe('Preferences full completion flow', () => {
  test('should complete all 5 steps and redirect to dashboard', async ({ page }) => {
    // Navigate to preferences step 1
    await page.goto('/preferences?step=1', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Capture console errors and network failures
    const consoleErrors: string[] = []
    const networkErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`)
      }
    })

    // Step 1: Tell us about yourself
    await expect(page.getByText('Step 1 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByText("No, I'm local").click({ timeout: ACTION_TIMEOUT })
    await page.getByText('Mostly dating locals').click({ timeout: ACTION_TIMEOUT })
    const nextButton = page.getByTestId(SELECTORS.onboarding.nextButton)
    await expect(nextButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
    await nextButton.click({ timeout: ACTION_TIMEOUT })

    // Step 2: Select region
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.waitForSelector('svg path[data-region]', { timeout: AUTH_TIMEOUT })
    await page.locator('path[data-region="western-europe"]').first().click({ timeout: ACTION_TIMEOUT })
    await expect(nextButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
    await nextButton.click({ timeout: ACTION_TIMEOUT })

    // Step 3: Choose archetype
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.locator('[class*="cursor-pointer"][class*="hover:border-primary"]').first().click({ timeout: ACTION_TIMEOUT })
    await expect(nextButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
    await nextButton.click({ timeout: ACTION_TIMEOUT })

    // Step 4: Experience level
    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByText('Intermediate').click({ timeout: ACTION_TIMEOUT })
    await expect(nextButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
    await nextButton.click({ timeout: ACTION_TIMEOUT })

    // Step 5: Primary goal
    await expect(page.getByText('Step 5 of 5')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByText('Build Confidence').click({ timeout: ACTION_TIMEOUT })

    // The "Complete Setup" button should now be enabled
    const completeButton = page.getByTestId(SELECTORS.onboarding.completeButton)
    await expect(completeButton).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(completeButton).toBeEnabled({ timeout: ACTION_TIMEOUT })

    // Click complete
    await completeButton.click({ timeout: ACTION_TIMEOUT })

    // Should redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: AUTH_TIMEOUT })

    // Verify we actually landed on the dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // Fail the test if there were server-side errors
    expect(consoleErrors, `Console errors: ${consoleErrors.join('; ')}`).toHaveLength(0)
    expect(networkErrors.filter(e => !e.includes('favicon')),
      `Network errors: ${networkErrors.join('; ')}`).toHaveLength(0)
  })
})
