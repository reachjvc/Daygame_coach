/**
 * THE DATING ANSWERS, GIVEN ONCE PER ACCOUNT — HOWEVER MANY TESTS ASK.
 *
 * A fresh account (fixtures/test.ts) has none, so the scenario door shows the
 * questions instead of the hub. `seedDatingPreferences` answers them the way a
 * person does, on /preferences — but it CLICKS the answers, and the archetype
 * buttons toggle: on an account that already answered, it would un-pick the
 * archetype and wait forever for a submit that stays disabled. A worker runs
 * many tests on one account, so the second test to ask would fail.
 *
 * So this asks the scenario door first. The hub there means the account has
 * answered; the questions mean it has not, and they are answered once.
 */
import { expect, type Page } from '@playwright/test'
import { ROUTES } from "@/src/shared/routes"
import { seedDatingPreferences } from '../fixtures/test'
import { SELECTORS } from './selectors'

const TIMEOUT = 15000

export async function ensureDatingPreferences(page: Page): Promise<void> {
  await page.goto(ROUTES.scenarios, { timeout: TIMEOUT })
  const hub = page.getByTestId(SELECTORS.scenarios.hub)
  const questions = page.getByTestId(SELECTORS.datingPreferences.form)
  await expect(hub.or(questions)).toBeVisible({ timeout: TIMEOUT })
  if (await questions.isVisible()) await seedDatingPreferences(page)
}
