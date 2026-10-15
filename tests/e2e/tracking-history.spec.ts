import type { Page } from '@playwright/test'
import { ROUTES } from "@/src/shared/routes"
import { test, expect } from './fixtures/test'
import { randomUUID } from 'node:crypto'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000

/**
 * The history of field reports: filtered, opened, and deleted.
 *
 * Each test seeds the reports it is about. The file it replaces read whatever
 * the shared account happened to hold — its pagination and expand tests passed
 * by returning early on an empty account, its filter test asserted a Tailwind
 * class, and its delete test removed the FIRST report on the account, whoever
 * had written it.
 */

/** A report of this run's own, through the same endpoint the form uses */
async function seedReport(page: Page, isDraft: boolean, note: string): Promise<string> {
  const response = await page.request.post('/api/tracking/field-report', {
    data: {
      system_template_slug: 'quick-log',
      title: note,
      fields: { approaches: 2, quick_note: note },
      is_draft: isDraft,
    },
  })
  expect(response.status(), 'could not seed a report').toBe(201)
  return ((await response.json()) as { id: string }).id
}

test.describe('Tracking History', () => {
  // No serial mode: it kept the shared account's reports in one order. Each
  // worker's account is its own, and every test finds its cards by the ids it
  // seeded, so it neither reads nor deletes a report another test made.
  const seeded: string[] = []
  test.afterEach(async ({ page }) => {
    for (const id of seeded.splice(0)) await page.request.delete(`/api/tracking/field-report/${id}`)
  })

  test('the filters keep submitted reports and drafts apart', async ({ page }) => {
    const run = randomUUID().slice(0, 8)
    const submitted = await seedReport(page, false, `E2E submitted ${run}`)
    const draft = await seedReport(page, true, `E2E draft ${run}`)
    seeded.push(submitted, draft)

    await page.goto(ROUTES.trackingHistory, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.history.card(submitted))).toBeVisible({ timeout: AUTH_TIMEOUT })
    // "All" is both. It read the submitted list until 2026-10-15 (34c0506),
    // so a draft appeared nowhere but under "Drafts".
    await expect(page.getByTestId(SELECTORS.history.card(draft))).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.history.filterDrafts).click()
    await expect(page.getByTestId(SELECTORS.history.card(draft))).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.history.card(submitted))).toHaveCount(0)

    await page.getByTestId(SELECTORS.history.filterSubmitted).click()
    await expect(page.getByTestId(SELECTORS.history.card(submitted))).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.history.card(draft))).toHaveCount(0)
  })

  test('a report card opens to show what was written, and closes again', async ({ page }) => {
    const note = `E2E opened ${randomUUID().slice(0, 8)}`
    const id = await seedReport(page, false, note)
    seeded.push(id)

    await page.goto(ROUTES.trackingHistory, { timeout: AUTH_TIMEOUT })
    const card = page.getByTestId(SELECTORS.history.card(id))
    await expect(card).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.history.cardExpand(id)).click()
    await expect(card.getByText('Report Fields')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(card.locator('dd').getByText(note)).toBeVisible()

    await page.getByTestId(SELECTORS.history.cardExpand(id)).click()
    await expect(card.getByText('Report Fields')).toBeHidden()
  })

  test('deleting a report from history removes it from the account', async ({ page }) => {
    const id = await seedReport(page, false, `E2E deleted ${randomUUID().slice(0, 8)}`)
    seeded.push(id)

    await page.goto(ROUTES.trackingHistory, { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.history.card(id))).toBeVisible({ timeout: AUTH_TIMEOUT })

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByTestId(SELECTORS.history.cardDelete(id)).click()
    await expect(page.getByTestId(SELECTORS.history.card(id))).toHaveCount(0, { timeout: AUTH_TIMEOUT })

    expect((await page.request.get(`/api/tracking/field-report/${id}`)).status()).toBe(404)
  })
})
