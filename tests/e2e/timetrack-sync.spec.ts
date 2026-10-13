/**
 * The promise this whole slice rests on: your time is on the server, not just
 * in the browser you typed it into.
 *
 * These tests use two separate browser profiles for the same signed-in account,
 * which is the closest a test can get to "my laptop and my phone". All of them
 * run on the product route, /dashboard/time; most used to run on `/test/toggl`,
 * a lab copy that returns 404 in the production build CI runs.
 *
 * Two are tagged @timing: they measure what happens over wall-clock time (a
 * retry rate, a race against a pull already in flight), so they wait for time
 * on purpose. Everything else waits for the account to say something.
 */

import { test, expect } from './fixtures/test'
import {
  STORAGE_KEY,
  entriesOnAccount,
  entryInList,
  openFreshTracker,
  reopenFromAccount,
  savedToAccount,
  trackEntry,
} from './helpers/timetrack'

test.describe('time is kept on the server, not just in one browser', () => {
  // Not for isolation: each worker has an account of its own, and every test
  // here empties it first. tests/unit/e2e-isolation.test.ts asks for serial
  // mode in any file that intercepts a route, and the @timing test below does.
  test.describe.configure({ mode: 'serial' })

  test('the real page saves, and says so', async ({ page }) => {
    /**
     * This is here because the sync was once broken on the product route in a
     * way no other test could see: a single row the database refused failed the
     * whole batch, and because a queue drains all or nothing, the badge sat on
     * "Not saved" and nothing was ever stored again. Asserting the badge reaches
     * "Saved" is the cheapest way to notice.
     */
    await openFreshTracker(page)
    await trackEntry(page, 'tracked on the real page')
    await savedToAccount(page)
    await expect(page.getByText('Not saved')).toHaveCount(0)
    await expect.poll(() => entriesOnAccount(page)).toContain('tracked on the real page')
  })

  /**
   * THE PRODUCT ROUTE'S OWN CHROME.
   *
   * Everything that differs between the lab and the product went unverified
   * while the other tests ran on the lab, which is exactly where the "it feels
   * unfinished" complaints lived: the tab named the sales page, the heading
   * named the workspace, and the way out was an unlabelled arrow.
   *
   * An emptied account first: the tab title is the running clock while a timer
   * is going, and this worker's previous test may have left one going.
   */
  test('the product route is dressed as part of this app, not as a lab page', async ({ page }) => {
    await openFreshTracker(page)

    // the browser tab, which used to inherit the root's marketing title
    await expect.poll(() => page.title(), { timeout: 10_000 }).toBe('Time')

    // the way out, which used to be a 20x36px arrow with no label
    const back = page.locator('header a').first()
    await expect(back).toHaveAttribute('href', '/dashboard')
    await expect(back).toContainText('Dashboard')
    await expect
      .poll(async () => (await back.boundingBox())?.height ?? 0, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(36)

    // ONE bottom bar. The tracker draws its own sections and the app's tab bar
    // is deliberately not mounted here; two stacked bars on a phone would
    // leave you guessing which one moves you where.
    await expect(page.locator('[data-testid="mobile-tab-bar"]')).toHaveCount(0)
    await expect(page.locator('nav[aria-label="Sections"]')).toHaveCount(1)

    // nothing on the page admits to being a test page
    const visible = await page.locator('body').innerText()
    expect(visible).not.toMatch(/\/test\//)
    expect(visible).not.toContain('Toggl-style')
  })

  // "The endpoint refuses anyone who is not signed in" lived here; it is two
  // rows of security-auth.spec.ts's table now, which needs no browser page.

  test('what I track in one browser appears in another one signed into the same account', async ({ browser, page, account }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'work that must survive')
    await expect.poll(() => entriesOnAccount(page), { message: 'the entry never reached the account' }).toContain(
      'work that must survive',
    )

    /**
     * ...and now a completely separate browser, SAME account: this worker's,
     * from its saved signed-in state. It named `user.json` outright once, which
     * is what forced the phone project to share an account with the desktop one.
     */
    const second = await browser.newContext({ storageState: account.storageState })
    const other = await second.newPage()
    await reopenFromAccount(other)
    await expect(entryInList(other, 'work that must survive').first()).toBeVisible({ timeout: 25_000 })
    await second.close()
  })

  test('clearing this browser does not lose the work', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'work that must survive')
    await expect.poll(() => entriesOnAccount(page)).toContain('work that must survive')

    await reopenFromAccount(page)
    const gone = await page.evaluate((key) => window.localStorage.getItem(key) === null, STORAGE_KEY)
    expect(gone).toBe(false) // it saves again immediately, from the server copy
    await expect(entryInList(page, 'work that must survive').first()).toBeVisible({ timeout: 20_000 })
  })

  test('an edit made offline is sent when the connection comes back', async ({ page, context }) => {
    await openFreshTracker(page)
    await context.setOffline(true)
    try {
      await trackEntry(page, 'tracked on a train')
      // it is visible here immediately, while the account has not heard of it
      await expect(entryInList(page, 'tracked on a train').first()).toBeVisible()
    } finally {
      await context.setOffline(false)
    }

    // The queue retries on its own timer with a widening gap, so this does not
    // depend on the browser's "you are back online" event firing at all.
    await expect.poll(() => entriesOnAccount(page), { timeout: 30_000 }).toContain('tracked on a train')
  })

  test('a deletion is not undone by another device that still has the entry', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'to be deleted')
    await expect.poll(() => entriesOnAccount(page), { message: 'the entry never reached the server at all' }).toContain(
      'to be deleted',
    )

    await page.getByRole('button', { name: 'More actions for this time entry' }).first().click()

    // Scoped to the menu that is open, not to any button labelled "Delete" on
    // the page. On a phone the menu scrolls, and an unscoped match picked a
    // different one — the test then reported a working deletion as broken.
    const menu = page.locator('[data-dropdown-panel]')
    await expect(menu).toBeVisible()
    const remove = menu.getByRole('button', { name: 'Delete' })
    await remove.scrollIntoViewIfNeeded()
    await remove.click()

    // The entry must travel as a tombstone, not simply stop being sent. A
    // device that was offline during the deletion would otherwise see a row it
    // still has, decide the server forgot it, and upload it again.
    await expect
      .poll(
        async () => {
          const body = await (await page.request.get('/api/timetrack/sync')).json()
          const rows = body.rows.timetrack_entries as { description: string; deleted_at: string | null }[]
          const mine = rows.filter((e) => e.description === 'to be deleted')
          return mine.length > 0 && mine.every((e) => e.deleted_at !== null)
        },
        { message: 'the deletion was not recorded, so another device would resurrect it' },
      )
      .toBe(true)

    // and it is gone from the list. Scoped to the list on purpose: the timer
    // bar keeps the description after you stop, so a page-wide search for the
    // text finds it there and reports a deletion that did happen as one that
    // did not.
    await expect(entryInList(page, 'to be deleted')).toHaveCount(0)
  })

  /**
   * WHAT IT DOES WHILE IT CANNOT REACH THE SERVER, MEASURED WHERE IT HAPPENS.
   *
   * On 2026-09-26 this was 25 POSTs in 20 seconds, gaps flat at ~850ms, with a
   * backoff in the code that says 2s doubling to 60s. Every flush set `status`,
   * three effects depended on `status`, and the change-watcher re-armed an
   * 800ms timer after each failure — so the backoff never scheduled anything.
   *
   * THIS ASSERTION LIVES IN A BROWSER ON PURPOSE. The unit harness next door
   * (`syncRetry.test.tsx`) cannot see this: with fake timers inside `act()`
   * React batches the re-renders that drive the loop, and the harness reported
   * four sends where the product made twenty-five. The loop is made of real
   * renders interleaved with real promises, so it takes a real browser — and
   * the product route, whose dashboard shell produces re-renders the bare lab
   * page did not (the lab version passed with the defect put back).
   */
  test('a server it cannot reach is not asked once a second @timing', async ({ page, context }) => {
    // twelve measured seconds, then however long the backoff takes to come round
    test.setTimeout(120_000)
    await openFreshTracker(page)

    let posts = 0
    await page.route('**/api/timetrack/sync', async (route) => {
      if (route.request().method() === 'POST') posts += 1
      await route.continue()
    })

    await context.setOffline(true)
    try {
      await trackEntry(page, 'tracked with no connection')
      posts = 0
      // the rate over twelve seconds is the thing measured
      await page.waitForTimeout(12000)
    } finally {
      await context.setOffline(false)
    }

    // 2s, 4s, 8s in twelve seconds is three attempts; the old loop made fourteen
    expect(posts, `the upload was retried ${posts} times in 12s — the backoff is not scheduling them`).toBeLessThanOrEqual(5)

    // and the work is not lost by backing off: it goes up when the network does
    await expect
      .poll(() => entriesOnAccount(page), { timeout: 70_000, message: 'the queue never drained after the network came back' })
      .toContain('tracked with no connection')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  /**
   * PRESSING STOP ONCE IS ENOUGH.
   *
   * The owner pressed Stop and had to press it again. A pull asks what changed
   * since a cursor; the server answers with the rows as it read them; the merge
   * took the server's version of anything not still queued, comparing nothing.
   * So the answer to a question asked before the press put the running row
   * back — and the same in reverse, a start that un-started.
   *
   * The unit tests next door pin the merge rule. This pins the gesture, on the
   * route the owner actually uses, because that is where it was found.
   */
  test('a timer stopped once stays stopped, even if a pull was already in flight @timing', async ({ page }) => {
    await openFreshTracker(page)

    const isRunning = () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('toggl-clone:v1')
        if (!raw) return false
        const state = JSON.parse(raw) as { entries: { stop: string | null; duration: number }[] }
        return state.entries.some((e) => e.stop === null || e.duration < 0)
      })

    await page.getByPlaceholder('What are you working on?').fill('stopped exactly once')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).waitFor({ timeout: 15_000 })
    // the start has reached the account, so a pull would bring the running row back
    await savedToAccount(page)

    // a pull goes out, and the press happens while its answer is still coming
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.waitForTimeout(120)
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()

    await expect.poll(isRunning, { message: 'the press did not stop the timer at all' }).toBe(false)

    // long enough for an answer computed before the press to land
    await page.waitForTimeout(3000)
    expect(await isRunning(), 'the timer came back after being stopped — press twice again').toBe(false)
    await expect(page.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible()
  })
})
