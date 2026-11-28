/**
 * THE PHONE COMES BACK TO THE TIME LOG AFTER A TIMER RAN ELSEWHERE.
 *
 * The owner's report: he opens the Time Log on his phone after a timer ran (on
 * the phone or on the PC) and sometimes it shows the wrong thing. No crash is
 * logged and the exact symptom is not known yet, so this spec does not guess
 * one. It asks the one question every symptom is a failure of: within 5
 * seconds of coming back, does the phone show what the account holds?
 * (`expectPhoneMatchesServer`: running bar, list of entries, no entry twice,
 * badge says Saved.)
 *
 * THE MATRIX, one test per cell (the title says which):
 *   timer started on   the phone | the PC
 *   the PC then did    nothing | stopped it | switched (stopped it, started another) | moved its start earlier
 *   the phone returns  a  closed, then opened in a new page
 *                      b  back/forward cache (see below)
 *                      c  frozen, then thawed, its clock hours later
 *                      d  opened offline from the service worker, then online (production build only)
 * The phone is the device that comes back. "The PC did X" happens while the
 * phone is away; on "started on the PC" the phone never saw the timer.
 *
 * WHAT CANNOT BE REAL IN PLAYWRIGHT'S CHROMIUM, AND WHAT STANDS IN FOR IT
 * (measured, 2026-11-26):
 *  - Back/forward cache: Chromium here reports BackForwardCacheDisabledForDelegate
 *    (the headless embedder), so `pageshow.persisted` is never true. The "real"
 *    variant still navigates away and presses back, and logs `persisted`; the
 *    "simulated" variant makes the page believe it was hidden and shown from
 *    the cache: `visibilitychange` hidden, `pagehide{persisted}`, then visible and
 *    `pageshow{persisted:true}`, the events the sync hook's wake handlers listen to.
 *  - Freeze: `Page.setWebLifecycleState` is sent through CDP, but a headless
 *    page ignores it (no `freeze` event, its timers keep firing). So the test
 *    also holds the page's timers and network answers itself while "frozen"
 *    (page.addInitScript below) and releases them on thaw; whether CDP engaged
 *    is annotated on every run. The hours are a page clock that jumps forward
 *    on thaw: the phone's clock is hours ahead of the account's.
 *  - Visibility: a Playwright page is always "visible", so hidden/visible is
 *    set by overriding `document.visibilityState` and dispatching the event.
 */
import { test, expect } from '../fixtures/test'
import { devices, request as pwRequest, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import {
  TRACKER,
  openFreshTracker,
  openTracker,
  savedToAccount,
  startNamed,
  tapStop,
  timerButton,
} from '../helpers/timetrack'
import { ZONE, expectPhoneMatchesServer, readPhone, readServer, type ServerEntry } from './phoneVsServer'
import { phoneHooks } from './phonePage'

type RanOn = 'phone' | 'pc'
type PcDid = 'nothing' | 'stop' | 'switch' | 'edit-start' | 'delete'
type Back = 'a-new-page' | 'b-bfcache-real' | 'b-bfcache-simulated' | 'c-freeze' | 'd-offline' | 'e-tab-switch'

const H = 60 * 60_000
const MIN = 60_000

// ---------------------------------------------------------------- the account

/**
 * The instant that is `hour`:00 on the calendar day `daysAgo` days before today, in the account's zone.
 * Fixed hours of yesterday, not "6 hours ago": an entry that straddles midnight is drawn under both days,
 * which would make the list's row count depend on when the test runs.
 */
function zonedHour(daysAgo: number, hour: number): number {
  const parts = (t: number) => new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t))
  const get = (p: Intl.DateTimeFormatPart[], k: string) => Number(p.find((x) => x.type === k)!.value)
  const offsetAt = (t: number) => {
    const p = parts(t)
    return Date.UTC(get(p, 'year'), get(p, 'month') - 1, get(p, 'day'), get(p, 'hour'), get(p, 'minute'), get(p, 'second')) - Math.floor(t / 1000) * 1000
  }
  const today = parts(Date.now())
  const wall = Date.UTC(get(today, 'year'), get(today, 'month') - 1, get(today, 'day') - daysAgo, hour)
  return wall - offsetAt(wall - offsetAt(wall))
}

/** Minutes since midnight in the account's zone, now */
function minutesSinceMidnight(): number {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date())
  return Number(p.find((x) => x.type === 'hour')!.value) * 60 + Number(p.find((x) => x.type === 'minute')!.value)
}

/** A finished entry the account holds already, as the sync endpoint's own rows look */
async function seedHistory(api: APIRequestContext, entries: { description: string; startMs: number; stopMs: number }[]) {
  const pulled = await api.get('/api/timetrack/sync')
  const body = (await pulled.json()) as {
    rows: { timetrack_entries: Record<string, unknown>[]; timetrack_workspaces: { id: string; user_id: string }[] }
  }
  const workspace = body.rows.timetrack_workspaces.find((w) => (w as { deleted_at?: unknown }).deleted_at == null)
  expect(workspace, 'the account has no workspace to put history in').toBeDefined()
  const at = new Date().toISOString()
  const rows = entries.map((e) => ({
    id: randomUUID(),
    user_id: workspace!.user_id,
    workspace_id: workspace!.id,
    project_id: null,
    task_id: null,
    description: e.description,
    billable: false,
    started_at: new Date(e.startMs).toISOString(),
    stopped_at: new Date(e.stopMs).toISOString(),
    duration_seconds: Math.round((e.stopMs - e.startMs) / 1000),
    duration_only: false,
    created_with: '10kdaysclub',
    source_event_id: null,
    running_device_id: null,
    shared_with: [],
    created_at: at,
    updated_at: at,
    deleted_at: null,
  }))
  const pushed = await api.post('/api/timetrack/sync', { data: { rows: { timetrack_entries: rows } } })
  expect(pushed.ok(), `could not seed history: ${pushed.status()} ${await pushed.text()}`).toBe(true)
}

/** Delete an entry on the account the way a device does: a row with `deleted_at` set */
async function tombstone(api: APIRequestContext, id: string) {
  const pulled = await api.get('/api/timetrack/sync')
  const body = (await pulled.json()) as { rows: { timetrack_entries: Record<string, unknown>[] } }
  const row = body.rows.timetrack_entries.find((e) => e.id === id)
  expect(row, 'the entry to delete is not on the account').toBeDefined()
  const now = new Date().toISOString()
  const pushed = await api.post('/api/timetrack/sync', {
    data: { rows: { timetrack_entries: [{ ...row, deleted_at: now, updated_at: now }] } },
  })
  expect(pushed.ok(), `could not delete: ${pushed.status()}`).toBe(true)
}

/** `savedToAccount`, but a failure says what the badge said instead */
async function savedOrSay(page: Page, when: string) {
  try {
    await savedToAccount(page)
  } catch (error) {
    const header = await page.locator('header').allTextContents().catch(() => ['(page gone)'])
    throw new Error(`${when}: the badge never said Saved. Header text: ${header.join(' | ').replace(/\s+/g, ' ')}`, { cause: error })
  }
}

// ---------------------------------------------------------------- the PC's actions

async function pcStop(pc: Page) {
  await tapStop(pc)
  await savedOrSay(pc, 'the PC, after Stop')
}

async function pcSwitch(pc: Page) {
  await pcStop(pc)
  await startNamed(pc, 'Beta')
  await savedOrSay(pc, 'the PC, after starting Beta')
}

/**
 * Typing "45" in the running time's box means "it started 45 minutes ago" (TimerBar, `setRunningElapsed`; a
 * number from 10 up is minutes). Never further back than midnight: a timer that began yesterday is drawn
 * under both days, which is a different question from the one this spec asks.
 */
const editShiftMinutes = () => Math.min(90, minutesSinceMidnight() - 1)
async function pcEditStart(pc: Page, minutes: number) {
  const duration = pc.getByLabel('Duration').first()
  await duration.click()
  await duration.fill(String(minutes))
  await duration.press('Enter')
  await savedOrSay(pc, 'the PC, after moving the start')
}

// ---------------------------------------------------------------- one cell

interface Cell {
  ranOn: RanOn
  pcDid: PcDid
  back: Back
  /** the phone's clock is this far ahead (+) or behind (-) the account's the whole time */
  clockSkewMs?: number
  /** the clock jumps by this much while the phone is away (c-freeze: "hours later") */
  clockJumpMs?: number
  /** wake twice within milliseconds */
  doubleWake?: boolean
  /** a new version of the app was deployed while the phone was away: /api/healthz names another build once, on waking */
  newBuild?: boolean
  /** the phone stops the timer first, but its upload is still in flight (held) while the PC acts and the phone wakes */
  phoneStopsFirst?: boolean
}

interface Rig {
  phoneContext: BrowserContext
  pcContext: BrowserContext
  api: APIRequestContext
}

async function openRig(browser: Browser, storageState: string, back: Back): Promise<Rig> {
  const baseURL = test.info().project.use.baseURL
  const phoneContext = await browser.newContext({ ...devices['Pixel 7'], storageState, baseURL, timezoneId: ZONE, serviceWorkers: back === 'd-offline' ? 'allow' : 'block' })
  const pcContext = await browser.newContext({ ...devices['Desktop Chrome'], storageState, baseURL, timezoneId: ZONE, serviceWorkers: 'block' })
  await phoneContext.addInitScript(phoneHooks)
  const api = await pwRequest.newContext({ baseURL, storageState })
  return { phoneContext, pcContext, api }
}

async function closeRig(rig: Rig) {
  await rig.api.dispose()
  await rig.phoneContext.close()
  await rig.pcContext.close()
}

const cellName = (c: Cell) =>
  `timer on ${c.ranOn}, PC ${c.pcDid}, phone back ${c.back}` +
  (c.clockSkewMs ? `, clock ${c.clockSkewMs > 0 ? '+' : '-'}${Math.abs(c.clockSkewMs) / MIN} min` : '') +
  (c.clockJumpMs ? `, clock jumps +${c.clockJumpMs / H} h` : '') +
  (c.doubleWake ? ', two wakes' : '') +
  (c.phoneStopsFirst ? ', phone stop still uploading' : '') +
  (c.newBuild ? ', new build deployed' : '')

/** The serverside facts a cell must have reached before the phone comes back */
async function expectAccountAfter(api: APIRequestContext, pcDid: PcDid, before: ServerEntry, shift: number) {
  await expect
    .poll(async () => {
      const all = await readServer(api)
      const alpha = all.find((e) => e.id === before.id)
      if (pcDid === 'nothing') return alpha?.stopped_at === null ? 'ok' : 'Alpha not running'
      if (pcDid === 'stop') return alpha && alpha.stopped_at !== null ? 'ok' : 'Alpha still running'
      if (pcDid === 'switch') {
        const beta = all.find((e) => e.description === 'Beta' && e.stopped_at === null)
        return alpha && alpha.stopped_at !== null && beta ? 'ok' : 'switch not on the account'
      }
      if (pcDid === 'delete') return alpha ? 'Alpha still on the account' : 'ok'
      return alpha && Date.parse(alpha.started_at) < Date.parse(before.started_at) - (shift - 2) * MIN ? 'ok' : 'start not moved'
    }, { timeout: 15_000, message: `the PC's "${pcDid}" never reached the account` })
    .toBe('ok')
}

async function runCell(browser: Browser, storageState: string, cell: Cell) {
  const info = test.info()
  const shift = editShiftMinutes()
  test.skip(cell.pcDid === 'edit-start' && shift < 10, 'within 11 minutes after local midnight: moving the start earlier would cross it')
  const rig = await openRig(browser, storageState, cell.back)
  const { phoneContext, pcContext, api } = rig
  try {
    // the account is empty and has two finished entries; the phone opens it, so its copy holds them
    let phone = await phoneContext.newPage()
    const pageErrors: string[] = []
    // what the phone asked the account, and what came back: the first thing to read when a cell fails
    const syncLog: string[] = []
    const started = Date.now()
    const watch = (p: Page) => {
      p.on('pageerror', (e) => pageErrors.push(e.message))
      p.on('response', async (r) => {
        const url = new URL(r.url())
        if (url.pathname !== '/api/timetrack/sync') return
        const method = r.request().method()
        let summary = ''
        try {
          const body = (await r.json()) as { rows?: { timetrack_entries?: { description: string; stopped_at: string | null; deleted_at: string | null }[] } }
          summary = (body.rows?.timetrack_entries ?? []).map((e) => `${e.description}${e.stopped_at ? '' : '*'}${e.deleted_at ? '(deleted)' : ''}`).join(',')
        } catch {
          summary = '(no body)'
        }
        syncLog.push(`+${((Date.now() - started) / 1000).toFixed(1)}s ${method} ${url.search || '(no query)'} -> ${r.status()} entries[${summary}]`)
      })
    }
    watch(phone)
    if (cell.clockSkewMs) await phone.addInitScript((ms) => { sessionStorage.setItem('__skew', String(ms)) }, cell.clockSkewMs)
    await openFreshTracker(phone)
    await seedHistory(api, [
      { description: 'History one', startMs: zonedHour(1, 10), stopMs: zonedHour(1, 11) },
      { description: 'History two', startMs: zonedHour(1, 12), stopMs: zonedHour(1, 13) },
    ])
    await phone.reload({ waitUntil: 'domcontentloaded' })
    await savedOrSay(phone, 'the phone, opened again with its history')

    if (cell.back === 'd-offline') {
      // the worker must hold the page before the phone loses signal; no worker means this is not a production build
      const controlled = await phone.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false
        return Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 10_000))])
      })
      test.skip(!controlled, 'no service worker: it registers only in a production build (npm run build, next start)')
      await expect
        .poll(() => phone.evaluate(async (path) => Boolean(await caches.match(new Request(new URL(path, location.origin).href))), TRACKER), { timeout: 15_000 })
        .toBe(true)
    }

    const pc = await pcContext.newPage()
    if (cell.ranOn === 'phone') {
      await startNamed(phone, 'Alpha')
      await savedOrSay(phone, 'the phone, after starting Alpha')
      await openTracker(pc)
      await expect(timerButton(pc, 'Stop timer'), 'the PC never learned of the phone\'s timer').toBeVisible({ timeout: 20_000 })
    } else {
      await openTracker(pc)
      await startNamed(pc, 'Alpha')
      await savedOrSay(pc, 'the PC, after starting Alpha')
    }
    await expect.poll(async () => (await readServer(api)).filter((e) => e.stopped_at === null).length, { timeout: 15_000 }).toBe(1)
    const alpha = (await readServer(api)).find((e) => e.description === 'Alpha')!
    expect(alpha, 'Alpha never reached the account').toBeDefined()

    // the phone's own stop is still on its way when it is put away
    let releaseUpload: () => void = () => {}
    if (cell.phoneStopsFirst) {
      const held = new Promise<void>((resolve) => (releaseUpload = resolve))
      await phone.route((url) => url.pathname === '/api/timetrack/sync', async (route) => {
        if (route.request().method() === 'POST') await held
        await route.continue().catch(() => undefined)
      })
      await tapStop(phone)
    }

    syncLog.push(`+${((Date.now() - started) / 1000).toFixed(1)}s --- phone is put away`)
    // the phone is put away
    let cdpEngaged: boolean | null = null
    if (cell.back === 'a-new-page') {
      await phone.close()
    } else if (cell.back === 'd-offline') {
      await phone.close()
      await phoneContext.setOffline(true)
      await phoneContext.route('**/api/**', (route) => route.abort('internetdisconnected'))
    } else if (cell.back === 'e-tab-switch') {
      // looked away and back, the page never frozen: its timers kept running
      await phone.evaluate(() => (window as unknown as { __setVisibility: (v: 'hidden') => void }).__setVisibility('hidden'))
    } else if (cell.back === 'b-bfcache-real') {
      await phone.goto('/api/healthz')
    } else if (cell.back === 'b-bfcache-simulated') {
      await phone.evaluate(() => {
        const w = window as unknown as { __setVisibility: (v: 'hidden') => void }
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
        w.__setVisibility('hidden')
        // a page in the back/forward cache is frozen
        ;(window as unknown as { __freeze: () => void }).__freeze()
      })
    } else {
      await phone.evaluate(() => (window as unknown as { __setVisibility: (v: 'hidden') => void }).__setVisibility('hidden'))
      const cdp = await phoneContext.newCDPSession(phone)
      await cdp.send('Page.setWebLifecycleState', { state: 'frozen' })
      // A page that is really frozen cannot answer. This one answers, so CDP did not freeze it, and
      // the page's own timers and network answers are held by the test instead (header of this file).
      const answered = await Promise.race([
        phone.evaluate(() => (window as unknown as { __freeze: () => void }).__freeze()).then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1_000)),
      ])
      cdpEngaged = !answered
    }

    // the PC does its part meanwhile
    if (cell.pcDid === 'stop') await pcStop(pc)
    else if (cell.pcDid === 'switch') await pcSwitch(pc)
    else if (cell.pcDid === 'edit-start') await pcEditStart(pc, shift)
    else if (cell.pcDid === 'delete') await tombstone(api, alpha.id)
    await expectAccountAfter(api, cell.pcDid, alpha, shift)

    if (cell.newBuild) {
      // the page asks which build the server runs when it comes back (useNewBuild); once, another one answers
      let answered = false
      await phoneContext.route('**/api/healthz', async (route) => {
        if (answered) return route.fallback()
        answered = true
        await route.fulfill({ json: { status: 'ok', buildId: 'f'.repeat(40), db: 'ok', proto: 'http' } })
      })
    }
    syncLog.push(`+${((Date.now() - started) / 1000).toFixed(1)}s --- phone comes back`)
    // the phone comes back
    const navigations: string[] = []
    if (cell.back === 'd-offline') {
      phone = await phoneContext.newPage()
      watch(phone)
      await phone.goto(TRACKER, { waitUntil: 'domcontentloaded' })
      await phone.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
      await phone.getByTestId('run-bar').waitFor({ timeout: 30_000 })
      // Does the old copy on screen say it may be out of date? Recorded, not asserted: the matrix's promise starts when signal returns.
      const warns = await expect
        .poll(async () => (await readPhone(phone)).badge, { timeout: 8_000 })
        .toMatch(/reach|Offline|Not saved|not checked|Checking/i)
        .then(() => true, () => false)
      const offline = await readPhone(phone)
      info.annotations.push({
        type: 'offline-open',
        description: `opened with no signal; says it may be out of date: ${warns}; running bar: ${offline.bar ? offline.bar.description : 'idle'}; header: ${offline.badge.split('|').pop()?.trim()}`,
      })
      // signal returns
      await phoneContext.unroute('**/api/**')
      await phoneContext.setOffline(false)
      await phone.evaluate(() => window.dispatchEvent(new Event('online')))
    } else if (cell.back === 'a-new-page') {
      phone = await phoneContext.newPage()
      watch(phone)
      if (cell.clockSkewMs) await phone.addInitScript((ms) => { sessionStorage.setItem('__skew', String(ms)) }, cell.clockSkewMs)
      await phone.goto(TRACKER, { waitUntil: 'domcontentloaded' })
    } else if (cell.back === 'b-bfcache-real') {
      await phone.goBack({ waitUntil: 'domcontentloaded' })
    } else if (cell.back === 'e-tab-switch') {
      phone.on('framenavigated', (f) => f === phone.mainFrame() && navigations.push(f.url()))
      await phone.evaluate(() => (window as unknown as { __setVisibility: (v: 'visible') => void }).__setVisibility('visible'))
    } else if (cell.back === 'b-bfcache-simulated') {
      phone.on('framenavigated', (f) => f === phone.mainFrame() && navigations.push(f.url()))
      await phone.evaluate((doubleWake) => {
        const w = window as unknown as { __setVisibility: (v: 'visible' | 'hidden') => void; __thaw: () => void }
        w.__thaw()
        w.__setVisibility('visible')
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
        if (doubleWake) {
          w.__setVisibility('hidden')
          w.__setVisibility('visible')
          window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
        }
      }, !!cell.doubleWake)
    } else {
      phone.on('framenavigated', (f) => f === phone.mainFrame() && navigations.push(f.url()))
      const cdp = await phoneContext.newCDPSession(phone)
      await cdp.send('Page.setWebLifecycleState', { state: 'active' })
      await phone.evaluate(
        ({ jump, doubleWake }) => {
          const w = window as unknown as {
            __thaw: () => void
            __setSkew: (ms: number) => void
            __setVisibility: (v: 'visible' | 'hidden') => void
          }
          if (jump) w.__setSkew(jump + Number(sessionStorage.getItem('__skew') ?? 0))
          w.__thaw()
          w.__setVisibility('visible')
          if (doubleWake) {
            w.__setVisibility('hidden')
            w.__setVisibility('visible')
          }
        },
        { jump: cell.clockJumpMs ?? 0, doubleWake: !!cell.doubleWake },
      )
    }

    releaseUpload()
    // "back" is when the tracker is drawn and can act (a dev server hydrates late; the 5 seconds start here)
    await phone.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
    await phone.getByTestId('run-bar').waitFor({ timeout: 30_000 })
    const log = await phone.evaluate(() => ({
      events: (window as unknown as { __log: string[] }).__log,
      pageshows: JSON.parse(sessionStorage.getItem('__pageshows') ?? '[]') as boolean[],
    }))
    if (cell.back === 'b-bfcache-real') {
      info.annotations.push({ type: 'bfcache', description: `pageshow.persisted log: ${JSON.stringify(log.pageshows)} (true = restored from the cache)` })
    }
    if (cell.back === 'c-freeze') {
      info.annotations.push({
        type: 'freeze',
        description: `CDP freeze engaged: ${cdpEngaged}${cdpEngaged ? '' : ' (the page kept answering; its timers and network answers were held by the test instead)'}`,
      })
    }
    if (navigations.length) info.annotations.push({ type: 'reload', description: `the page navigated on waking: ${navigations.join(', ')}` })

    try {
      // After its clock jumps hours ahead, the phone has truly not checked the account for hours by
      // its own clock, and the badge says so (amber) until the wake's check lands: the right words,
      // not a wrong screen. That check took up to ~9 s beside the other cells, so these cells wait 15 s.
      await expectPhoneMatchesServer(phone, api, { info, within: cell.clockJumpMs ? 15_000 : 5_000 })
    } catch (error) {
      // the HTML report keeps the attachment; a terminal run needs it printed
      console.log(`PHONE-SYNC-REQUESTS (${info.title})\n${syncLog.join('\n') || '(none)'}`)
      throw error
    } finally {
      await info.attach('phone-sync-requests.txt', { body: syncLog.join('\n') || '(none)', contentType: 'text/plain' })
    }
    expect(pageErrors, 'the phone page threw while coming back').toEqual([])
  } finally {
    await closeRig(rig)
  }
}

// ---------------------------------------------------------------- the matrix

// Every cell makes its own phone and its own PC, so the project's device means nothing here: run it once
// (CI runs both guard projects), in the one that is not a phone.
test.skip(({ isMobile }) => isMobile, 'makes its own phone and PC; runs once, in timelog-guard-desktop')

test.describe('phone reopens the Time Log after a timer ran', () => {
  test.setTimeout(120_000)
  const ranOn: RanOn[] = ['phone', 'pc']
  const pcDid: PcDid[] = ['nothing', 'stop', 'switch', 'edit-start']
  const backs: Back[] = ['a-new-page', 'b-bfcache-real', 'b-bfcache-simulated', 'c-freeze']
  for (const r of ranOn)
    for (const d of pcDid)
      for (const b of backs) {
        const cell: Cell = { ranOn: r, pcDid: d, back: b }
        test(cellName(cell), async ({ browser, account }) => {
          await runCell(browser, account.storageState, cell)
        })
      }
})

/**
 * OPENED WITH NO SIGNAL, THEN SIGNAL: needs the production build, because the
 * service worker (public/sw.js) registers there only. Run with PW_PROD=1 and
 * PW_BASE_URL at `next start` (docs/tech.md section 2).
 */
test.describe('phone opens the Time Log with no signal, then signal returns', () => {
  test.skip(!process.env.PW_PROD, 'needs a production build: the service worker registers only there (PW_PROD=1, PW_BASE_URL at next start)')
  test.setTimeout(120_000)
  for (const r of ['phone', 'pc'] as RanOn[])
    for (const d of ['nothing', 'stop', 'switch', 'edit-start'] as PcDid[]) {
      const cell: Cell = { ranOn: r, pcDid: d, back: 'd-offline' }
      test(cellName(cell), async ({ browser, account }) => {
        await runCell(browser, account.storageState, cell)
      })
    }
})

/**
 * HARDER WAKES, from reading the sync hook (useTimetrackSync.ts, the effect
 * "the page's comings and goings"). Each is one cell of the same question.
 */
test.describe('phone reopens the Time Log: harder wakes', () => {
  test.setTimeout(120_000)
  const cells: Cell[] = [
    // the phone looked away and back without freezing (timers kept running)
    ...(['phone', 'pc'] as RanOn[]).flatMap((ranOn) =>
      (['nothing', 'stop', 'switch', 'edit-start'] as PcDid[]).map((pcDid): Cell => ({ ranOn, pcDid, back: 'e-tab-switch' })),
    ),
    // the phone's clock jumps 3 hours ahead of the account's while it sleeps (an automatic time correction)
    ...(['stop', 'switch', 'edit-start'] as PcDid[]).map((pcDid): Cell => ({ ranOn: 'pc', pcDid, back: 'c-freeze', clockJumpMs: 3 * H })),
    // a new version of the app was deployed meanwhile: the page reloads itself on waking (useNewBuild),
    // or, with an unsent change, only offers "Updated · Tap to reload"
    { ranOn: 'pc', pcDid: 'stop', back: 'b-bfcache-simulated', newBuild: true },
    { ranOn: 'pc', pcDid: 'switch', back: 'e-tab-switch', newBuild: true },
    { ranOn: 'phone', pcDid: 'stop', back: 'e-tab-switch', newBuild: true },
    { ranOn: 'phone', pcDid: 'edit-start', back: 'b-bfcache-simulated', phoneStopsFirst: true, newBuild: true },
    // two wakes within milliseconds: visibilitychange + pageshow, then again
    { ranOn: 'pc', pcDid: 'switch', back: 'b-bfcache-simulated', doubleWake: true },
    { ranOn: 'phone', pcDid: 'stop', back: 'b-bfcache-simulated', doubleWake: true },
    { ranOn: 'pc', pcDid: 'edit-start', back: 'c-freeze', clockJumpMs: 3 * H, doubleWake: true },
    // the phone's own stop is still uploading while the PC acts and the phone wakes
    { ranOn: 'phone', pcDid: 'edit-start', back: 'b-bfcache-simulated', phoneStopsFirst: true },
    { ranOn: 'phone', pcDid: 'switch', back: 'b-bfcache-simulated', phoneStopsFirst: true },
    { ranOn: 'phone', pcDid: 'edit-start', back: 'c-freeze', clockJumpMs: 3 * H, phoneStopsFirst: true },
    // the PC deletes the running entry the phone's saved copy still shows
    { ranOn: 'phone', pcDid: 'delete', back: 'a-new-page' },
    { ranOn: 'phone', pcDid: 'delete', back: 'b-bfcache-simulated' },
    // a phone whose clock is minutes (or hours) off the account's
    ...[7 * MIN, -7 * MIN, 20 * MIN, -20 * MIN].flatMap((clockSkewMs) =>
      (['stop', 'switch', 'edit-start'] as PcDid[]).flatMap((pcDid) =>
        (['a-new-page', 'b-bfcache-simulated'] as Back[]).map((back): Cell => ({ ranOn: 'pc', pcDid, back, clockSkewMs })),
      ),
    ),
  ]
  for (const cell of cells)
    test(cellName(cell), async ({ browser, account }) => {
      await runCell(browser, account.storageState, cell)
    })
})
