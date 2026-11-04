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

import { test, expect, signIn, SIGNED_OUT } from './fixtures/test'
import { ROUTES } from "@/src/shared/routes"
import { devices, type Page } from '@playwright/test'
import {
  PENDING_KEY,
  STORAGE_KEY,
  TRACKER,
  blur,
  entriesOnAccount,
  entryInList,
  openFreshTracker,
  openTracker,
  readState,
  reopenFromAccount,
  savedToAccount,
  trackEntry,
} from './helpers/timetrack'
import { whenHydrated } from './helpers/hydration'

/** The live entry called Gym-something on the ACCOUNT: whether it runs, and what it is called */
async function gymOnAccount(page: Page): Promise<{ running: boolean; description: string } | null> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status()).toBe(200)
  const body = (await response.json()) as {
    rows: { timetrack_entries: { description: string; stopped_at: string | null; deleted_at: string | null }[] }
  }
  const gym = body.rows.timetrack_entries.find((e) => e.deleted_at === null && e.description.startsWith('Gym'))
  return gym ? { running: gym.stopped_at === null, description: gym.description } : null
}

/** Every live entry on the ACCOUNT, with its times */
async function entriesWithTimes(
  page: Page,
): Promise<{ description: string; started_at: string; stopped_at: string | null }[]> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status()).toBe(200)
  const body = (await response.json()) as {
    rows: { timetrack_entries: { description: string; started_at: string; stopped_at: string | null; deleted_at: string | null }[] }
  }
  return body.rows.timetrack_entries.filter((e) => e.deleted_at === null)
}

/** What runs on the ACCOUNT, by description */
async function runningOnAccount(page: Page): Promise<string[]> {
  return (await entriesWithTimes(page)).filter((e) => e.stopped_at === null).map((e) => e.description).sort()
}

const SYNC = /\/api\/timetrack\/sync/
const startButton = (page: Page) => page.locator('main').getByRole('button', { name: 'Start timer' })
const stopButton = (page: Page) => page.locator('main').getByRole('button', { name: 'Stop timer' })
/** The first read of the account failed, so Start and Stop act on this copy now (D2) */
const couldNotCheck = (page: Page) =>
  expect(page.locator('header').getByRole('button', { name: /^Not saved/ })).toBeVisible({ timeout: 30_000 })

test.describe('time is kept on the server, not just in one browser', { tag: '@phone' }, () => {
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

    // the way out. On a phone it is the tracker's own back control, which used to
    // be a 20x36px arrow with no label; from 640px up it is the app's header,
    // which Time shows there since Plans/time-tracker-like-toggl.md D9
    if ((page.viewportSize()?.width ?? 0) < 640) {
      const back = page.locator('header:visible a').first()
      await expect(back).toHaveAttribute('href', ROUTES.dashboard)
      await expect(back).toContainText('Dashboard')
      await expect
        .poll(async () => (await back.boundingBox())?.height ?? 0, { timeout: 10_000 })
        .toBeGreaterThanOrEqual(36)
    } else {
      await expect(page.locator('header:visible').getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
    }

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

  /**
   * THE OWNER'S OWN OVERLAP: "i start a timer on pc, then close it on phone once
   * i am done with gym" — here with the other device holding an older copy in
   * between, which is when it went wrong (sync defect #1,
   * Plans/time-tracker-like-toggl.md).
   *
   * The second browser has Gym running and edits it with no signal, so the edit
   * waits in its queue. The PC stops Gym meanwhile. When the signal comes back,
   * the queued row used to replace the account's whole row — `stopped_at: null`
   * included — and Gym ran again on both. Now the account refuses the stale copy,
   * and the second browser lays only its own edit onto the stopped row.
   *
   * The unit tests beside the hook (`aSleepingPhoneCannotRestartAStoppedTimer`)
   * pin the merge against a fake account; this pins it against the real route
   * and the real database function.
   */
  test('a device that slept with an edit queued does not restart a timer the PC stopped', async ({ browser, page, account }) => {
    await openFreshTracker(page)
    await page.getByPlaceholder('What are you working on?').fill('Gym')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.locator('main').getByRole('button', { name: 'Stop timer' }).waitFor({ timeout: 15_000 })
    await savedToAccount(page)
    await expect.poll(() => gymOnAccount(page), { message: 'Gym never reached the account' }).toMatchObject({ running: true })

    // the other device, same account, sees Gym running
    const elsewhere = await browser.newContext({ storageState: account.storageState })
    try {
      const other = await elsewhere.newPage()
      await reopenFromAccount(other)
      await expect(other.locator('main').getByRole('button', { name: 'Stop timer' })).toBeVisible({ timeout: 25_000 })

      // it loses signal, and an edit to the running entry waits in its queue
      await elsewhere.setOffline(true)
      await other.getByPlaceholder('What are you working on?').fill('Gym, legs day')
      await blur(other)
      await expect
        .poll(() => other.evaluate((key) => window.localStorage.getItem(key) ?? '', PENDING_KEY), {
          message: 'the edit was never queued, so this proves nothing',
        })
        .toContain('Gym, legs day')

      // the PC stops Gym meanwhile
      await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()
      await savedToAccount(page)
      await expect.poll(async () => (await gymOnAccount(page))?.running, { message: 'the PC stop never reached the account' }).toBe(false)

      // the signal comes back
      await elsewhere.setOffline(false)
      await other.evaluate(() => {
        window.dispatchEvent(new Event('online'))
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // the account: still stopped, and the other device's edit is on it
      await expect
        .poll(() => gymOnAccount(page), {
          timeout: 30_000,
          message: 'the old copy started the timer again, or its own edit was lost',
        })
        .toEqual({ running: false, description: 'Gym, legs day' })

      // and both screens say so
      await expect(other.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible({ timeout: 20_000 })
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
      await expect(entryInList(page, 'Gym, legs day').first()).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible()
    } finally {
      await elsewhere.close()
    }
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

/**
 * THE OWNER'S OWN STORY, END TO END (Phase 2 acceptance in
 * Plans/time-tracker-like-toggl.md): "I start a timer on the PC, then close it on
 * the phone once I am done with gym."
 *
 * The phone last opened the tracker before Gym was started, so the copy it opens
 * on has no timer running, and its first read of the account is slow. It must
 * say "Checking…" over that old copy (D2), then show Gym running, and its Stop
 * must reach the PC with the phone's stop time.
 *
 * The local test backend runs without Supabase Realtime (scripts/db/test-stack.mjs
 * leaves it out), so the PC hears about the stop the way it does when the
 * owner looks back at it — the page becoming visible — and not by the change
 * ping (D4); the ping is pinned by tests/unit/timetrack/theOtherDeviceNoticesWithinSeconds.
 */
test.describe('the owner\'s overlap: started on the PC, stopped on the phone', () => {
  test('the phone says Checking… over its old copy, then shows Gym running, and its Stop reaches the PC', async ({
    browser,
    account,
  }) => {
    const baseURL = test.info().project.use.baseURL
    const pcContext = await browser.newContext({ storageState: account.storageState, baseURL, viewport: { width: 1366, height: 900 } })
    const phoneContext = await browser.newContext({ ...devices['Pixel 7'], storageState: account.storageState, baseURL })
    try {
      const pc = await pcContext.newPage()
      await openFreshTracker(pc)

      // the phone opens the tracker while nothing runs, and is put away: its copy stays on it
      const before = await phoneContext.newPage()
      await reopenFromAccount(before)
      await expect(before.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible()
      await before.close()

      // the PC starts Gym
      await pc.getByPlaceholder('What are you working on?').fill('Gym')
      await pc.locator('main').getByRole('button', { name: 'Start timer' }).click()
      await savedToAccount(pc)
      await expect.poll(() => gymOnAccount(pc), { message: 'Gym never reached the account' }).toMatchObject({ running: true })

      // the phone opens again, on its old copy, and its first read of the account is slow
      const phone = await phoneContext.newPage()
      let releaseRead: () => void = () => {}
      const readHeld = new Promise<void>((resolve) => (releaseRead = resolve))
      await phone.route('**/api/timetrack/sync', async (route) => {
        if (route.request().method() === 'GET') await readHeld
        await route.continue()
      })
      await phone.goto(TRACKER, { waitUntil: 'domcontentloaded' })
      await expect(
        phone.getByRole('button', { name: /^Checking…/ }),
        'the old copy was shown with no sign that it was being checked',
      ).toBeVisible({ timeout: 30_000 })
      releaseRead()

      // then Gym, running, as the PC left it
      const stop = phone.locator('main').getByRole('button', { name: 'Stop timer' })
      await expect(stop, 'the phone never showed the timer the PC started').toBeVisible({ timeout: 20_000 })
      await expect(phone.getByPlaceholder('What are you working on?')).toHaveValue('Gym')

      const pressedAt = await phone.evaluate(() => Date.now())
      await stop.click()
      await expect(phone.locator('main').getByRole('button', { name: 'Start timer' })).toBeVisible()
      await savedToAccount(phone)

      // the PC, looked at again, shows it stopped within seconds, at the phone's time
      await pc.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
      await expect(pc.locator('main').getByRole('button', { name: 'Start timer' }), 'the PC still shows Gym running').toBeVisible({
        timeout: 5_000,
      })
      const response = await pc.request.get('/api/timetrack/sync')
      const body = (await response.json()) as {
        rows: { timetrack_entries: { description: string; stopped_at: string | null; deleted_at: string | null }[] }
      }
      const gym = body.rows.timetrack_entries.find((e) => e.deleted_at === null && e.description === 'Gym')
      expect(gym?.stopped_at, 'Gym is not stopped on the account').toBeTruthy()
      expect(
        Math.abs(Date.parse(gym!.stopped_at!) - pressedAt),
        'the account does not carry the moment the phone pressed Stop',
      ).toBeLessThan(10_000)
    } finally {
      await phoneContext.close()
      await pcContext.close()
    }
  })
})

/**
 * THE BASEMENT, THE STALE PC, AND TWO TIMERS AT FIRST CONTACT (a bug audit,
 * 2026-11-04). Each was reproduced in a real browser before its fix; the unit
 * promises are aChangeMadeWithNoSignalSurvivesAReopen,
 * aTimerStoppedAtFirstContactIsStoppedOnTheAccount and twoStopsOfOneTimerKeepTheFirst.
 */
test.describe('the owner\'s overlap, with no signal and with a PC that has not checked', () => {
  test('a Stop made on a phone that opened with no signal survives the app opening again before the signal returns', async ({
    browser,
    account,
  }) => {
    test.setTimeout(120_000)
    const baseURL = test.info().project.use.baseURL
    const pcContext = await browser.newContext({ storageState: account.storageState, baseURL, viewport: { width: 1366, height: 900 } })
    const phoneContext = await browser.newContext({ ...devices['Pixel 7'], storageState: account.storageState, baseURL })
    try {
      const pc = await pcContext.newPage()
      await openFreshTracker(pc)
      await pc.getByPlaceholder('What are you working on?').fill('Gym')
      await startButton(pc).click()
      await savedToAccount(pc)
      await expect.poll(() => runningOnAccount(pc)).toEqual(['Gym'])

      // the phone has seen Gym running; then, in the basement, it opens with no signal
      const phone = await phoneContext.newPage()
      await reopenFromAccount(phone)
      await expect(stopButton(phone)).toBeVisible()
      await phone.route(SYNC, (route) => route.abort('internetdisconnected'))
      await phone.reload({ waitUntil: 'domcontentloaded' })
      await couldNotCheck(phone)
      const pressedAt = await phone.evaluate(() => Date.now())
      await stopButton(phone).click()
      await expect(startButton(phone)).toBeVisible()
      await expect
        .poll(async () => ((await readState(phone)) as { entries: { description: string; stop: string | null }[] }).entries.find((e) => e.description === 'Gym')?.stop ?? null)
        .not.toBeNull()

      // Android closes the app in the background; it is opened again, still with no signal
      await phone.reload({ waitUntil: 'domcontentloaded' })
      await couldNotCheck(phone)
      await expect(startButton(phone), 'the Stop is gone after opening again').toBeVisible()

      // the signal comes back
      await phone.unroute(SYNC)
      await phone.evaluate(() => window.dispatchEvent(new Event('online')))
      await savedToAccount(phone, 30_000)
      await expect.poll(() => runningOnAccount(pc), { message: 'the account never heard of the Stop' }).toEqual([])
      const gym = (await entriesWithTimes(pc)).find((e) => e.description === 'Gym')!
      expect(Math.abs(Date.parse(gym.stopped_at!) - pressedAt), 'the account does not carry the moment of the Stop').toBeLessThan(5_000)
      await expect(startButton(phone), 'the phone shows Gym running again').toBeVisible()
    } finally {
      await phoneContext.close()
      await pcContext.close()
    }
  })

  test('a phone that started a timer with no signal stops the PC\'s timer on the account too, not only on its screen', async ({
    browser,
    account,
  }) => {
    test.setTimeout(120_000)
    const baseURL = test.info().project.use.baseURL
    const pcContext = await browser.newContext({ storageState: account.storageState, baseURL, viewport: { width: 1366, height: 900 } })
    const phoneContext = await browser.newContext({ ...devices['Pixel 7'], storageState: account.storageState, baseURL })
    try {
      const pc = await pcContext.newPage()
      await openFreshTracker(pc)
      // the phone's copy is from before Gym
      const phone = await phoneContext.newPage()
      await reopenFromAccount(phone)
      await expect(startButton(phone)).toBeVisible()

      await pc.getByPlaceholder('What are you working on?').fill('Gym')
      await startButton(pc).click()
      await savedToAccount(pc)
      await expect.poll(() => runningOnAccount(pc)).toEqual(['Gym'])

      // the phone opens with no signal, on its old copy, and starts Walk
      await phone.route(SYNC, (route) => route.abort('internetdisconnected'))
      await phone.reload({ waitUntil: 'domcontentloaded' })
      await couldNotCheck(phone)
      await phone.getByPlaceholder('What are you working on?').fill('Walk')
      await startButton(phone).click()
      await expect(stopButton(phone)).toBeVisible()

      await phone.unroute(SYNC)
      await phone.evaluate(() => window.dispatchEvent(new Event('online')))
      await expect(phone.getByText(/Another device had a timer running too/).first()).toBeVisible({ timeout: 30_000 })
      await savedToAccount(phone, 30_000)
      await expect
        .poll(() => runningOnAccount(pc), { message: 'the phone showed Gym stopped, and the account still runs it' })
        .toEqual(['Walk'])
    } finally {
      await phoneContext.close()
      await pcContext.close()
    }
  })

  test('a Stop on a PC that has not checked yet keeps the phone\'s earlier Stop, and says the other device changed it', async ({
    browser,
    account,
  }) => {
    test.setTimeout(120_000)
    const baseURL = test.info().project.use.baseURL
    const pcContext = await browser.newContext({ storageState: account.storageState, baseURL, viewport: { width: 1366, height: 900 } })
    const phoneContext = await browser.newContext({ ...devices['Pixel 7'], storageState: account.storageState, baseURL })
    try {
      const pc = await pcContext.newPage()
      await openFreshTracker(pc)
      await pc.getByPlaceholder('What are you working on?').fill('Gym')
      await startButton(pc).click()
      await savedToAccount(pc)
      const phone = await phoneContext.newPage()
      await reopenFromAccount(phone)
      await expect(stopButton(phone)).toBeVisible()

      // after the gym: Stop on the phone, then Shower
      await stopButton(phone).click()
      await expect(startButton(phone)).toBeVisible()
      await phone.getByPlaceholder('What are you working on?').fill('Shower')
      await startButton(phone).click()
      await expect(stopButton(phone)).toBeVisible()
      await savedToAccount(phone)
      await expect.poll(() => runningOnAccount(pc)).toEqual(['Shower'])
      const phoneStop = (await entriesWithTimes(pc)).find((e) => e.description === 'Gym')!.stopped_at!

      // the PC, not checked since, still shows Gym running, and Stop is pressed there
      await expect(pc.getByPlaceholder('What are you working on?')).toHaveValue('Gym')
      await stopButton(pc).click()
      await expect(pc.getByText(/Changed on your other device: “Gym”/).first(), 'the PC did not say the other device changed Gym').toBeVisible({
        timeout: 15_000,
      })
      await savedToAccount(pc)

      const after = await entriesWithTimes(pc)
      const gym = after.find((e) => e.description === 'Gym')!
      const shower = after.find((e) => e.description === 'Shower')!
      expect(Date.parse(gym.stopped_at!), 'Gym ends at the PC\'s later press').toBe(Date.parse(phoneStop))
      expect(Date.parse(gym.stopped_at!), 'Gym overlaps Shower: that time is counted twice').toBeLessThanOrEqual(Date.parse(shower.started_at))
    } finally {
      await phoneContext.close()
      await pcContext.close()
    }
  })
})

/**
 * TWO PEOPLE ON ONE BROWSER (a privacy audit, 2026-11-04). The tracker's copy
 * used to outlive Log Out and a session that ended, tied to nobody; the next
 * person was shown it and could have it uploaded into their own account. The
 * unit promises are anotherPersonNeverGetsYourTracker and
 * thePushRouteWritesOnlyForItsOwnAccount. Each test logs out or ends a session,
 * so the first person is an account made for that test alone.
 */
test.describe('two people on one browser', () => {
  const SECRET = 'A private therapy session'

  test('after A logs out, B signing in is shown and sent nothing of A\'s tracker', async ({ browser, throwawayAccount, secondUser }) => {
    test.setTimeout(150_000)
    const baseURL = test.info().project.use.baseURL
    const context = await browser.newContext({ storageState: SIGNED_OUT, baseURL, viewport: { width: 1366, height: 900 } })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await openTracker(page)
      await trackEntry(page, SECRET)
      await savedToAccount(page)
      await page.getByPlaceholder('What are you working on?').fill('A unsent: call the clinic')
      await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('toggl-clone:timer-bar') ?? '')).toContain('call the clinic')

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await whenHydrated(page.getByTestId('header-logout-button'), 60_000)
      await page.getByTestId('header-logout-button').click()
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/')

      await signIn(page, secondUser)
      await openTracker(page)
      await expect(entryInList(page, SECRET), 'B is shown A\'s entry').toHaveCount(0)
      await expect(page.getByPlaceholder('What are you working on?'), 'B finds A\'s half-typed description').toHaveValue('')
      expect(await entriesOnAccount(page), 'A\'s entry went into B\'s account').not.toContain(SECRET)
    } finally {
      await context.close()
    }
  })

  test('Log Out with a change not saved yet sends it first, or asks before losing it', async ({ browser, throwawayAccount }) => {
    test.setTimeout(150_000)
    const baseURL = test.info().project.use.baseURL
    const context = await browser.newContext({ storageState: SIGNED_OUT, baseURL, viewport: { width: 1366, height: 900 } })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await openTracker(page)
      // in the basement: tracked, and not on the account
      await page.route(SYNC, (route) => route.abort('internetdisconnected'))
      await trackEntry(page, 'Basement set')
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await whenHydrated(page.getByTestId('header-logout-button'), 60_000)

      await page.getByTestId('header-logout-button').click()
      const question = page.getByTestId('log-out-unsent')
      await expect(question, 'Log Out threw the unsent entry away without asking').toBeVisible({ timeout: 20_000 })
      await expect(question).toContainText(/n't reached your account yet/)
      await page.getByTestId('log-out-stay').click()
      await expect(question).toBeHidden()
      expect(new URL(page.url()).pathname, 'Stay signed in signed out').toBe('/dashboard')

      // the signal is back: Log Out sends it and goes, without asking
      await page.unroute(SYNC)
      await page.getByTestId('header-logout-button').click()
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/')
      await signIn(page, throwawayAccount)
      expect(await entriesOnAccount(page), 'the entry was lost at Log Out').toContain('Basement set')
    } finally {
      await context.close()
    }
  })

  test('when A\'s session ends with an entry unsent, B signing in on that browser is sent none of it', async ({
    browser,
    throwawayAccount,
    secondUser,
  }) => {
    test.setTimeout(150_000)
    const baseURL = test.info().project.use.baseURL
    const context = await browser.newContext({ storageState: SIGNED_OUT, baseURL, viewport: { width: 1366, height: 900 } })
    try {
      const page = await context.newPage()
      await signIn(page, throwawayAccount)
      await openTracker(page)
      // A's session ends while the tracker is open, and A tracks something
      await context.clearCookies()
      await trackEntry(page, SECRET)
      await expect(page.locator('header').getByRole('button', { name: /^Signed out\./ })).toBeVisible({ timeout: 20_000 })

      // A walks away; B signs in on this browser and opens Time
      await signIn(page, secondUser)
      await openTracker(page)
      await expect(entryInList(page, SECRET), 'B is shown A\'s entry').toHaveCount(0)
      expect(await entriesOnAccount(page), 'A\'s entry went into B\'s account').not.toContain(SECRET)
    } finally {
      await context.close()
    }
  })
})
