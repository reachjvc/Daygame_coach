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
/**
 * Find an entry in the list, whichever layout is on screen.
 *
 * On a wide screen the description is an editable field, so it lives in the
 * input's `value`. On a phone it is plain text. A test that only knows about
 * one of them reports a working sync as broken on the other — which is exactly
 * what happened the first time these ran on a phone.
 */
const entryInList = (page: Page, description: string) =>
  page.locator(
    `ul.divide-y li:has(input[value="${description}"]), ul.divide-y li:has-text("${description}")`,
  )

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
  await page.getByRole('heading', { name: 'Time', exact: true }).waitFor({ timeout: 30000 })
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
  await expect(entryInList(page, description).first()).toBeVisible({ timeout: 15000 })
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
    await page.getByRole('heading', { name: 'Time', exact: true }).waitFor({ timeout: 30000 })

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

  /**
   * THE PRODUCT ROUTE'S OWN CHROME, which nothing checked.
   *
   * Every other browser test in this slice runs against `/test/toggl`, and it
   * renders the same components — so everything that DIFFERS between the lab and
   * the product went unverified, which is exactly where the "it feels
   * unfinished" complaints lived: the tab named the sales page, the heading
   * named the workspace, and the way out was an unlabelled arrow.
   *
   * It also cannot be checked without a session, so it has to live here.
   */
  test('the product route is dressed as part of this app, not as a lab page', async ({ page }) => {
    await page.goto('/dashboard/time', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Time', exact: true }).waitFor({ timeout: 30000 })

    /**
     * SETTLE, THEN STOP ANYTHING RUNNING, THEN MEASURE — in that order, and the
     * order is the whole lesson of three failed versions of this test.
     *
     * This suite shares one account, and the tab title is the running clock
     * while a timer is going. Version one asserted the title was "Time" and
     * passed for a day, then failed with "5:38:36 · tracked on the real page" —
     * a timer some other run had left going. Version two stopped the timer
     * first, and still failed: a timer running on the ACCOUNT is only on screen
     * once the server has answered, so there was nothing to stop yet.
     *
     * A test that depends on ambient shared state passes on whatever state it
     * happens to find.
     */
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20000 })

    for (const stop of [
      // which of these exists depends where the tracker reopened: "Stop timer"
      // is the timer card's button, "Stop the running timer" is the header pill
      // on every other screen
      page.locator('main').getByRole('button', { name: 'Stop timer' }),
      page.locator('header').getByRole('button', { name: 'Stop the running timer' }),
    ]) {
      if (await stop.isVisible().catch(() => false)) {
        await stop.click()
        await page.waitForTimeout(1200)
        break
      }
    }

    // the browser tab, which used to inherit the root's marketing title
    await expect.poll(() => page.title(), { timeout: 10000 }).toBe('Time')

    // the way out, which used to be a 20x36px arrow with no label
    const back = page.locator('header a').first()
    await expect(back).toHaveAttribute('href', '/dashboard')
    await expect(back).toContainText('Dashboard')
    await expect
      .poll(async () => (await back.boundingBox())?.height ?? 0, { timeout: 10000 })
      .toBeGreaterThanOrEqual(36)

    // ONE bottom bar. The tracker draws its own six sections and the app's tab
    // bar is deliberately not mounted here; two stacked bars on a phone would
    // leave you guessing which one moves you where.
    await expect(page.locator('[data-testid="mobile-tab-bar"]')).toHaveCount(0)
    await expect(page.locator('nav[aria-label="Sections"]')).toHaveCount(1)

    // nothing on the page admits to being a test page
    const visible = await page.locator('body').innerText()
    expect(visible).not.toContain('/test/')
    expect(visible).not.toContain('Toggl-style')
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

    /**
     * ...and now a completely separate browser, SAME account — whichever account
     * this project signs in as, not a hard-coded one. It named `user.json`
     * outright, which is what forced the phone project to share an account with
     * the desktop one: two projects writing the same rows. Locally `workers` is
     * unset, so a full `npm run test:e2e` ran them side by side and they fought
     * — and the failures surfaced in unrelated tests (session expiry, deletion
     * merge), which is the most misleading shape a race can take. CI never saw
     * it because it pins `workers: 1`.
     */
    const stateFile = test.info().project.use.storageState as string
    const second = await browser.newContext({ storageState: stateFile })
    const other = await second.newPage()
    await openEmptyBrowser(other)
    await expect(entryInList(other, 'work that must survive').first()).toBeVisible({ timeout: 25000 })
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
    await expect(entryInList(page, 'work that must survive').first()).toBeVisible({ timeout: 20000 })
  })

  test('an edit made offline is sent when the connection comes back', async ({ page, context }) => {
    await clearServer(page)
    await openEmptyBrowser(page)
    await context.setOffline(true)
    await trackEntry(page, 'tracked on a train')

    // it is visible here immediately, and the badge says it is waiting
    await expect(entryInList(page, 'tracked on a train').first()).toBeVisible()

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

    await page.getByRole('button', { name: 'More actions for this time entry' }).first().click()

    // Scoped to the menu that is open, not to any button labelled "Delete" on
    // the page. On a phone the menu scrolls, and an unscoped match picked a
    // different one — the test then reported a working deletion as broken.
    const menu = page.locator('[data-dropdown-panel]')
    await expect(menu).toBeVisible()
    const remove = menu.getByRole('button', { name: 'Delete' })
    await remove.scrollIntoViewIfNeeded()
    await remove.click()
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
    await expect(entryInList(page, 'to be deleted')).toHaveCount(0)
  })
})
