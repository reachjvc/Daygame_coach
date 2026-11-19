/**
 * THE EVERYDAY TIME LOG FLOWS ON AN ANDROID PHONE, DONE THE WAY A PERSON DOES THEM
 * (Plans/tests-catch-what-matters.md, Phase 8).
 *
 * Every time here is set with the wheels (the drums), by tapping the number
 * wanted: never typed into the "Start time" box. Every flow has a written
 * ceiling of taps; if the product needs more taps than that, the screen got
 * harder to use and the test says so. Alongside, each flow checks what a thumb
 * needs: start and end use the same control, the length reads as hours and
 * minutes, the things tapped are at least 44 px (the sheet's own Start and End
 * boxes 48 px, finding F27), and what was saved is what the account holds.
 *
 * The map of which flow is done by which spec line is in the plan's Phase 8.
 * These five were the gaps: nothing on a phone turned a wheel before.
 *
 * Runs in `android` (everything under mobile/ does). Each test starts from an
 * emptied account (helpers/timetrack.ts).
 */

import { type Locator, type Page } from '@playwright/test'
import { test, expect } from '../fixtures/test'
import { entryInList, openFreshTracker, reopenFromAccount, savedToAccount, startNamed, tapStop, trackEntry } from '../helpers/timetrack'

/** Every tap a person makes in a flow, counted, so the ceiling can be checked */
class Taps {
  count = 0
  async on(locator: Locator): Promise<void> {
    this.count++
    await locator.tap()
  }
}

async function heightOf(locator: Locator): Promise<number> {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, 'not on screen').not.toBeNull()
  return Math.round(box!.height)
}

/** One wheel of a drum set, by what a screen reader calls it: "Start hour", "Hour", "Day" */
const wheel = (scope: Locator, name: string) => scope.getByRole('listbox', { name, exact: true })

/** Turn a wheel to the item with this text, as a thumb does: tap it */
async function turnTo(taps: Taps, scope: Locator, name: string, text: string): Promise<void> {
  const option = wheel(scope, name).getByRole('option', { name: text, exact: true })
  await taps.on(option)
  await expect(option, `${name} did not land on ${text}`).toHaveAttribute('aria-selected', 'true')
}

/** A moment on a day counted back from today, in the phone's own time zone */
const localIso = (page: Page, daysAgo: number, hour: number, minute: number) =>
  page.evaluate(
    ([d, h, m]) => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, h, m, 0, 0).toISOString()
    },
    [daysAgo, hour, minute],
  )

/** When an ISO moment is, on the phone's calendar: how many days ago, and the clock time */
const localOf = (page: Page, iso: string) =>
  page.evaluate((value) => {
    const at = new Date(value)
    const today = new Date()
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const pad = (n: number) => String(n).padStart(2, '0')
    return { daysAgo: Math.round((midnight(today) - midnight(at)) / 86_400_000), clock: `${pad(at.getHours())}:${pad(at.getMinutes())}` }
  }, iso)

interface AccountEntry {
  description: string
  started_at: string
  stopped_at: string | null
  duration_seconds: number | null
  deleted_at: string | null
  [column: string]: unknown
}

async function pullEntries(page: Page): Promise<AccountEntry[]> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { rows: { timetrack_entries: AccountEntry[] } }
  return body.rows.timetrack_entries
}

/** The live entries the ACCOUNT holds, by description */
const liveOnAccount = async (page: Page) => (await pullEntries(page)).filter((e) => e.deleted_at === null)

/**
 * SET-UP, NOT THE FLOW UNDER TEST: put the entry called `description` at the
 * given moments on the account (null stop = still running), then open the
 * tracker again from the account. The flow itself starts from what a person
 * would find there, an entry from yesterday.
 */
async function placeOnAccount(page: Page, description: string, startedAt: string, stoppedAt: string | null): Promise<void> {
  const row = (await liveOnAccount(page)).find((e) => e.description === description)
  expect(row, `no "${description}" on the account to move`).toBeDefined()
  const moved = {
    ...row!,
    started_at: startedAt,
    stopped_at: stoppedAt,
    duration_seconds: stoppedAt ? Math.round((Date.parse(stoppedAt) - Date.parse(startedAt)) / 1000) : row!.duration_seconds,
    updated_at: new Date().toISOString(),
  }
  const pushed = await page.request.post('/api/timetrack/sync', { data: { rows: { timetrack_entries: [moved] } } })
  expect(pushed.ok(), `could not place the entry: ${pushed.status()}`).toBe(true)
  await reopenFromAccount(page)
}

/** Open the sheet of the row called `description` */
async function openRow(taps: Taps, page: Page, description: string): Promise<Locator> {
  await taps.on(entryInList(page, description).first().locator('div[role="button"]').first())
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await expect(sheet).toBeVisible()
  return sheet
}

const startBox = (sheet: Locator) => sheet.getByRole('button', { name: /^Start: / })
const endBox = (sheet: Locator) => sheet.getByRole('button', { name: /^End: / })
const lengthOf = (sheet: Locator) => sheet.getByRole('button', { name: 'Type a duration' })

test.describe('everyday time log flows on a phone, by the wheels', () => {
  test('a finished entry\'s start and end are changed with the same wheels, in at most 7 taps', async ({ page }) => {
    const TAP_CEILING = 7
    const taps = new Taps()
    await openFreshTracker(page)
    await trackEntry(page, 'Email')
    // set-up: it was done yesterday 09:00–09:45 (0:45 long)
    await placeOnAccount(page, 'Email', await localIso(page, 1, 9, 0), await localIso(page, 1, 9, 45))

    const sheet = await openRow(taps, page, 'Email')
    await expect(startBox(sheet)).toHaveAccessibleName('Start: 09:00 Yesterday')
    await expect(endBox(sheet)).toHaveAccessibleName('End: 09:45 Yesterday')
    await expect(lengthOf(sheet)).toContainText('0:45')

    // the sheet of an entry opens on its End wheels; Start has the very same ones
    await turnTo(taps, sheet, 'End hour', '10')
    await turnTo(taps, sheet, 'End minute', '30')
    await expect(endBox(sheet)).toHaveAccessibleName('End: 10:30 Yesterday')

    await taps.on(startBox(sheet))
    await expect(wheel(sheet, 'Start hour')).toBeVisible()
    await expect(wheel(sheet, 'Start minute')).toBeVisible()
    await turnTo(taps, sheet, 'Start hour', '08')
    await turnTo(taps, sheet, 'Start minute', '30')
    await expect(startBox(sheet)).toHaveAccessibleName('Start: 08:30 Yesterday')
    // the length follows both: 08:30 to 10:30, in hours and minutes
    await expect(lengthOf(sheet)).toContainText(/^2:00/)

    // what a thumb needs
    for (const [name, box] of [['Start box', startBox(sheet)], ['End box', endBox(sheet)]] as const) {
      expect(await heightOf(box), `${name} is too short for a thumb in a sheet`).toBeGreaterThanOrEqual(48)
    }
    for (const wheelName of ['Start hour', 'Start minute']) {
      const item = wheel(sheet, wheelName).getByRole('option', { name: wheelName.endsWith('hour') ? '08' : '30', exact: true })
      expect(await heightOf(item), `${wheelName} items are too short to tap`).toBeGreaterThanOrEqual(44)
    }
    const done = sheet.getByRole('button', { name: 'Done' })
    expect(await heightOf(done), 'Done is too short to tap').toBeGreaterThanOrEqual(44)

    await taps.on(done)
    await expect(sheet).toBeHidden()
    expect(taps.count, `a person needed ${taps.count} taps, the ceiling is ${TAP_CEILING}`).toBeLessThanOrEqual(TAP_CEILING)

    await savedToAccount(page)
    const saved = (await liveOnAccount(page)).filter((e) => e.description === 'Email')
    expect(saved).toHaveLength(1)
    expect(await localOf(page, saved[0].started_at)).toEqual({ daysAgo: 1, clock: '08:30' })
    expect(await localOf(page, saved[0].stopped_at!)).toEqual({ daysAgo: 1, clock: '10:30' })
    expect(saved[0].duration_seconds).toBe(2 * 3600)
  })

  test('the start of a running timer is moved back with the wheels, in at most 5 taps, and it keeps running', async ({ page }) => {
    const TAP_CEILING = 5
    const taps = new Taps()
    await openFreshTracker(page)
    await startNamed(page, 'Deep work')

    await taps.on(page.getByTestId('run-bar').getByRole('button', { name: 'Edit the running time entry' }))
    const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
    await expect(sheet).toBeVisible()
    // a running entry has a Start to turn and an End that says so: not a box to tap
    await expect(sheet.getByTestId('end-chip')).toHaveAccessibleName('End: now, still running')
    await expect(wheel(sheet, 'Start hour')).toBeVisible()

    await turnTo(taps, sheet, 'Start day', 'Yesterday')
    await turnTo(taps, sheet, 'Start hour', '08')
    await turnTo(taps, sheet, 'Start minute', '20')
    await expect(startBox(sheet)).toHaveAccessibleName('Start: 08:20 Yesterday')
    expect(await heightOf(startBox(sheet)), 'Start box is too short for a thumb in a sheet').toBeGreaterThanOrEqual(48)
    // more than 12 hours is said in the sheet, in plain words, before Done
    await expect(sheet.getByText(/^That makes it \d+ hours?/)).toBeVisible()

    await taps.on(sheet.getByRole('button', { name: 'Done' }))
    await expect(sheet).toBeHidden()
    expect(taps.count, `a person needed ${taps.count} taps, the ceiling is ${TAP_CEILING}`).toBeLessThanOrEqual(TAP_CEILING)

    // still running, now since yesterday 08:20
    const bar = page.getByTestId('run-bar')
    await expect(bar).toContainText('since 08:20')
    await expect(bar.getByRole('button', { name: 'Stop timer' })).toBeVisible()
    await savedToAccount(page)
    const live = await liveOnAccount(page)
    expect(live.map((e) => e.description)).toEqual(['Deep work'])
    expect(live[0].stopped_at, 'the timer stopped when its start was moved').toBeNull()
    expect(await localOf(page, live[0].started_at)).toEqual({ daysAgo: 1, clock: '08:20' })

    await tapStop(page)
  })

  test('a deleted entry is brought back by Undo, in 3 taps, and is back on the account', async ({ page }) => {
    const TAP_CEILING = 3
    const taps = new Taps()
    await openFreshTracker(page)
    await trackEntry(page, 'Walk')
    await savedToAccount(page)
    expect((await liveOnAccount(page)).map((e) => e.description)).toEqual(['Walk'])

    const sheet = await openRow(taps, page, 'Walk')
    const remove = sheet.getByRole('button', { name: 'Delete time entry' })
    expect(await heightOf(remove), 'Delete is too short to tap').toBeGreaterThanOrEqual(44)
    await taps.on(remove)
    await expect(sheet).toBeHidden()
    await expect(page.getByText('Time entry was deleted')).toBeVisible()
    await expect(entryInList(page, 'Walk')).toHaveCount(0)

    const undo = page.getByRole('button', { name: /Undo/ })
    expect(await heightOf(undo), 'Undo is too short to tap').toBeGreaterThanOrEqual(44)
    await taps.on(undo)
    await expect(entryInList(page, 'Walk').first()).toBeVisible()
    expect(taps.count, `a person needed ${taps.count} taps, the ceiling is ${TAP_CEILING}`).toBeLessThanOrEqual(TAP_CEILING)

    // not only on this screen: the account has it, and a reopen from the account shows it
    await savedToAccount(page)
    await expect.poll(async () => (await liveOnAccount(page)).map((e) => e.description)).toEqual(['Walk'])
    await reopenFromAccount(page)
    await expect(entryInList(page, 'Walk').first()).toBeVisible()
  })

  test('a missed entry for yesterday is added with the wheels, in at most 10 taps, and lasts what it should', async ({ page }) => {
    const TAP_CEILING = 10
    const taps = new Taps()
    await openFreshTracker(page)

    await taps.on(page.getByRole('button', { name: 'Add a past time entry' }))
    const sheet = page.getByRole('dialog', { name: 'New time entry', exact: true })
    await expect(sheet).toBeVisible()
    // the name is words, and typing it is how a name is given
    await sheet.getByPlaceholder(/worked on/).fill('Reading')

    // Start and End are the same two boxes, the same wheels
    await taps.on(startBox(sheet))
    await turnTo(taps, sheet, 'Start day', 'Yesterday')
    await turnTo(taps, sheet, 'Start hour', '14')
    await turnTo(taps, sheet, 'Start minute', '00')
    await expect(startBox(sheet)).toHaveAccessibleName('Start: 14:00 Yesterday')

    await taps.on(endBox(sheet))
    await turnTo(taps, sheet, 'End day', 'Yesterday')
    await turnTo(taps, sheet, 'End hour', '15')
    await turnTo(taps, sheet, 'End minute', '30')
    await expect(endBox(sheet)).toHaveAccessibleName('End: 15:30 Yesterday')
    // the length reads as hours and minutes
    await expect(lengthOf(sheet)).toContainText(/^1:30/)
    for (const box of [startBox(sheet), endBox(sheet)]) {
      expect(await heightOf(box), 'a time box is too short for a thumb in a sheet').toBeGreaterThanOrEqual(48)
    }

    const create = sheet.getByRole('button', { name: 'Create' })
    expect(await heightOf(create), 'Create is too short to tap').toBeGreaterThanOrEqual(44)
    await taps.on(create)
    await expect(sheet).toBeHidden()
    expect(taps.count, `a person needed ${taps.count} taps, the ceiling is ${TAP_CEILING}`).toBeLessThanOrEqual(TAP_CEILING)

    // it is in the list under Yesterday with its length, and nothing is running
    const row = entryInList(page, 'Reading').first()
    await expect(row).toBeVisible()
    await expect(row).toContainText('1:30')
    await expect(page.getByTestId('run-bar').getByRole('button', { name: 'Start timer' })).toBeVisible()

    await savedToAccount(page)
    const live = await liveOnAccount(page)
    expect(live.map((e) => e.description)).toEqual(['Reading'])
    expect(await localOf(page, live[0].started_at)).toEqual({ daysAgo: 1, clock: '14:00' })
    expect(await localOf(page, live[0].stopped_at!)).toEqual({ daysAgo: 1, clock: '15:30' })
    expect(live[0].duration_seconds).toBe(90 * 60)
  })

  test('"Switched at…" ends the running entry and starts the next at the moment chosen on the wheels, in at most 6 taps', async ({ page }) => {
    const TAP_CEILING = 6
    const taps = new Taps()
    await openFreshTracker(page)
    await startNamed(page, 'Deep work')
    await savedToAccount(page)
    // set-up: it has been running since yesterday 08:00
    await placeOnAccount(page, 'Deep work', await localIso(page, 1, 8, 0), null)

    await taps.on(page.getByTestId('run-bar').getByRole('button', { name: 'Edit the running time entry' }))
    const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
    await expect(sheet).toBeVisible()
    const switched = sheet.getByRole('button', { name: 'Switched at…' })
    expect(await heightOf(switched), 'Switched at… is too short to tap').toBeGreaterThanOrEqual(44)
    await taps.on(switched)

    const picker = page.getByRole('dialog', { name: 'Switched at…', exact: true })
    await expect(picker).toBeVisible()
    await picker.getByLabel('Switched to').fill('Email')
    await turnTo(taps, picker, 'Day', 'Yesterday')
    await turnTo(taps, picker, 'Hour', '10')
    await turnTo(taps, picker, 'Minute', '30')
    // it says what will happen before it happens, the length in hours and minutes
    await expect(picker.getByText(/“Deep work” 08:00 – 10:30/)).toContainText('2:30')
    await expect(picker.getByText(/“Email” from 10:30/)).toBeVisible()

    const confirm = picker.getByRole('button', { name: 'Switch at 10:30' })
    expect(await heightOf(confirm), 'Switch at… is too short to tap').toBeGreaterThanOrEqual(44)
    await taps.on(confirm)
    await expect(picker).toBeHidden()
    expect(taps.count, `a person needed ${taps.count} taps, the ceiling is ${TAP_CEILING}`).toBeLessThanOrEqual(TAP_CEILING)

    await expect(page.getByTestId('run-bar')).toContainText('Email')
    await savedToAccount(page)
    const live = await liveOnAccount(page)
    const deep = live.find((e) => e.description === 'Deep work')!
    const email = live.find((e) => e.description === 'Email')!
    expect(await localOf(page, deep.started_at)).toEqual({ daysAgo: 1, clock: '08:00' })
    expect(await localOf(page, deep.stopped_at!)).toEqual({ daysAgo: 1, clock: '10:30' })
    expect(deep.duration_seconds).toBe(150 * 60)
    expect(await localOf(page, email.started_at)).toEqual({ daysAgo: 1, clock: '10:30' })
    expect(email.stopped_at, 'the next entry should be running').toBeNull()

    await tapStop(page)
  })
})
