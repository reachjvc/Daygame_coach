import { test, expect } from './fixtures/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { SELECTORS } from './helpers/selectors'
import { ensureDatingPreferences } from './helpers/datingPreferences'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * The scenarios hub opens with its phases, and the way back to the dashboard is
 * the app's own navigation. Scenarios used to draw its own header with a "Back to
 * Dashboard" button, which made a tab look like part of the Dashboard; the frame
 * replaced it (Plans/site-structure.md, D7). One test; there were six, five
 * checking one more heading each, and a signed-out one that accepted either the
 * hub or a login redirect.
 */
test('the scenarios hub shows its phases, and the navigation leads to the dashboard', async ({ page }) => {
  // The hub is what an account that has answered the dating questions sees; a
  // fresh one is asked them first (dating-preferences-gate.spec.ts owns that).
  await ensureDatingPreferences(page)
  await page.goto(ROUTES.scenarios, { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.scenarios.hub)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await expect(page.getByRole('heading', { name: /practice scenarios/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /opening/i }).first()).toBeVisible()

  await expect(page.getByRole('link', { name: /back to dashboard/i })).toHaveCount(0)
  await page.getByTestId(SELECTORS.header.dashboardLink).click({ timeout: ACTION_TIMEOUT })
  await page.waitForURL(urlOf(ROUTES.dashboard, "$"), { timeout: AUTH_TIMEOUT })
})
