/**
 * A crash has to reach the database, or none of the rest of this matters.
 *
 * Before this existed there was not one error boundary in the app: a page that
 * threw showed the browser's error screen and no record of it survived
 * anywhere. This proves the path every page shares — `ErrorReporting` in the
 * root layout listens for what a React boundary cannot see, and a row lands.
 *
 * ON A PRODUCT PAGE. These ran on `/test/crash`, a lab page with two "break
 * this" buttons, which returns 404 in the production build CI runs — so in CI
 * they asserted against a 404 page. The failure is raised from the test now,
 * in the page's own window, which is exactly where an uncaught error or an
 * unhandled rejection comes from in real use.
 *
 * What moved out: the error BOUNDARY's fallback ("Something went wrong", and
 * the page around it still working). The only boundary on a product route
 * wraps the time tracker's screens, and nothing a test can do from outside
 * makes one of them throw while rendering. That half belongs in a component
 * test of `ErrorBoundary`.
 */

import { test, expect, type Page } from '@playwright/test'

/** A product page every signed-in account can open */
const PAGE = '/dashboard'

/** Every failure raised here carries this, so a report the page sent of its own accord is not mistaken for ours */
const MARK = 'Deliberate failure from error-reporting.spec'

/**
 * Raise a failure in the page, once the app-wide listener can hear it.
 *
 * The listener is attached in an effect, after hydration, and a failure raised
 * before that is simply not reported. So: raise it, and raise it again only if
 * no report of it has left the browser yet.
 */
async function failUntilReported(page: Page, raise: (mark: string) => void): Promise<string[]> {
  const sent: string[] = []
  page.on('request', (request) => {
    const body = request.postData() ?? ''
    if (request.url().includes('/api/errors') && request.method() === 'POST' && body.includes(MARK)) sent.push(body)
  })
  await expect
    .poll(
      async () => {
        if (sent.length === 0) await page.evaluate(raise, MARK)
        return sent.length
      },
      { timeout: 15000, intervals: [500] },
    )
    .toBeGreaterThan(0)
  return sent
}

test.describe('crash reporting', () => {
  test.describe.configure({ mode: 'serial' })

  test('an error thrown outside rendering reaches the database', async ({ page }) => {
    const stored: number[] = []
    page.on('response', (response) => {
      if (response.url().includes('/api/errors') && (response.request().postData() ?? '').includes(MARK)) {
        stored.push(response.status())
      }
    })

    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await failUntilReported(page, (mark) => {
      setTimeout(() => {
        throw new Error(mark)
      })
    })

    await expect.poll(() => stored, { timeout: 15000 }).toContain(200)
  })

  test('a promise nobody catches is reported too', async ({ page }) => {
    const stored: number[] = []
    page.on('response', (response) => {
      if (response.url().includes('/api/errors') && (response.request().postData() ?? '').includes(MARK)) {
        stored.push(response.status())
      }
    })

    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await failUntilReported(page, (mark) => {
      void Promise.reject(new Error(mark))
    })

    await expect.poll(() => stored, { timeout: 15000 }).toContain(200)
  })

  test('nothing private travels with a report', async ({ page }) => {
    await page.route('**/api/errors', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stored: 1 }) }),
    )

    await page.goto(`${PAGE}?token=supersecret123&email=jo@example.com`, { waitUntil: 'domcontentloaded' })
    const sent = await failUntilReported(page, (mark) => {
      setTimeout(() => {
        throw new Error(mark)
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

  test('the reports endpoint refuses to be used as a firehose', async ({ request }) => {
    const one = () =>
      request.post('/api/errors', {
        data: { reports: [{ message: 'flood', route: '/', severity: 'error', at: new Date().toISOString() }] },
      })

    let refused = false
    for (let i = 0; i < 25; i++) {
      const response = await one()
      if (response.status() === 429) {
        refused = true
        break
      }
    }
    expect(refused, 'an unlimited crash endpoint is an open door').toBe(true)
  })
})
