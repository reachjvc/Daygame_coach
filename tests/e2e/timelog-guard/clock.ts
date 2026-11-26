import type { BrowserContext } from '@playwright/test'

/**
 * A FROZEN-START CLOCK THAT THE APP AND ITS SERVER AGREE ON.
 *
 * `page.clock.install` moves the page's `Date`, but the Time Log does not stamp
 * a start or a stop with the page's own clock: it learns how far that clock is
 * from the server's from the `Date` header of every sync answer
 * (src/timetrack/serverClock.ts, rule D5) and stamps with the server's time.
 * With only `clock.install`, a timer "started at 10:00" was stored at the real
 * time of the machine, days away.
 *
 * So the test plays the server's part too: every sync answer's `Date` header
 * is replaced by the page's own fake time, read from the page at that moment.
 * The app then finds its clock and the server's the same, and its offset stays
 * zero, as it does for a person whose phone is set by the network. The fake
 * time starts at `startIso` and runs at real speed; `jump` moves it on at once.
 *
 * NOT done here: the database's own `updated_at` stays real. Sync decides what
 * is newer by row versions, not by device clocks, so no story depends on it.
 */
export interface FixedClock {
  /** Moves the clock on by `ms` at once: every timer due fires once, as when a phone wakes after a long sleep */
  jump(ms: number): Promise<void>
  /** The clock's time now, as the app sees it */
  now(): Date
  /**
   * Puts the clock back to where the story has taken it (its start plus every
   * `jump`), dropping the real seconds a slow page load let pass. Called once
   * the tracker is open, so "10:00" is 10:00 and not 10:00:20 on a busy runner.
   */
  settle(): Promise<void>
  /**
   * Cuts or restores the connection. `context.setOffline` alone is not enough:
   * the answers here are fetched by the test, not by the browser, so they would
   * come through "offline". Sync requests are refused while it is on.
   */
  setOffline(offline: boolean): Promise<void>
}

const SYNC_ROUTE = '**/api/timetrack/sync*'

export async function fixClock(context: BrowserContext, startIso: string): Promise<FixedClock> {
  const start = Date.parse(startIso)
  if (Number.isNaN(start)) throw new Error(`fixClock: not a time: ${startIso}`)
  await context.clock.install({ time: start })
  let jumped = 0
  let offline = false
  let realAtStart = Date.now()
  const mirror = () => start + (Date.now() - realAtStart) + jumped

  await context.route(SYNC_ROUTE, async (route) => {
    try {
      if (offline) return await route.abort('internetdisconnected')
      const response = await route.fetch()
      // The page's own fake time, so the header can never be ahead of the page that reads it.
      const page = route.request().frame().page()
      // Not waited for long: a page that is loading or closing may never answer, and the request must not hang with it.
      const pageNow = await Promise.race([
        page.evaluate(() => Date.now()),
        new Promise<number>((resolve) => setTimeout(() => resolve(mirror()), 1_000)),
      ]).catch(() => mirror())
      await route.fulfill({ response, headers: { ...response.headers(), date: new Date(pageNow).toUTCString() } })
    } catch (error) {
      // The page or its context was closed while the answer was on its way: nobody is left to read it.
      if (!/closed|disposed|aborted/i.test(String(error))) throw error
    }
  })

  return {
    async jump(ms) {
      await context.clock.fastForward(ms)
      jumped += ms
    },
    now: () => new Date(mirror()),
    async settle() {
      realAtStart = Date.now()
      await context.clock.setSystemTime(start + jumped)
    },
    async setOffline(value) {
      offline = value
      await context.setOffline(value)
    },
  }
}
