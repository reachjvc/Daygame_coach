import { test, expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Building your own report, both ways: a template to use later, and a report
 * written now.
 *
 * Two tests. There were 24, and the two that saved anything asserted the URL
 * matched `/dashboard/tracking` — which the report page they started on already
 * does — so a save that failed outright passed. The other 22 checked that a
 * screen of the builder rendered. Both now read what the account holds, and
 * delete it after.
 */

async function openBuilder(page: Page, mode: 'template-only' | 'report') {
  await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByText('Build Your Own').click({ timeout: ACTION_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page
    .getByTestId(mode === 'report' ? SELECTORS.customReportBuilder.modeReport : SELECTORS.customReportBuilder.modeTemplateOnly)
    .click({ timeout: ACTION_TIMEOUT })
}

/** The id from the next successful POST to an endpoint */
function createdId(page: Page, path: string): Promise<string> {
  return page
    .waitForResponse((r) => r.url().endsWith(path) && r.request().method() === 'POST')
    .then(async (response) => {
      expect(response.status(), `${path} refused the save`).toBe(201)
      return ((await response.json()) as { id: string }).id
    })
}

test.describe('Custom Report Builder', () => {
  const cleanUp: string[] = []

  test.afterEach(async ({ page }) => {
    for (const path of cleanUp.splice(0)) await page.request.delete(path)
  })

  test('a template is saved with the fields picked, and offered from then on', async ({ page }) => {
    const name = `E2E template ${randomUUID().slice(0, 8)}`
    await openBuilder(page, 'template-only')

    const save = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await expect(save, 'a template with no fields can be saved').toBeDisabled()

    await page.getByTestId(SELECTORS.customReportBuilder.templateNameInput).fill(name)
    if (!(await page.getByText('Hide fields').isVisible())) await page.getByText('Add a field').click()
    const option = page.locator('[data-testid^="field-option-"]').first()
    const fieldId = ((await option.getAttribute('data-testid')) ?? '').replace('field-option-', '')
    await option.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.customReportBuilder.selectedField(fieldId))).toBeVisible()

    const saved = createdId(page, '/api/tracking/templates/custom')
    await save.click({ timeout: ACTION_TIMEOUT })
    const id = await saved
    cleanUp.push(`/api/tracking/templates/custom/${id}`)

    // the builder closes onto the template list, and the new one is in it
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection).getByText(name).first()).toBeVisible()

    const stored = await page.request.get(`/api/tracking/templates/custom/${id}`)
    expect(stored.status()).toBe(200)
    const template = (await stored.json()) as { name: string; static_fields: { id: string }[] }
    expect(template.name).toBe(name)
    expect(template.static_fields.map((f) => f.id)).toEqual([fieldId])
  })

  test('a report written in the builder is stored with what was written', async ({ page }) => {
    /**
     * WITH A FIELD, because without one it cannot be saved: the report is
     * saved as a template plus a report, and the template endpoint refuses a
     * template with no fields ("Fields required", 400). So "Write Report Now"
     * with only the notes box filled — the screen's main box — shows an error
     * and saves nothing. Found by this rewrite on 2026-10-13 (the old test
     * passed by matching the URL it started on) and reported, not pinned.
     */
    const run = randomUUID().slice(0, 8)
    const notes = `E2E custom report ${run}`
    await openBuilder(page, 'report')
    await page.getByTestId(SELECTORS.customReportBuilder.templateNameInput).fill('E2E report template')
    await page.getByPlaceholder(/Write freely/i).fill(notes)

    const option = page.getByTestId('field-option-quick_note')
    if (!(await option.isVisible())) await page.getByTestId('field-picker-toggle').click()
    await option.click()
    await page.getByPlaceholder('Anything worth noting?').fill(`quick note ${run}`)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByTestId(SELECTORS.customReportBuilder.filledField('quick_note'))).toBeVisible()

    const template = createdId(page, '/api/tracking/templates/custom')
    const report = createdId(page, '/api/tracking/field-report')
    await page.getByTestId(SELECTORS.customReportBuilder.saveButton).click({ timeout: ACTION_TIMEOUT })
    const [templateId, reportId] = await Promise.all([template, report])
    cleanUp.push(`/api/tracking/field-report/${reportId}`, `/api/tracking/templates/custom/${templateId}`)

    await page.waitForURL(/\/dashboard\/tracking(#recent-reports)?$/, { timeout: AUTH_TIMEOUT })

    const stored = await page.request.get(`/api/tracking/field-report/${reportId}`)
    expect(stored.status()).toBe(200)
    const body = (await stored.json()) as { template_id: string; is_draft: boolean; fields: Record<string, unknown> }
    expect(body.template_id).toBe(templateId)
    expect(body.is_draft).toBe(false)
    expect(body.fields.main_notes).toBe(notes)
    expect(body.fields.quick_note).toBe(`quick note ${run}`)
  })
})
