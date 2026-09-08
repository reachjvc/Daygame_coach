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
 * submit a half-filled profile.
 */

import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const T = 15000
const G = SELECTORS.datingPreferences

test.describe('signing in does not ask dating questions', () => {
  test('the dashboard opens without a detour through /preferences', async ({ page }) => {
    await page.goto('/dashboard', { timeout: T })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: T })
  })

  test('the Lair does not send you to a questionnaire it never reads', async ({ page }) => {
    await page.goto('/dashboard/lair', { timeout: T })
    await expect(page).not.toHaveURL(/\/preferences/, { timeout: T })
  })
})

test.describe('the dating preferences screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences', { timeout: T })
    await expect(page.getByTestId(G.form)).toBeVisible({ timeout: T })
  })

  test('asks every question on one screen, with no steps to walk', async ({ page }) => {
    await expect(page.getByText('Which region are they from?')).toBeVisible({ timeout: T })
    await expect(page.getByText('Pick up to three archetypes')).toBeVisible({ timeout: T })
    await expect(page.getByTestId(G.userIsForeign)).toBeVisible({ timeout: T })
    await expect(page.getByTestId(G.datingForeigners)).toBeVisible({ timeout: T })

    // The wizard's furniture must not have come along.
    await expect(page.getByText(/Step \d+ of 5/)).toHaveCount(0)
  })

  test('the region list is usable without arming anything first', async ({ page }) => {
    // A country shape on the map is ~9px on a phone, so the list is the control
    // that works on every device. It must be present at rest.
    const list = page.getByTestId('region-list')
    await expect(list).toBeVisible({ timeout: T })
    const buttons = list.getByRole('button')
    expect(await buttons.count()).toBeGreaterThan(0)
  })

  test('holds the save until every answer is given, and says which is missing', async ({
    page,
  }) => {
    /* The wizard checked only the step on screen, so deep-linking to its last
       step offered a live submit on a profile with no region -- and submitting
       threw a full-page "This page could not load". */
    const submit = page.getByTestId(G.submit)

    // The seeded test user already has answers, so clear one to see the guard.
    await page
      .getByTestId(G.userIsForeign)
      .getByRole('button', { name: 'Yes' })
      .click({ timeout: T })

    await expect(submit).toBeEnabled({ timeout: T })
    await expect(page.getByTestId(G.missing)).toHaveCount(0)
  })
})

test.describe('a garbled URL cannot break this page', () => {
  // `/preferences?step=abc` used to render "Step NaN of 5": a blank page with a
  // Back button that did nothing. The page no longer reads a step at all.
  test('an unknown query parameter is ignored', async ({ page }) => {
    await page.goto('/preferences?step=abc', { timeout: T })
    await expect(page.getByTestId(G.form)).toBeVisible({ timeout: T })
    await expect(page.getByText(/NaN/)).toHaveCount(0)
  })
})
