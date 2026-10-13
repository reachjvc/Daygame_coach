import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from '../helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * The session flow on a phone, once: start, tap, log, and the account has it.
 *
 * The desktop file (`session-tracking.spec.ts`) owns the detail. This is the
 * one run that proves the same gesture works where it is actually made — in the
 * street, on a phone — instead of all thirteen desktop tests run again at
 * 390px, which is what the iPhone and Pixel projects used to do.
 */
test.describe.configure({ mode: 'serial' })

test.afterEach(async ({ page }) => {
  await ensureNoActiveSessionViaAPI(page)
})

test('a session started on a phone logs an approach to the account', async ({ page }) => {
  await ensureCleanSessionPage(page)

  await page.getByTestId(SELECTORS.session.startButton).click({ timeout: ACTION_TIMEOUT })
  const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
  await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
  await confirmButton.evaluate((el: HTMLElement) => el.click())
  await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })

  await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('1', { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })
  await page.getByTestId(SELECTORS.session.outcome('number')).click({ timeout: ACTION_TIMEOUT })
  await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })

  await expect
    .poll(
      async () => {
        const body = await (await page.request.get('/api/tracking/session/active')).json()
        return (body.approaches as { outcome: string | null }[]).map((a) => a.outcome)
      },
      { timeout: AUTH_TIMEOUT },
    )
    .toEqual(['number'])
})
