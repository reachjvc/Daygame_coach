/**
 * A crash has to reach the database, or none of the rest of this matters.
 *
 * Before this existed there was not one error boundary in the app: a page that
 * threw showed the browser's error screen and no record of it survived
 * anywhere. Two paths reach `/api/errors`, and both are proved here, on
 * product pages, signed in as the worker's own account:
 *
 * - THE LISTENER. `ErrorReporting` in the root layout hears what a React
 *   boundary cannot: an error thrown outside rendering, a promise nobody
 *   caught. No product page does either on demand, so the failure is raised
 *   from the test, in the page's own window — exactly where such an error
 *   comes from in real use.
 * - THE BOUNDARY. A page that throws while rendering falls to
 *   `app/global-error.tsx`, which shows its fallback and reports. The trigger
 *   is a real product crash: the session tracker trusts the "session ended"
 *   summary it keeps in sessionStorage, and renders whatever it finds there.
 *
 * Each "reaches the database" test reads the row back from the test backend
 * (helpers/errorReports.ts) rather than trusting the route's 200. These once
 * ran on `/test/crash`, a lab page that returns 404 in the production build CI
 * runs — so in CI they asserted against a 404 page.
 */

import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures/test'
import { ensureNoActiveSessionViaAPI } from './helpers/auth.helper'
import { storedCrashReports } from './helpers/errorReports'

/** A product page every signed-in account can open */
const PAGE = '/dashboard'

/** Every failure raised here carries this, so a report the page sent of its own accord is not mistaken for ours */
const MARK = 'Deliberate failure from error-reporting.spec'

/** This test's own mark: the database row is found by it, whoever else is crashing */
const markOfThisTest = () => `${MARK} ${randomUUID()}`

/**
 * Raise a failure in the page, once the app-wide listener can hear it.
 *
 * The listener is attached in an effect, after hydration, and a failure raised
 * before that is simply not reported. So: raise it, and raise it again only if
 * no report of it has left the browser yet.
 */
async function failUntilReported(page: Page, mark: string, raise: (mark: string) => void): Promise<string[]> {
  const sent: string[] = []
  page.on('request', (request) => {
    const body = request.postData() ?? ''
    if (request.url().includes('/api/errors') && request.method() === 'POST' && body.includes(mark)) sent.push(body)
  })
  await expect
    .poll(
      async () => {
        if (sent.length === 0) await page.evaluate(raise, mark)
        return sent.length
      },
      { timeout: 15000, intervals: [500] },
    )
    .toBeGreaterThan(0)
  return sent
}

/** The row the backend keeps for this mark, waited for: the report is sent after the page moved on. */
async function expectStored(mark: string): Promise<void> {
  await expect
    .poll(async () => (await storedCrashReports({ message: mark })).map((row) => row.route), {
      timeout: 15000,
      message: `no crash report "${mark}" in the test backend's error_reports`,
    })
    .toEqual([PAGE])
}

test.describe('crash reporting', () => {
  // Not for isolation: every worker has its own account and its own rate-limit
  // allowance at /api/errors. tests/unit/e2e-isolation.test.ts requires serial
  // mode of any file that stubs a route, and the last test does.
  test.describe.configure({ mode: 'serial' })

  test('an error thrown outside rendering reaches the database', async ({ page }) => {
    const mark = markOfThisTest()
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await failUntilReported(page, mark, (m) => {
      setTimeout(() => {
        throw new Error(m)
      })
    })
    await expectStored(mark)
  })

  test('a promise nobody catches is reported too', async ({ page }) => {
    const mark = markOfThisTest()
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await failUntilReported(page, mark, (m) => {
      void Promise.reject(new Error(m))
    })
    await expectStored(mark)
  })

  test('a page that crashes while rendering shows the fallback, and the crash reaches the database', async ({ page }) => {
    // The tracker shows "Session Ended — you logged N approaches" from a summary
    // it wrote to sessionStorage, checking only its date. A count that is not
    // a number (an older build's shape, a hand-edited value) is rendered as a
    // React child, and React throws: no boundary on that page, so it falls to
    // global-error. Planted before any of the page's code runs.
    const route = '/dashboard/tracking/session'
    await ensureNoActiveSessionViaAPI(page) // an active session renders the tracker instead
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'daygame_ended_session',
        JSON.stringify({ id: 'crash-probe', approachCount: { notANumber: 1 }, duration: '1m', endedAt: new Date().toISOString() }),
      )
    })
    const since = new Date(Date.now() - 1000)
    const reported = page.waitForResponse(
      (r) => r.url().includes('/api/errors') && (r.request().postData() ?? '').includes(`"route":"${route}"`),
    )

    await page.goto(route, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'This page could not load' })).toBeVisible({ timeout: 15000 })
    expect((await reported).status(), 'the crash report was refused').toBe(200)
    await expect
      .poll(async () => (await storedCrashReports({ route, since })).length, {
        timeout: 15000,
        message: `no crash report for ${route} in the test backend's error_reports`,
      })
      .toBeGreaterThan(0)
  })

  test('nothing private travels with a report', async ({ page }) => {
    await page.route('**/api/errors', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stored: 1 }) }),
    )

    await page.goto(`${PAGE}?token=supersecret123&email=jo@example.com`, { waitUntil: 'domcontentloaded' })
    const sent = await failUntilReported(page, markOfThisTest(), (m) => {
      setTimeout(() => {
        throw new Error(m)
      })
    })
    await page.unrouteAll({ behavior: 'ignoreErrors' })

    // the route it reports is the path only: a query string is where reset
    // tokens live, and a crash report is not the place to keep one
    const body = sent.join('\n')
    expect(body).not.toContain('supersecret123')
    expect(body).not.toContain('jo@example.com')
    expect(body).toContain(`"route":"${PAGE}"`)
  })
})
