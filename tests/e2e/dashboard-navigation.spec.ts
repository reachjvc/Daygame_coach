import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000

/**
 * The dashboard's module cards lead where they say.
 *
 * One desktop test. It was eight, run on three devices: a "content is visible"
 * check the route sweep already makes, a welcome-OR-explore either/or, two
 * links whose destination depends on whether the account has paid (so the test
 * accepted both), and a settings test that passed on a login redirect. The two
 * cards below link to the same page for every account, so they can be asserted
 * exactly.
 */
test('the module cards on the dashboard open their pages', async ({ page }) => {
  for (const [testId, destination] of [
    [SELECTORS.dashboard.scenariosLink, /\/dashboard\/scenarios$/],
    [SELECTORS.dashboard.innerGameLink, /\/dashboard\/inner-game$/],
  ] as const) {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    const link = page.getByTestId(testId)
    await expect(link).toBeVisible({ timeout: AUTH_TIMEOUT })
    await Promise.all([page.waitForURL(destination, { timeout: AUTH_TIMEOUT }), link.click()])
  }
})
