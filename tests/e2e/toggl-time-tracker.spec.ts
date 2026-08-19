/**
 * End-to-end coverage for the Toggl-style time tracker at /test/toggl.
 *
 * The page is client-only and stores everything in localStorage, so each test
 * clears that key and reloads to get the deterministic seeded workspace.
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE = '/test/toggl'
const STORAGE_KEY = 'toggl-clone:v1'

/** ICS fixture: one timed event, one recurring event, one all-day event (must be skipped) */
const ICS_FIXTURE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:e2e-1@test',
  'DTSTART:20260810T090000Z',
  'DTEND:20260810T100000Z',
  'SUMMARY:Imported standup',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:e2e-2@test',
  'DTSTART;VALUE=DATE:20260812',
  'DTEND;VALUE=DATE:20260813',
  'SUMMARY:All day offsite',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

async function openFreshSandbox(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(600)
}

const nav = (page: Page, name: string | RegExp) =>
  page.getByRole('navigation').getByRole('button', { name })

/** Shortcuts are ignored while a field has focus, so blur first */
const blur = (page: Page) =>
  page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())

const readState = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), STORAGE_KEY)

test.describe('Toggl-style time tracker', () => {
  // One test stubs the calendar route, so run serially and drop interceptions
  // afterwards — required by tests/unit/e2e-isolation.test.ts
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('opens on today with a running timer, never on stale dates', async ({ page }) => {
    await openFreshSandbox(page)

    await expect(page.locator('section > header h3').first()).toHaveText('Today')
    await expect(page.locator('main').getByRole('button', { name: 'Stop timer' })).toBeVisible()

    const state = await readState(page)
    const running = state.entries.filter((e: { duration: number }) => e.duration < 0)
    expect(running).toHaveLength(1)
    // nothing may be tracked in the future
    const now = Date.now()
    for (const entry of state.entries) {
      if (entry.stop) expect(new Date(entry.stop).getTime()).toBeLessThanOrEqual(now + 60_000)
    }
  })

  test('re-dates stale demo data instead of showing past dates', async ({ page }) => {
    await openFreshSandbox(page)
    // Age every stored entry by three days, as if the page were reopened later
    await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      const shift = 3 * 86_400_000
      state.entries = state.entries.map((e: { start: string; stop: string | null; duration: number }) => ({
        ...e,
        start: new Date(new Date(e.start).getTime() - shift).toISOString(),
        stop: e.stop ? new Date(new Date(e.stop).getTime() - shift).toISOString() : null,
        duration: e.duration < 0 ? e.duration + 3 * 86_400 : e.duration,
      }))
      window.localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor()
    await page.waitForTimeout(900)

    await expect(page.locator('section > header h3').first()).toHaveText('Today')
    await expect(page.getByText(/Moved \d+ demo entries forward/)).toBeVisible()
  })

  test('starts and stops the timer, and mirrors it in the tab title', async ({ page }) => {
    await openFreshSandbox(page)
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()

    await page.getByPlaceholder('What are you working on?').fill('E2E entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(1500)

    await expect(page.getByRole('banner')).toContainText('E2E entry')
    await expect(page).toHaveTitle(/\d+:\d\d:\d\d · E2E entry/)

    await blur(page)
    await page.keyboard.press('s')
    await page.waitForTimeout(400)
    await expect(page.getByRole('banner')).not.toContainText('E2E entry')
  })

  test('keyboard shortcuts continue the last entry and start a favorite', async ({ page }) => {
    await openFreshSandbox(page)
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()
    await page.waitForTimeout(400)

    await blur(page)
    await page.keyboard.press('c')
    await page.waitForTimeout(600)
    const afterContinue = await readState(page)
    expect(afterContinue.entries.filter((e: { duration: number }) => e.duration < 0)).toHaveLength(1)

    await blur(page)
    await page.keyboard.press('s')
    await page.waitForTimeout(400)
    await blur(page)
    await page.keyboard.press('1')
    await page.waitForTimeout(600)
    await expect(page.getByRole('banner')).toContainText('Timer UI polish')

    await blur(page)
    await page.keyboard.press('Shift+?')
    await expect(page.getByText('Keyboard shortcuts')).toBeVisible()
  })

  test('imports an .ics calendar, skipping all-day events', async ({ page }) => {
    await openFreshSandbox(page)
    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Integrations' }).click()
    await page.getByRole('button', { name: /Upload \.ics/ }).click()

    await page.setInputFiles('input[type="file"][accept*=".ics"]', {
      name: 'e2e.ics',
      mimeType: 'text/calendar',
      buffer: Buffer.from(ICS_FIXTURE),
    })
    await page.waitForTimeout(900)

    await expect(page.getByText(/Imported 1 event \(skipped 1 all-day\)/)).toBeVisible()

    await nav(page, 'Calendar').click()
    await page.waitForTimeout(700)
    await expect(page.locator('main')).toContainText('Imported standup')
  })

  test('does not store the secret calendar address unless asked to', async ({ page }) => {
    await openFreshSandbox(page)
    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Integrations' }).click()
    await page.getByRole('button', { name: 'Secret address' }).click()

    const field = page.getByLabel('Secret iCal address')
    await expect(field).toHaveAttribute('type', 'password')

    // Stub the server route so the test never reaches the network
    await page.route('**/api/timetrack/calendar', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ics: ICS_FIXTURE }) }),
    )
    await field.fill('https://calendar.google.com/calendar/ical/e2e-secret-token/basic.ics')
    await page.getByRole('button', { name: 'Import' }).click()
    await page.waitForTimeout(900)

    const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
    expect(raw).not.toContain('e2e-secret-token')
    await expect(page.locator('main')).toContainText('not saved')
  })

  test('enforces required fields, then saves once they are filled', async ({ page }) => {
    await openFreshSandbox(page)
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()

    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Workspace', exact: true }).click()
    await page.getByRole('switch', { name: 'Project is required' }).click()

    await nav(page, 'Timer').click()
    await page.waitForTimeout(500)
    const timerBar = page.locator('main > div').first()
    await timerBar.locator('button').first().click()
    await page.getByText('No project', { exact: true }).first().click()
    await page.getByPlaceholder('What are you working on?').fill('Blocked entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    // exactly one toast, not one per React render pass
    await expect(page.getByText(/Project is required/)).toHaveCount(1)

    await timerBar.locator('button').first().click()
    await page.getByText('Coach App Build', { exact: true }).first().click()
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(600)
    await expect(page.getByRole('banner')).toContainText('Blocked entry')
  })

  test('reports tabs render and rounding changes the total', async ({ page }) => {
    await openFreshSandbox(page)
    await nav(page, 'Reports').click()
    await page.waitForTimeout(800)

    await expect(page.locator('main')).toContainText(/total hours/i)
    for (const tab of ['Detailed', 'Workload', 'Profitability', 'My reports']) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await page.waitForTimeout(400)
      await expect(page.locator('main')).toBeVisible()
    }

    await page.getByRole('button', { name: 'Summary', exact: true }).click()
    await page.waitForTimeout(400)
    const totalTile = page.locator('main').getByText(/total hours/i).locator('..')
    const before = await totalTile.innerText()
    await page.getByText(/^Rounding:/).click()
    await page.getByText('Round time entries').click()
    const selects = page.locator('div.absolute.z-50 select')
    await selects.nth(0).selectOption('up')
    await selects.nth(1).selectOption('60')
    await page.waitForTimeout(600)
    expect(await totalTile.innerText()).not.toEqual(before)
  })

  test('warns instead of silently losing data when saving fails', async ({ page }) => {
    await openFreshSandbox(page)
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError')
      }
    })
    await page.locator('main').getByRole('button', { name: /Stop timer|Start timer/ }).first().click()
    await expect(page.getByText(/Could not save to this browser/)).toBeVisible()
  })

  test('survives a reload and stays usable on a narrow viewport', async ({ page }) => {
    await openFreshSandbox(page)
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()
    await page.getByPlaceholder('What are you working on?').fill('Persisted entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(700)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor()
    await page.waitForTimeout(800)
    await expect(page.locator('main input[value="Persisted entry"]').first()).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(400)
  })
})
