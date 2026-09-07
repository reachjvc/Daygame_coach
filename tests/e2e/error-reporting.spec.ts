/**
 * A crash has to reach the database, or none of the rest of this matters.
 *
 * Before this existed there was not one error boundary in the app: a page that
 * threw showed the browser's error screen and no record of it survived
 * anywhere. This proves the whole path — something breaks, the person gets a
 * way forward, and a row lands.
 */

import { test, expect } from '@playwright/test'

test.describe('crash reporting', () => {
  test.describe.configure({ mode: 'serial' })

  test('a broken panel does not take the page with it, and is reported', async ({ page }) => {
    const posted: number[] = []
    page.on('response', (response) => {
      if (response.url().includes('/api/errors')) posted.push(response.status())
    })

    await page.goto('/test/crash', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Break this panel' }).click()

    // the person gets a way forward, not a blank screen
    await expect(page.getByText(/Something went wrong/)).toBeVisible({ timeout: 10000 })
    // and the rest of the page still works
    await expect(page.getByRole('button', { name: /Break a promise/ })).toBeVisible()

    await expect.poll(() => posted, { timeout: 15000 }).toContain(200)
  })

  test('a promise nobody catches is reported too', async ({ page }) => {
    const posted: number[] = []
    page.on('response', (response) => {
      if (response.url().includes('/api/errors')) posted.push(response.status())
    })

    await page.goto('/test/crash', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: /Break a promise/ }).click()

    // this one a React boundary cannot see; it is caught app-wide instead
    await expect.poll(() => posted, { timeout: 15000 }).toContain(200)
  })

  test('nothing private travels with a report', async ({ page }) => {
    let sent = ''
    await page.route('**/api/errors', async (route) => {
      sent = route.request().postData() ?? ''
      await route.fulfill({ status: 200, body: JSON.stringify({ stored: 1 }) })
    })

    await page.goto('/test/crash?token=supersecret123&email=jo@example.com', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Break this panel' }).click()
    await expect.poll(() => sent, { timeout: 15000 }).not.toBe('')

    // the route it reports is the path only: a query string is where reset
    // tokens live, and a crash report is not the place to keep one
    expect(sent).not.toContain('supersecret123')
    expect(sent).not.toContain('jo@example.com')
    expect(sent).toContain('/test/crash')
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
