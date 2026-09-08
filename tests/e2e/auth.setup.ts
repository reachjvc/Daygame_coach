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

  // Signing in no longer diverts anyone into a questionnaire, so this is not
  // about getting past a gate on the way in. It is about the scenario specs:
  // scenarios ask for a region and an archetype, and several specs open them.
  await ensureDatingPreferences(page)

  // Clean up any leftover active sessions from previous test runs
  await ensureNoActiveSessionViaAPI(page)

  await page.context().storageState({ path: authFile })
})

/**
 * Make sure the test user carries the answers scenarios need.
 *
 * Replaces a walk through five onboarding steps. Those steps are gone: only
 * `scenariosService` ever read the answers, so they are now asked once, on one
 * screen, at the scenario door. Filling it here is idempotent -- if the user
 * already has them the submit button is live and nothing is clicked.
 */
async function ensureDatingPreferences(page: import('@playwright/test').Page) {
  await page.goto('/preferences', { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.datingPreferences.form)).toBeVisible({
    timeout: AUTH_TIMEOUT,
  })

  const submit = page.getByTestId(SELECTORS.datingPreferences.submit)
  if (await submit.isEnabled()) {
    return
  }

  // The list, not the map: a country shape is ~9px on a phone.
  await page.getByTestId('region-option-western-europe').click({ timeout: ACTION_TIMEOUT })
  await page
    .getByTestId(SELECTORS.datingPreferences.archetype('Corporate Powerhouse'))
    .click({ timeout: ACTION_TIMEOUT })
  await page
    .getByTestId(SELECTORS.datingPreferences.userIsForeign)
    .getByRole('button', { name: 'No' })
    .click({ timeout: ACTION_TIMEOUT })
  await page
    .getByTestId(SELECTORS.datingPreferences.datingForeigners)
    .getByRole('button', { name: 'No' })
    .click({ timeout: ACTION_TIMEOUT })

  await expect(submit).toBeEnabled({ timeout: ACTION_TIMEOUT })
  await submit.click({ timeout: ACTION_TIMEOUT })
  await page.waitForURL(/\/dashboard/, { timeout: AUTH_TIMEOUT })
}
