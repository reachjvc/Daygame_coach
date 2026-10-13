import { test, expect } from './fixtures/test'
import { SELECTORS } from './helpers/selectors'
import { ensureDatingPreferences } from './helpers/datingPreferences'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * The scenarios hub opens with its phases, and its way out leads back to the
 * dashboard. One test; there were six, five checking one more heading each, and
 * a signed-out one that accepted either the hub or a login redirect.
 */
test('the scenarios hub shows its phases and leads back to the dashboard', async ({ page }) => {
  // The hub is what an account that has answered the dating questions sees; a
  // fresh one is asked them first (dating-preferences-gate.spec.ts owns that).
  await ensureDatingPreferences(page)
  await page.goto('/dashboard/scenarios', { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await expect(page.getByRole('heading', { name: /practice scenarios/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /opening/i }).first()).toBeVisible()

  await page.getByRole('link', { name: /back to dashboard/i }).click({ timeout: ACTION_TIMEOUT })
  await page.waitForURL(/\/dashboard$/, { timeout: AUTH_TIMEOUT })
})
