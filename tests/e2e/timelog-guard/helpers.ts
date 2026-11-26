import { devices, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { test } from '../fixtures/test'
import { fixClock, type FixedClock } from './clock'
import {
  PENDING_KEY,
  STORAGE_KEY,
  TRACKER,
  clearAccount,
  entryInList,
  onPhone,
  savedToAccount,
  timerButton,
} from '../helpers/timetrack'

/**
 * What the owner does every day in the Time Log, as steps a person takes, on
 * whichever layout the project's device draws (below 640px a phone's screens,
 * above it the PC's). The stories (stories.spec.ts) say WHAT must hold; this
 * file says how a finger or a keyboard does it on each layout.
 *
 * HOW EASY IS THE TASK is part of what is guarded, not only where the data
 * ends up. Every tap goes through `Taps.tap`, which refuses a control that is
 * off screen (a person would have to scroll for it) or, on a phone, smaller
 * than a thumb (44px, the floor mobile/mobile-toggl.spec.ts holds every
 * screen to), and counts it, so a story can say "this takes at most N taps"
 * and a change that makes it longer fails.
 */

/** The day every story starts on: a Wednesday, ten in the morning in Copenhagen (winter time, UTC+1) */
export const MORNING = '2026-11-18T10:00:00+01:00'

/** Counts what a person must tap, and checks each tap is one a thumb can make */
export class Taps {
  count = 0
  constructor(private readonly page: Page) {}

  async tap(target: Locator, what: string): Promise<void> {
    await expect(target, `${what}: not on screen`).toBeVisible()
    await expect(target, `${what}: a person would have to scroll to reach it`).toBeInViewport()
    if (onPhone(this.page)) {
      const box = await target.boundingBox()
      expect(box, `${what}: has no size`).not.toBeNull()
      expect(Math.min(box!.width, box!.height), `${what}: smaller than a thumb (44px)`).toBeGreaterThanOrEqual(44)
    }
    await target.click()
    this.count++
  }

  /**
   * Turn a wheel to `value`: a finger swipes it, here its own scrolling brings
   * the value to the middle, where it settles and becomes the choice. One swipe
   * is one action. The wheel is what has to be on screen and big enough.
   */
  async turn(wheel: Locator, value: string, what: string): Promise<void> {
    await expect(wheel, `${what}: not on screen`).toBeInViewport()
    const box = await wheel.boundingBox()
    expect(Math.min(box!.width, box!.height), `${what}: smaller than a thumb (44px)`).toBeGreaterThanOrEqual(44)
    const option = wheel.getByRole('option', { name: value, exact: true })
    await option.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(option, `${what}: the wheel did not settle on ${value}`).toHaveAttribute('aria-selected', 'true')
    this.count++
  }
}

/** The tracker's own sections: the phone's bar at the bottom, the PC's sidebar */
export async function goToSection(page: Page, section: 'Timer' | 'Reports' | 'Projects'): Promise<void> {
  if (onPhone(page)) {
    await page.evaluate(() => window.scrollTo(0, 0))
    if (section === 'Projects') {
      await page.getByRole('button', { name: 'Settings and more' }).click()
      await page.getByRole('dialog', { name: 'Settings and more' }).getByRole('button', { name: 'Projects', exact: true }).click()
      await expect(page.getByRole('banner').getByRole('heading', { level: 2 })).toHaveText('Projects')
      return
    }
    // dispatchEvent, not click(): in `next dev` the dev-tools badge sits in a bottom corner and can cover the bar
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: section, exact: true }).dispatchEvent('click')
    return
  }
  await page.getByRole('navigation', { name: 'Tracker' }).getByRole('button', { name: new RegExp(`^${section}`) }).click()
}

/** A project, made on the Projects screen of either layout; ends back on the timer */
export async function makeProject(page: Page, name: string): Promise<void> {
  await goToSection(page, 'Projects')
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('main').getByRole('button', { name, exact: true })).toBeVisible()
  await goToSection(page, 'Timer')
  await expect(timerButton(page, 'Start timer')).toBeVisible()
}

/**
 * Start a timer called `description`, with `project` when given: typed into the
 * bar and Start on a PC; on a phone "I'm working on…", the name, ⋮ › Project
 * and task…, and the sheet's Start.
 */
export async function startTimer(taps: Taps, page: Page, description: string, project?: string): Promise<void> {
  if (!onPhone(page)) {
    await page.getByPlaceholder('What are you working on?').fill(description)
    if (project) await pickProjectOnPc(taps, page, project)
    await taps.tap(timerButton(page, 'Start timer'), 'Start')
    await expect(timerButton(page, 'Stop timer')).toBeVisible()
    return
  }
  await taps.tap(page.getByTestId('run-bar').getByRole('button', { name: /working on/ }), '"I’m working on…"')
  const sheet = page.getByRole('dialog', { name: 'New time entry' })
  await sheet.getByPlaceholder('I’m working on…').fill(description)
  if (project) {
    await taps.tap(sheet.getByRole('button', { name: 'More options' }), 'More options')
    await taps.tap(page.getByRole('button', { name: 'Project and task…' }), 'Project and task…')
    await page.getByPlaceholder(/Search by project, task or client/).fill(project)
    await taps.tap(page.getByRole('button', { name: project, exact: true }).last(), `the project ${project}`)
  }
  await taps.tap(sheet.getByRole('button', { name: 'Start', exact: true }), 'Start')
  await expect(sheet).toBeHidden()
  await expect(timerButton(page, 'Stop timer')).toBeVisible()
}

async function pickProjectOnPc(taps: Taps, page: Page, project: string): Promise<void> {
  await taps.tap(page.getByRole('main').getByRole('button', { name: 'Project', exact: true }).first(), 'the bar’s Project')
  await page.getByPlaceholder('Search by project, task or client').fill(project)
  await taps.tap(page.locator('[data-dropdown-panel]').getByRole('button', { name: project, exact: true }).first(), `the project ${project}`)
}

/** Stop the running timer with the one Stop control the layout shows */
export async function stopTimer(taps: Taps, page: Page): Promise<void> {
  await taps.tap(timerButton(page, 'Stop timer'), 'Stop')
  await expect(timerButton(page, 'Start timer')).toBeVisible()
}

/** What one row of the list says, as a person reads it: its name, length and the time it ran from and to */
export interface RowSeen {
  length: string
  from: string | null
  to: string | null
}

/**
 * Read a row in whichever layout: the PC's row is boxes (name, start, end,
 * length), the phone's one line of text "name 0:30:00 10:00–10:30".
 */
export async function readRow(page: Page, description: string): Promise<RowSeen> {
  const row = entryInList(page, description).first()
  await expect(row).toBeVisible()
  if (!onPhone(page)) {
    const box = (name: string) => row.getByRole('textbox', { name, exact: true })
    const from = await box('Start time').inputValue().catch(() => null)
    const to = await box('End time').inputValue().catch(() => null)
    return { length: await box('Duration').inputValue(), from, to }
  }
  const text = (await row.innerText()).replace(/\s+/g, ' ')
  const length = text.match(/\d+:\d\d:\d\d/)?.[0] ?? ''
  const range = text.match(/(\d\d:\d\d)\s*–\s*(\d\d:\d\d)/)
  return { length, from: range?.[1] ?? null, to: range?.[2] ?? null }
}

/** The account's own rows: what every other device would read */
export interface AccountEntry {
  id: string
  description: string
  project_id: string | null
  started_at: string
  stopped_at: string | null
  deleted_at: string | null
}
export async function accountEntries(page: Page, opts: { withDeleted?: boolean } = {}): Promise<AccountEntry[]> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status(), 'could not read the account').toBe(200)
  const body = (await response.json()) as { rows: { timetrack_entries: AccountEntry[] } }
  return body.rows.timetrack_entries.filter((e) => opts.withDeleted || e.deleted_at === null)
}

/** The name of the project with this id on the account */
export async function projectNamed(page: Page, id: string | null): Promise<string | null> {
  if (id === null) return null
  const response = await page.request.get('/api/timetrack/sync')
  const body = (await response.json()) as { rows: { timetrack_projects: { id: string; name: string }[] } }
  return body.rows.timetrack_projects.find((p) => p.id === id)?.name ?? null
}

/** Milliseconds between two ISO times */
export const between = (from: string, to: string): number => Date.parse(to) - Date.parse(from)

/**
 * The other device of the same account: a phone when this page is a PC, a PC
 * when it is a phone. Its clock starts where this one is now, and it signs in
 * with the worker's own saved login, as a second device of the same person.
 */
export interface OtherDevice {
  context: BrowserContext
  page: Page
  clock: FixedClock
}
export async function openOtherDevice(browser: Browser, page: Page, storageState: string, clock: FixedClock): Promise<OtherDevice> {
  const device = onPhone(page) ? devices['Desktop Chrome'] : devices['Pixel 7']
  const context = await browser.newContext({
    ...device,
    storageState,
    timezoneId: 'Europe/Copenhagen',
    baseURL: test.info().project.use.baseURL,
    serviceWorkers: 'block',
  })
  const otherClock = await fixClock(context, clock.now().toISOString())
  return { context, page: await context.newPage(), clock: otherClock }
}

/** Wait for the account to hold everything, then move the clock: a jump with a save in the air would abort it */
export async function later(page: Page, clock: FixedClock, ms: number) {
  await savedToAccount(page)
  await clock.jump(ms)
}

/** "1:30:05" as seconds; NaN for anything that is not a clock reading, so a misread fails a comparison loudly */
export function clockSeconds(text: string): number {
  const m = text.match(/^(\d+):(\d\d):(\d\d)$/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number.NaN
}

/**
 * An empty account and a browser that has never opened the tracker, like
 * `openFreshTracker`, but patient and talkative: the first answer from the
 * account gets 60 seconds instead of 20 (a shared test backend that other runs
 * are also using stalled twice in 760 starts), and a start that still does not
 * come says which requests were in the air, so a real hang is a finding and
 * not a bare timeout.
 */
export async function openClean(page: Page): Promise<void> {
  const inTheAir = new Map<string, number>()
  const started = (request: { url(): string; method(): string }) => inTheAir.set(`${request.method()} ${request.url()}`, Date.now())
  const ended = (request: { url(): string; method(): string }) => inTheAir.delete(`${request.method()} ${request.url()}`)
  page.on('request', started)
  page.on('requestfinished', ended)
  page.on('requestfailed', ended)
  try {
    await clearAccount(page)
    if (!page.url().includes(TRACKER)) await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
    await page.evaluate((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), [STORAGE_KEY, PENDING_KEY])
    await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
    await savedToAccount(page, 60_000)
  } catch (error) {
    const waiting = [...inTheAir].map(([what, since]) => `${what} (${Math.round((Date.now() - since) / 1000)}s)`)
    if (error instanceof Error) error.message += `\n\nrequests still in the air: ${waiting.length ? waiting.join(' | ') : 'none'}`
    throw error
  } finally {
    page.off('request', started)
    page.off('requestfinished', ended)
    page.off('requestfailed', ended)
  }
}

/** Open the tracker on a page and wait until the account has answered: `openTracker` with the same 60 seconds as `openClean` */
export async function openAgain(page: Page): Promise<void> {
  await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
  await savedToAccount(page, 60_000)
}
