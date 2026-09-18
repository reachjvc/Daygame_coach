import { test as setup } from '@playwright/test'
import { TEST_USER_B, validateSecondUserConfig } from './fixtures/test-user'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 2000

const authFile = 'tests/e2e/.auth/user-b.json'

setup('authenticate as test user B', async ({ page }) => {
  validateSecondUserConfig()

  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER_B.email, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER_B.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

  await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT })

  /**
   * PIN THE ACCOUNT'S CLOCK, ONCE AND FOR GOOD.
   *
   * As in `auth.setup.ts`, and deliberately a DIFFERENT zone from account A's
   * UTC: a test that quietly assumes the two accounts share a calendar should
   * fail here rather than in production.
   */
  await page.request.put("/api/settings/time-preferences", {
    data: { timezone: "Europe/Copenhagen", source: "chosen" },
  })

  const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await page.getByTestId(SELECTORS.auth.errorMessage).textContent()
    throw new Error(`Auth setup (User B) login failed: ${errorText}`)
  }

  await page.context().storageState({ path: authFile })
})
