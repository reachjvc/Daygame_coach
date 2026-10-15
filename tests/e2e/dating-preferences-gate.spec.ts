/**
 * THE DATING QUESTIONS ARE ASKED ONCE, WHERE THEY ARE USED.
 *
 * Replaces onboarding.spec.ts, preferences.spec.ts and
 * preferences-completion.spec.ts (19 tests), which exercised a five-step signup
 * wizard that no longer exists. Measured 2026-09-08, only `scenariosService`
 * reads these answers, yet `onboarding_completed` also gated the dashboard, the
 * Lair and the post-login redirect -- three features that read none of them.
 *
 * So the assertions worth keeping are not about steps and progress bars. They
 * are: signing in does not divert you into a questionnaire, and the form cannot
 * submit a half-filled profile. "Every question on one screen" and "the region
 * list is present" are what the route sweep sees on every page, and the garbled
 * `?step=` case is junk-params' job.
 */

import { test, expect, signIn, SIGNED_OUT } from './fixtures/test'
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { SELECTORS } from './helpers/selectors'
import { ensureDatingPreferences } from './helpers/datingPreferences'

const T = 15000
const G = SELECTORS.datingPreferences

test.describe('a brand-new account', () => {
  // Signed out, so the test signs in itself — as an account made for it alone,
  // which has answered nothing. The worker's own account may have answered by
  // now (other specs give it answers), and an answered account would pass
  // this whether or not the diversion came back.
  test.use({ storageState: SIGNED_OUT })

  test('signing in does not send you through a questionnaire it never reads', async ({ page, throwawayAccount }) => {
    await signIn(page, throwawayAccount)
    await expect(page, 'the login form sent a new account somewhere other than the dashboard').toHaveURL(urlOf(ROUTES.dashboard, "$"), {
      timeout: T,
    })
    // Inner Game is checked as well as the dashboard: `onboarding_completed`
    // gated both, and neither reads a single dating answer.
    for (const route of [ROUTES.dashboard, ROUTES.innerGame]) {
      await page.goto(route, { timeout: T })
      await expect(page).toHaveURL(new RegExp(`${route}$`), { timeout: T })
    }
  })
})

test('holds the save until every answer is given, and says which is missing', async ({ page }) => {
  /* The wizard checked only the step on screen, so deep-linking to its last
     step offered a live submit on a profile with no region -- and submitting
     threw a full-page "This page could not load". Nothing is saved here: the
     guard is checked by un-picking an answer the account already has — so it
     is given every answer first, and the archetype is the ONLY one missing. On
     an empty account the submit would be disabled for every reason at once. */
  await ensureDatingPreferences(page)
  await page.goto(ROUTES.scenarioPreferences, { timeout: T })
  await expect(page.getByTestId(G.form)).toBeVisible({ timeout: T })
  const submit = page.getByTestId(G.submit)
  await expect(submit, 'an account with every answer can save').toBeEnabled({ timeout: T })

  const picked = page.locator('[data-testid^="gate-archetype-"][aria-pressed="true"]')
  while ((await picked.count()) > 0) await picked.first().click({ timeout: T })

  await expect(submit).toBeDisabled()
  await expect(page.getByTestId(G.missing)).toContainText('at least one archetype')

  await page.locator('[data-testid^="gate-archetype-"]').first().click({ timeout: T })
  await expect(page.getByTestId(G.missing).filter({ hasText: 'archetype' })).toHaveCount(0)
  await expect(submit, 'with the archetype back, nothing is missing').toBeEnabled()
})
