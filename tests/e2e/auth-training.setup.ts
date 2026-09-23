/**
 * LOG IN AS THE TRAINING SUITE'S OWN ACCOUNT, ONCE.
 *
 * The four browser training projects delete every enrollment and every open
 * workout on the account they run against. They used to run against
 * `TEST_USER`, which the goals and session specs also use and which
 * `.claude/rules/ui.md` sends a person to for hand-checking — so
 * `npm run test:e2e` took somebody's program away mid-walkthrough.
 *
 * A third account costs one login per run and makes that impossible.
 */

import { test as setup } from '@playwright/test'
import { TEST_USER_TRAINING, validateTrainingUserConfig } from './fixtures/test-user'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 2000

const authFile = 'tests/e2e/.auth/training.json'

setup('authenticate as the training account', async ({ page }) => {
  validateTrainingUserConfig()

  await page.goto('/auth/login', { timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.emailInput).fill(TEST_USER_TRAINING.email, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.passwordInput).fill(TEST_USER_TRAINING.password, { timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.auth.submitButton).click({ timeout: ACTION_TIMEOUT })

  await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: AUTH_TIMEOUT })

  /**
   * PIN THE ACCOUNT'S CLOCK, ONCE AND FOR GOOD.
   *
   * Every training screen decides which day a workout was on from the ACCOUNT's
   * zone, and a fresh profile is UTC until somebody opens Settings. Copenhagen
   * rather than UTC on purpose: a test that quietly assumes the account and the
   * runner share a calendar should fail here rather than in production.
   */
  await page.request.put('/api/settings/time-preferences', {
    data: { timezone: 'Europe/Copenhagen', source: 'chosen' },
  })

  const errorVisible = await page.getByTestId(SELECTORS.auth.errorMessage).isVisible().catch(() => false)
  if (errorVisible) {
    const errorText = await page.getByTestId(SELECTORS.auth.errorMessage).textContent()
    throw new Error(`Auth setup (training) login failed: ${errorText}`)
  }

  await page.context().storageState({ path: authFile })
})
