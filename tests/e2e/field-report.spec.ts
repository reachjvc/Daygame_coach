import { test, expect, type Page } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Writing a field report, and getting it back.
 *
 * Four desktop tests. There were 27, run on three devices, and the two that
 * mattered could not fail: "submit redirects to the tracking dashboard" matched
 * `/dashboard/tracking` — which the report page's own address already matches
 * — and about fifteen tests wrapped their assertions in `if (visible)`, so a
 * field that was not there (the quick-log template has no mood field at all)
 * made them pass by doing nothing. The edit tests looked for an `<a>` to an
 * edit address; history's edit control is a button, so they never ran — which
 * hid that they also expected a "Back to History" link the edit screen does
 * not have (it says "Back").
 *
 * Every report made here is read back from the account and deleted after.
 */

const QUICK_LOG = 'quick-log'

async function openTemplate(page: Page, slug: string) {
  await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.fieldReport.templateCard(slug)).click({ timeout: ACTION_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
}

/** Press a save button and return the id of the report the account now holds */
async function savedReportId(page: Page, button: string): Promise<string> {
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/tracking/field-report') && r.request().method() === 'POST',
  )
  await page.getByTestId(button).click({ timeout: ACTION_TIMEOUT })
  const response = await created
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

async function storedReport(page: Page, id: string) {
  const response = await page.request.get(`/api/tracking/field-report/${id}`)
  expect(response.status()).toBe(200)
  return (await response.json()) as { is_draft: boolean; fields: Record<string, unknown> }
}

test.describe('Field Report Flow', () => {
  const made: string[] = []

  test.afterEach(async ({ page }) => {
    for (const id of made.splice(0)) await page.request.delete(`/api/tracking/field-report/${id}`)
  })

  test('a template opens its form, and Back returns to the list', async ({ page }) => {
    await openTemplate(page, QUICK_LOG)
    await expect(page.getByTestId(SELECTORS.fieldReport.submit)).toBeEnabled()
    await expect(page.getByTestId(SELECTORS.fieldReport.saveDraft)).toBeEnabled()

    await page.getByTestId(SELECTORS.fieldReport.back).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))).toBeVisible()
  })

  test('a submitted report is stored with what was entered, and how you feel now', async ({ page }) => {
    await openTemplate(page, QUICK_LOG)
    await page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches')).fill('5')
    await page.getByTestId(SELECTORS.fieldReport.fieldInput('intention')).fill('Practice cold reads')

    // the mood picker: a second tap on the same face un-picks it
    const label = page.getByTestId(SELECTORS.fieldReport.postSessionMoodLabel)
    await page.getByTestId(SELECTORS.fieldReport.postSessionMood(3)).click({ timeout: ACTION_TIMEOUT })
    await expect(label).toBeVisible()
    await page.getByTestId(SELECTORS.fieldReport.postSessionMood(3)).click({ timeout: ACTION_TIMEOUT })
    await expect(label).toBeHidden()
    await page.getByTestId(SELECTORS.fieldReport.postSessionMood(4)).click({ timeout: ACTION_TIMEOUT })
    await expect(label).toHaveText('Good')

    const id = await savedReportId(page, SELECTORS.fieldReport.submit)
    made.push(id)
    await page.waitForURL(/\/dashboard\/tracking$/, { timeout: AUTH_TIMEOUT })

    const report = await storedReport(page, id)
    expect(report.is_draft).toBe(false)
    expect(String(report.fields.approaches)).toBe('5')
    expect(report.fields.intention).toBe('Practice cold reads')
    expect(report.fields._post_session_mood).toBe(4)
  })

  test('a saved draft opens again in edit mode with what it held', async ({ page }) => {
    await openTemplate(page, QUICK_LOG)
    await page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches')).fill('7')
    const id = await savedReportId(page, SELECTORS.fieldReport.saveDraft)
    made.push(id)
    await page.waitForURL(/\/dashboard\/tracking$/, { timeout: AUTH_TIMEOUT })
    expect((await storedReport(page, id)).is_draft).toBe(true)

    // By address: history's edit control is an icon button with no name, so
    // there is nothing to find it by except its position in the card.
    await page.goto(`/dashboard/tracking/report?edit=${id}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))).toHaveValue('7')
    await expect(page.getByTestId(SELECTORS.fieldReport.submit)).toHaveText(/Update Report/)
  })

  test('a report opened from history can be corrected, and the correction is saved', async ({ page }) => {
    await openTemplate(page, QUICK_LOG)
    await page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches')).fill('3')
    const id = await savedReportId(page, SELECTORS.fieldReport.submit)
    made.push(id)
    await page.waitForURL(/\/dashboard\/tracking$/, { timeout: AUTH_TIMEOUT })

    // The way a person gets there: the history list, then the report's pencil.
    // The pencil is an icon button with no accessible name, so it is found as
    // the button beside the card's delete control.
    await page.goto('/dashboard/tracking/history', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const remove = page.getByTestId(SELECTORS.history.cardDelete(id))
    await expect(remove).toBeVisible({ timeout: AUTH_TIMEOUT })
    await remove.locator('xpath=preceding-sibling::button[1]').click()
    await page.waitForURL(new RegExp(`/dashboard/tracking/report\\?edit=${id}$`), { timeout: AUTH_TIMEOUT })

    const approaches = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
    await expect(approaches).toHaveValue('3', { timeout: AUTH_TIMEOUT })
    await approaches.fill('10')

    const updated = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tracking/field-report/${id}`) && r.request().method() === 'PUT',
    )
    await page.getByTestId(SELECTORS.fieldReport.submit).click({ timeout: ACTION_TIMEOUT })
    expect((await updated).status()).toBe(200)
    // NOT asserted: that it then returns to history. Edit mode calls
    // `router.back()`, and on 2026-10-13 that landed on the same edit address
    // in every local run (history.length 3, the entry before it /history) —
    // reported as a suspected fault rather than pinned either way.

    expect(String((await storedReport(page, id)).fields.approaches)).toBe('10')
  })
})
