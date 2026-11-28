/**
 * THE FIRST GLANCE AFTER REOPENING: A TIMER STOPPED ELSEWHERE NEVER SHOWS AS RUNNING.
 *
 * The owner's words (2026-11-28): "it just looks buggy when i reopen it,
 * because it continues for a split second the previous running thing, even if
 * it was closed on another browser/device".
 *
 * reopen.spec.ts asks whether the device shows the account's version within 5
 * seconds. This file asks about every moment before that: from the instant the
 * Time Log is back on screen, the timer the other device stopped must never be
 * drawn as running (`runningWatch`: the bar, a "Running:" row, the PC's timer
 * bar, the header pill, the tab title). And the other way round: a timer that
 * IS still running must not flash as stopped (Start offered) on the way.
 *
 * Device A runs "Alpha" and is put away (closed, or asleep in a pocket);
 * device B stops it, or switches to "Beta"; A comes back. Each test makes its
 * own two devices, so it runs once, in the desktop project.
 */
import { test, expect } from '../fixtures/test'
import { devices, request as pwRequest, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { TRACKER, openFreshTracker, openTracker, savedToAccount, startNamed, tapStop, timerButton } from '../helpers/timetrack'
import { phoneHooks, runningWatch } from './phonePage'
import { ZONE, readServer } from './phoneVsServer'

type Kind = 'phone' | 'pc'
type BDid = 'stop' | 'switch' | 'nothing'
type Back = 'new-page' | 'woken'

interface Case {
  /** the device that comes back */
  a: Kind
  bDid: BDid
  back: Back
}

async function device(browser: Browser, storageState: string, kind: Kind): Promise<BrowserContext> {
  const context = await browser.newContext({
    ...(kind === 'phone' ? devices['Pixel 7'] : devices['Desktop Chrome']),
    storageState,
    baseURL: test.info().project.use.baseURL,
    timezoneId: ZONE,
    serviceWorkers: 'block',
  })
  await context.addInitScript(phoneHooks)
  await context.addInitScript(runningWatch)
  return context
}

/** What A drew as running (or idle) since it was armed */
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)

async function runCase(browser: Browser, storageState: string, c: Case) {
  const a = await device(browser, storageState, c.a)
  const b = await device(browser, storageState, c.a === 'phone' ? 'pc' : 'phone')
  const api = await pwRequest.newContext({ baseURL: test.info().project.use.baseURL, storageState })
  try {
    // A starts Alpha; B has the Time Log open and sees it running
    let pageA = await a.newPage()
    await openFreshTracker(pageA)
    await startNamed(pageA, 'Alpha')
    await savedToAccount(pageA)
    const pageB = await b.newPage()
    await openTracker(pageB)
    await expect(timerButton(pageB, 'Stop timer'), 'B never learned of the timer').toBeVisible({ timeout: 20_000 })

    // A is put away: closed, or hidden and asleep (its timers and network answers held)
    if (c.back === 'new-page') {
      await pageA.close()
    } else {
      await pageA.evaluate(() => {
        const w = window as unknown as { __setVisibility: (v: 'hidden') => void; __freeze: () => void }
        w.__setVisibility('hidden')
        w.__freeze()
      })
    }

    // B acts meanwhile, and the account holds it
    if (c.bDid !== 'nothing') {
      await tapStop(pageB)
      if (c.bDid === 'switch') await startNamed(pageB, 'Beta')
      await savedToAccount(pageB)
    }
    await expect
      .poll(async () => (await readServer(api)).filter((e) => e.stopped_at === null).map((e) => e.description).join(','), { timeout: 15_000 })
      .toBe(c.bDid === 'stop' ? '' : c.bDid === 'switch' ? 'Beta' : 'Alpha')

    // A comes back, watched from its first moment
    const watchIdle = c.bDid === 'nothing'
    if (c.back === 'new-page') {
      await a.addInitScript((idle) => {
        const w = window as unknown as { __watchFor: string; __watchIdle: boolean }
        w.__watchFor = 'Alpha'
        w.__watchIdle = idle
      }, watchIdle)
      pageA = await a.newPage()
      await pageA.goto(TRACKER, { waitUntil: 'domcontentloaded' })
    } else {
      await pageA.evaluate((idle) => {
        const w = window as unknown as {
          __setSkew: (ms: number) => void
          __thaw: () => void
          __setVisibility: (v: 'visible') => void
          __watchFor: string
          __watchIdle: boolean
          __look: () => void
        }
        // two hours in a pocket
        w.__setSkew(2 * 60 * 60_000)
        w.__thaw()
        w.__setVisibility('visible')
        // from here on: the page has been told it is back
        w.__watchFor = 'Alpha'
        w.__watchIdle = idle
        w.__look()
      }, watchIdle)
    }

    // it settles on the account's version
    await savedToAccount(pageA)
    if (c.bDid === 'stop') await expect(timerButton(pageA, 'Start timer')).toBeVisible()
    else await expect(timerButton(pageA, 'Stop timer')).toBeVisible()
    if (c.bDid === 'switch') await expect(pageA.getByText('Beta').first()).toBeVisible()
    if (c.bDid === 'nothing') await expect(pageA.getByText('Alpha').first()).toBeVisible()

    const shown = await seen(pageA)
    if (c.bDid === 'nothing') {
      // Alpha is still running: seeing it is right, offering Start on the way is not
      expect(shown.filter((s) => s.startsWith('Start')), 'A flashed "nothing running" while Alpha still ran').toEqual([])
    } else {
      expect(shown, `A showed Alpha running after B had ${c.bDid === 'stop' ? 'stopped' : 'switched'} it`).toEqual([])
    }
  } finally {
    await api.dispose()
    await a.close()
    await b.close()
  }
}

test.skip(({ isMobile }) => isMobile, 'makes its own two devices; runs once, in timelog-guard-desktop')

test.describe('the first glance after reopening the Time Log', () => {
  test.setTimeout(120_000)
  const cases: Case[] = [
    { a: 'phone', bDid: 'stop', back: 'new-page' },
    { a: 'phone', bDid: 'switch', back: 'new-page' },
    { a: 'phone', bDid: 'stop', back: 'woken' },
    { a: 'pc', bDid: 'stop', back: 'new-page' },
    { a: 'phone', bDid: 'nothing', back: 'new-page' },
    { a: 'phone', bDid: 'nothing', back: 'woken' },
  ]
  for (const c of cases) {
    const what = c.bDid === 'nothing' ? 'nothing changed elsewhere: the timer is never shown as stopped' : `the other device ${c.bDid === 'stop' ? 'stopped' : 'switched'} the timer: it is never shown running`
    test(`${c.a} ${c.back === 'new-page' ? 'opened again' : 'woken after two hours'}, ${what}`, async ({ browser, account }) => {
      await runCase(browser, account.storageState, c)
    })
  }
})
