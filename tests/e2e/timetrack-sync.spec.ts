/**
 * The promise this whole slice rests on: your time is on the server, not just
 * in the browser you typed it into.
 *
 * These tests use two separate browser profiles for the same signed-in account,
 * which is the closest a test can get to "my laptop and my phone".
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE = '/test/toggl'
const STORAGE_KEY = 'toggl-clone:v1'
const PENDING_KEY = 'toggl-clone:pending'

/** A fresh browser for the same account: nothing local, everything from the server */
async function openEmptyBrowser(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([state, pending]) => {
      window.localStorage.removeItem(state)
      window.localStorage.removeItem(pending)
    },
    [STORAGE_KEY, PENDING_KEY],
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
}

async function trackEntry(page: Page, description: string) {
  await page.getByPlaceholder('What are you working on?').fill(description)
  await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
  // wait for the timer to actually be running rather than for a guessed number
  // of milliseconds: offline, the first render can take longer than a sleep
  const stop = page.locator('main').getByRole('button', { name: 'Stop timer' })
  await stop.waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  await stop.click()
  await expect(page.locator(`main input[value="${description}"]`).first()).toBeVisible({ timeout: 15000 })
}

/** Empty this account's server-side workspace so each test starts from nothing */
async function clearServer(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const response = await fetch('/api/timetrack/sync')
    if (!response.ok) return
    const body = await response.json()
    const rows: Record<string, unknown[]> = {}
    const deletedAt = new Date().toISOString()
    for (const [table, list] of Object.entries(body.rows as Record<string, Record<string, unknown>[]>)) {
      if (table === 'timetrack_entry_tags' || table === 'timetrack_webhook_log' || table === 'timetrack_settings') continue
      if (list.length === 0) continue
      rows[table] = list.map((row) => ({ ...row, deleted_at: deletedAt }))
    }
    if (Object.keys(rows).length > 0) {
      await fetch('/api/timetrack/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
    }
  })
}

test.describe('time is kept on the server, not just in one browser', () => {
  test.describe.configure({ mode: 'serial' })

  test('the real page saves, and says so', async ({ page }) => {
    /**
     * This is the product route, not the sandbox. It is here because the sync
     * was once broken on it in a way no other test could see: a single row the
     * database refused failed the whole batch, and because a queue drains all
     * or nothing, the badge sat on "Not saved" and nothing was ever stored
     * again. Asserting the badge reaches "Saved" is the cheapest way to notice.
     */
    await page.goto('/dashboard/time', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 30000 })

    const stop = page.locator('main').getByRole('button', { name: 'Stop timer' })
    if (await stop.isVisible().catch(() => false)) {
      await stop.click()
      await page.waitForTimeout(800)
    }

    await trackEntry(page, 'tracked on the real page')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Not saved')).toHaveCount(0)

    const stored = await page.evaluate(async () => {
      const response = await fetch('/api/timetrack/sync')
      const body = await response.json()
      return (body.rows.timetrack_entries as { description: string; deleted_at: string | null }[])
        .filter((e) => e.deleted_at === null)
        .map((e) => e.description)
    })
    expect(stored).toContain('tracked on the real page')
  })

  test('the endpoint refuses anyone who is not signed in', async ({ browser }) => {
    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await anon.newPage()
    const pull = await page.request.get('/api/timetrack/sync')
    expect(pull.status()).toBe(401)
    const push = await page.request.post('/api/timetrack/sync', { data: { rows: {} } })
    expect(push.status()).toBe(401)
    await anon.close()
  })

  test('what I track in one browser appears in another one signed into the same account', async ({ browser, page }) => {
    await clearServer(page)
    await openEmptyBrowser(page)
    await trackEntry(page, 'work that must survive')

    // the offer is explicit — nothing is uploaded behind the user's back
    const offer = page.getByRole('button', { name: 'Upload' })
    if (await offer.isVisible().catch(() => false)) await offer.click()
    await page.waitForTimeout(3000)

    const stored = await page.evaluate(async () => {
      const response = await fetch('/api/timetrack/sync')
      const body = await response.json()
      return (body.rows.timetrack_entries as { description: string; deleted_at: string | null }[])
        .filter((e) => e.deleted_at === null)
        .map((e) => e.description)
    })
    expect(stored, 'the entry never reached the account').toContain('work that must survive')

    // ...and now a completely separate browser, same account
    const second = await browser.newContext({ storageState: 'tests/e2e/.auth/user.json' })
    const other = await second.newPage()
    await openEmptyBrowser(other)
    await expect(other.locator('main input[value="work that must survive"]').first()).toBeVisible({ timeout: 25000 })
    await second.close()
  })

  test('clearing this browser does not lose the work', async ({ page }) => {
    await clearServer(page)
    await openEmptyBrowser(page)
    await trackEntry(page, 'work that must survive')
    await page.waitForTimeout(2500)
    await openEmptyBrowser(page)
    const gone = await page.evaluate((key) => window.localStorage.getItem(key) === null, STORAGE_KEY)
    expect(gone).toBe(false) // it saves again immediately, from the server copy
    await expect(page.locator('main input[value="work that must survive"]').first()).toBeVisible({ timeout: 20000 })
  })

  test('an edit made offline is sent when the connection comes back', async ({ page, context }) => {
    await clearServer(page)
    await openEmptyBrowser(page)
    await context.setOffline(true)
    await trackEntry(page, 'tracked on a train')

    // it is visible here immediately, and the badge says it is waiting
    await expect(page.locator('main input[value="tracked on a train"]').first()).toBeVisible()

    await context.setOffline(false)
    // the queue retries on its own timer with a widening gap, so this does not
    // depend on the browser's "you are back online" event firing at all
    await page.waitForTimeout(14000)

    const stored = await page.evaluate(async () => {
      const response = await fetch('/api/timetrack/sync')
      const body = await response.json()
      return (body.rows.timetrack_entries as { description: string }[]).map((e) => e.description)
    })
    expect(stored).toContain('tracked on a train')
  })

  test('a deletion is not undone by another device that still has the entry', async ({ page }) => {
    await clearServer(page)
    await openEmptyBrowser(page)
    await trackEntry(page, 'to be deleted')
    await page.waitForTimeout(2500)

    await page.locator('ul.divide-y > li').first().hover()
    await page.getByRole('button', { name: 'More actions for this time entry' }).first().click()
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await page.waitForTimeout(3000)

    // The entry must travel as a tombstone, not simply stop being sent. A
    // device that was offline during the deletion would otherwise see a row it
    // still has, decide the server forgot it, and upload it again.
    const state = await page.evaluate(async () => {
      const response = await fetch('/api/timetrack/sync')
      const body = await response.json()
      const rows = body.rows.timetrack_entries as { description: string; deleted_at: string | null }[]
      const mine = rows.filter((e) => e.description === 'to be deleted')
      return { found: mine.length, allDeleted: mine.every((e) => e.deleted_at !== null) }
    })
    expect(state.found, 'the entry never reached the server at all').toBeGreaterThan(0)
    expect(state.allDeleted, 'the deletion was not recorded, so another device would resurrect it').toBe(true)

    // and it is gone from the list. Scoped to the list on purpose: the timer
    // bar keeps the description after you stop, so a page-wide search for the
    // text finds it there and reports a deletion that did happen as one that
    // did not.
    await expect(page.locator('ul.divide-y input[value="to be deleted"]')).toHaveCount(0)
  })
})
