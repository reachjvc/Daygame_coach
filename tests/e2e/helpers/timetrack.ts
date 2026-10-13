import { expect, type Page } from '@playwright/test'

/**
 * The time tracker, as the product serves it: signed in, at /dashboard/time,
 * syncing to the account.
 *
 * Every spec for it used to drive `/test/toggl`, a signed-out lab copy of the
 * same components that returns 404 in the production build CI runs — so in CI
 * those specs were testing a 404 page. On the product route the workspace is
 * the ACCOUNT's, which is why `openFreshTracker` empties the account first and
 * not only this browser: clearing localStorage alone brings the account's rows
 * straight back down.
 */

export const TRACKER = '/dashboard/time'
export const STORAGE_KEY = 'toggl-clone:v1'
export const PENDING_KEY = 'toggl-clone:pending'
const SCREEN_KEY = 'toggl-clone:screen'

/**
 * Tables the account-wide clear leaves alone. `timetrack_settings` holds the
 * person's preferences (idle detection among them) as one row per user, and
 * the other two are a join table and a log.
 */
const NOT_CLEARED = new Set(['timetrack_entry_tags', 'timetrack_webhook_log', 'timetrack_settings'])

/**
 * Empty this account's time-tracking data on the server.
 *
 * A deletion is a row here — a tombstone with `deleted_at` set — because a
 * device that was offline must learn about it. So the account is emptied by
 * tombstoning, never by a DELETE.
 */
export async function clearAccount(page: Page): Promise<void> {
  const pulled = await page.request.get('/api/timetrack/sync')
  expect(pulled.status(), 'could not read the account to clear it').toBe(200)
  const body = (await pulled.json()) as { rows: Record<string, Record<string, unknown>[]> }
  const deletedAt = new Date().toISOString()
  const rows: Record<string, Record<string, unknown>[]> = {}
  for (const [table, list] of Object.entries(body.rows)) {
    if (NOT_CLEARED.has(table)) continue
    const live = list.filter((row) => row.deleted_at === null)
    if (live.length > 0) rows[table] = live.map((row) => ({ ...row, deleted_at: deletedAt }))
  }
  if (Object.keys(rows).length === 0) return
  const pushed = await page.request.post('/api/timetrack/sync', { data: { rows } })
  expect(pushed.ok(), `could not clear the account: ${pushed.status()}`).toBe(true)
}

/** The sync badge says everything is on the account. Its words are in the label at every width. */
export async function savedToAccount(page: Page, timeout = 20_000): Promise<void> {
  await expect(page.locator('header').getByRole('button', { name: /^Saved\./ })).toBeVisible({ timeout })
}

/** Open the tracker and wait until it has heard from the account */
export async function openTracker(page: Page): Promise<void> {
  await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Time', exact: true }).waitFor({ timeout: 30_000 })
  await savedToAccount(page)
}

/** Forget this browser's copy and open the tracker again: everything shown comes from the account */
export async function reopenFromAccount(page: Page): Promise<void> {
  if (!page.url().includes(TRACKER)) await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    (keys) => {
      for (const key of keys) window.localStorage.removeItem(key)
    },
    [STORAGE_KEY, PENDING_KEY, SCREEN_KEY],
  )
  await openTracker(page)
}

/**
 * An empty account and a browser that has never opened the tracker.
 *
 * Note what an EMPTY account does on first contact: it takes this browser's
 * workspace as the starting point and uploads it, preferences included. So a
 * preference set on the account before this call is overwritten with the
 * defaults — set it after, then `reopenFromAccount`.
 */
export async function openFreshTracker(page: Page): Promise<void> {
  await clearAccount(page)
  await reopenFromAccount(page)
}

/**
 * Find an entry in the list, whichever layout is on screen: an editable field
 * (its text in `value`) on a wide screen, plain text on a phone.
 */
export const entryInList = (page: Page, description: string) =>
  page.locator(`ul.divide-y li:has(input[value="${description}"]), ul.divide-y li:has-text("${description}")`)

/**
 * Track one short entry through the timer bar.
 *
 * It runs until the clock in the tab title has ticked past 0:00:00, so the
 * entry has a duration: a zero-second entry is left out of the reports, and a
 * test about totals would be reading nothing.
 */
export async function trackEntry(page: Page, description: string): Promise<void> {
  await page.getByPlaceholder('What are you working on?').fill(description)
  await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
  const stop = page.locator('main').getByRole('button', { name: 'Stop timer' })
  await stop.waitFor({ timeout: 15_000 })
  await expect.poll(() => page.title(), { timeout: 10_000 }).toMatch(/^(?!0:00:00)\d+:\d\d:\d\d · /)
  await stop.click()
  await expect(entryInList(page, description).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible()
}

/** What this browser holds */
export const readState = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), STORAGE_KEY)

/** Descriptions of the live entries the ACCOUNT holds */
export async function entriesOnAccount(page: Page): Promise<string[]> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { rows: { timetrack_entries: { description: string; deleted_at: string | null }[] } }
  return body.rows.timetrack_entries.filter((e) => e.deleted_at === null).map((e) => e.description)
}

/**
 * Shortcuts are ignored while a field has focus, so blur first.
 */
export const blur = (page: Page) =>
  page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())

/** The account's preferences row, through the same endpoint the page syncs with */
export async function setIdleOnAccount(page: Page, idle: { enabled: boolean; minutes: number }): Promise<void> {
  const pulled = await page.request.get('/api/timetrack/sync')
  expect(pulled.status()).toBe(200)
  const body = (await pulled.json()) as { rows: { timetrack_settings: { prefs: Record<string, unknown> }[] } }
  const current = body.rows.timetrack_settings[0]
  expect(current, 'the account has no preferences row to change').toBeDefined()
  const pushed = await page.request.post('/api/timetrack/sync', {
    data: {
      rows: {
        timetrack_settings: [{ ...current, prefs: { ...current.prefs, idle }, updated_at: new Date().toISOString() }],
      },
    },
  })
  expect(pushed.ok(), `could not change the idle setting: ${pushed.status()}`).toBe(true)
}
