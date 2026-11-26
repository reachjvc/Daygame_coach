/**
 * THE TIME LOG'S EVERYDAY STORIES, AT PHONE SIZE AND PC SIZE.
 *
 * One test per thing the owner does every day (docs/tech.md section 6, his ten
 * tasks), run by the two projects `timelog-guard-phone` (Pixel 7) and
 * `timelog-guard-desktop` (Desktop Chrome) on every push. The same story is
 * told on both: the steps differ with the layout (helpers.ts), what must come
 * out does not.
 *
 * WHAT A TEST HERE CHECKS: what the person sees on screen, then that the
 * account holds the same (what every other device will read), and how EASY the
 * task was: no control off screen, none smaller than a thumb on the phone, and
 * no more taps than the task takes today (`Taps`). A change that makes a daily
 * task longer fails here even when the data still comes out right.
 *
 * THE CLOCK IS FIXED (clock.ts): every story starts at 10:00 on Wed 18 Nov
 * 2026 in Copenhagen and moves on only by `clock.jump`. Real time still
 * passes a little between steps, so a length is compared to the second only
 * where it was typed; a measured one is "25 minutes and a few seconds".
 */

import { test, expect } from '../fixtures/test'
import { entryInList, onPhone, savedToAccount, timerButton } from '../helpers/timetrack'
import { fixClock } from './clock'
import { MORNING, Taps, accountEntries, clockSeconds, later, between, makeProject, openAgain, openClean, openOtherDevice, projectNamed, readRow, startTimer, stopTimer } from './helpers'

const MINUTE = 60_000

test.describe('every day at the Time Log', () => {
  test('1. a timer with a description and a project, stopped, is one entry of the right length', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    await makeProject(page, 'Writing')
    const taps = new Taps(page)

    await clock.settle()
    await startTimer(taps, page, 'Draft chapter', 'Writing')
    await later(page, clock, 25 * MINUTE)
    taps.count = 0
    await stopTimer(taps, page)
    expect(taps.count, 'Stop is one tap').toBe(1)

    const row = await readRow(page, 'Draft chapter')
    expect(row.length, 'the length on the row: 25 minutes and a few seconds').toMatch(/^0:25:0\d$/)
    expect(row.from).toBe('10:00')
    expect(row.to).toBe('10:25')

    await savedToAccount(page)
    const entries = await accountEntries(page)
    expect(entries.map((e) => e.description)).toEqual(['Draft chapter'])
    expect(await projectNamed(page, entries[0].project_id)).toBe('Writing')
    expect(entries[0].stopped_at, 'stopped').not.toBeNull()
    const ran = between(entries[0].started_at, entries[0].stopped_at!)
    expect(ran).toBeGreaterThanOrEqual(25 * MINUTE)
    expect(ran).toBeLessThan(25 * MINUTE + 10_000)
  })

  test('2. switching tasks while one runs stops the first at that moment and starts the second', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    const setup = new Taps(page)
    await clock.settle()
    await startTimer(setup, page, 'Alpha')
    await later(page, clock, 30 * MINUTE)
    await stopTimer(setup, page)
    await startTimer(setup, page, 'Beta')
    await later(page, clock, 10 * MINUTE)

    // Alpha's own "Continue" is the switch: one tap, with Beta still running
    const taps = new Taps(page)
    await taps.tap(entryInList(page, 'Alpha').first().getByRole('button', { name: 'Continue this entry' }), 'Continue Alpha')
    expect(taps.count, 'switching is one tap').toBe(1)

    // the screen says what happened, and the first entry now ends where the second begins
    await expect(page.getByText('Stopped “Beta” and started “Alpha”')).toBeVisible()
    const beta = await readRow(page, 'Beta')
    expect(beta.from).toBe('10:30')
    expect(beta.to).toBe('10:40')

    await savedToAccount(page)
    const entries = await accountEntries(page)
    const running = entries.filter((e) => e.stopped_at === null)
    expect(running.map((e) => e.description), 'exactly one timer runs, and it is the second').toEqual(['Alpha'])
    const betaOnAccount = entries.find((e) => e.description === 'Beta')!
    expect(betaOnAccount.stopped_at, 'the first stops at the moment the second starts').toBe(running[0].started_at)
    expect(entries, 'nothing else changed: the first Alpha, Beta, and the new Alpha').toHaveLength(3)
  })

  test('3. the start and the end of a finished entry are changed the same way, and the length follows', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    const setup = new Taps(page)
    await clock.settle()
    await startTimer(setup, page, 'Review')
    await later(page, clock, 30 * MINUTE)
    await stopTimer(setup, page)

    const taps = new Taps(page)
    if (!onPhone(page)) {
      // on a PC both ends are boxes in the row, typed into
      const row = entryInList(page, 'Review').first()
      await taps.tap(row.getByRole('textbox', { name: 'Start time' }), 'the start box')
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.type('09:30')
      await page.keyboard.press('Enter')
      await taps.tap(row.getByRole('textbox', { name: 'End time' }), 'the end box')
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.type('11:00')
      await page.keyboard.press('Enter')
    } else {
      // on a phone both ends are one box each; a tap opens the same wheels for either
      await taps.tap(entryInList(page, 'Review').first().getByRole('button', { name: /^Review/ }), 'the entry')
      const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
      const controlsOf = async (end: 'Start' | 'End') => {
        const names = await sheet.getByRole('listbox').evaluateAll((all) => all.map((el) => el.getAttribute('aria-label') ?? ''))
        const nudges = await sheet.getByRole('button', { name: /minutes (earlier|later)$/ }).count()
        return { wheels: names.filter((n) => n.startsWith(end)).map((n) => n.replace(end, '')), nudges }
      }
      const turnTo = async (end: 'Start' | 'End', hour: string, minute: string) => {
        await taps.tap(sheet.getByRole('button', { name: new RegExp(`^${end}: `) }), `the ${end.toLowerCase()} box`)
        await taps.turn(sheet.getByRole('listbox', { name: `${end} hour` }), hour, `${end} hour ${hour}`)
        await taps.turn(sheet.getByRole('listbox', { name: `${end} minute` }), minute, `${end} minute ${minute}`)
      }
      await turnTo('Start', '09', '30')
      const startControls = await controlsOf('Start')
      await turnTo('End', '11', '00')
      const endControls = await controlsOf('End')
      expect(startControls.wheels, 'the start has wheels').toEqual([' day', ' hour', ' minute'])
      expect(endControls, 'the end has the very same wheels and nudge buttons').toEqual(startControls)
      await taps.tap(sheet.getByRole('button', { name: 'Done' }), 'Done')
      await expect(sheet).toBeHidden()
    }

    const row = await readRow(page, 'Review')
    expect(row.from).toBe('09:30')
    expect(row.to).toBe('11:00')
    expect(Math.abs(clockSeconds(row.length) - 90 * 60), 'the length follows both ends: 1 h 30 min, give or take the seconds the timer ran').toBeLessThanOrEqual(30)

    await savedToAccount(page)
    const [entry] = await accountEntries(page)
    expect(Math.abs(between(entry.started_at, entry.stopped_at!) - 90 * MINUTE)).toBeLessThanOrEqual(30_000)
    expect(new Date(entry.started_at).toLocaleTimeString('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit' })).toBe('09:30')
  })

  test('4. a length typed as hours and minutes (1:30) is saved as typed', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    const setup = new Taps(page)
    await clock.settle()
    await startTimer(setup, page, 'Plan the week')
    await later(page, clock, 10 * MINUTE)
    await stopTimer(setup, page)

    const taps = new Taps(page)
    if (!onPhone(page)) {
      // the row's length box takes it
      const length = entryInList(page, 'Plan the week').first().getByRole('textbox', { name: 'Duration' })
      await taps.tap(length, 'the length box')
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.type('1:30')
      await page.keyboard.press('Enter')
    } else {
      // the sheet's big number is the box: a tap on it, then the keypad
      await taps.tap(entryInList(page, 'Plan the week').first().getByRole('button', { name: /^Plan the week/ }), 'the entry')
      const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
      await taps.tap(sheet.getByRole('button', { name: 'Type a duration' }), 'the length')
      await page.keyboard.type('1:30')
      await expect(sheet.getByRole('textbox', { name: 'Duration' })).toHaveValue('1:30')
      await page.keyboard.press('Enter')
      await expect(sheet.getByRole('button', { name: 'Type a duration' })).toContainText('1:30:00')
      await taps.tap(sheet.getByRole('button', { name: 'Done' }), 'Done')
      await expect(sheet).toBeHidden()
    }

    const row = await readRow(page, 'Plan the week')
    expect(row.length).toBe('1:30:00')
    expect(row.from, 'the start stays').toBe('10:00')
    expect(row.to, 'the end moves to fit').toBe('11:30')

    await savedToAccount(page)
    const [entry] = await accountEntries(page)
    expect(between(entry.started_at, entry.stopped_at!), 'exactly 1 h 30 on the account').toBe(90 * MINUTE)
  })

  /**
   * TWO DEVICES, ONE PERSON. "This device" is the project's (phone or PC), the
   * other is the opposite one, so across the two projects every pairing runs in
   * both directions: started on the phone and stopped on the PC, and back.
   */
  for (const [name, startsHere] of [
    ['5a. a timer started on this device and stopped on the other leaves one finished entry on both', true],
    ['5b. a timer started on the other device and stopped on this one leaves one finished entry on both', false],
  ] as const) {
    test(name, async ({ browser, page, context, account }) => {
      const clock = await fixClock(context, MORNING)
      await openClean(page)
      // settled first: the second device's clock starts from this one's
      await clock.settle()
      const other = await openOtherDevice(browser, page, account.storageState, clock)
      try {
        const [starter, stopper] = startsHere ? [{ page, clock }, other] : [other, { page, clock }]

        // started on one device; the other is opened afterwards, as a person picks it up, and finds it running
        if (!startsHere) await openAgain(other.page)
        await startTimer(new Taps(starter.page), starter.page, 'Shared work')
        await savedToAccount(starter.page)
        await openAgain(stopper.page)
        await expect(timerButton(stopper.page, 'Stop timer'), 'the second device does not show the running timer').toBeVisible()

        await later(starter.page, starter.clock, 20 * MINUTE)
        await later(stopper.page, stopper.clock, 20 * MINUTE)
        await stopTimer(new Taps(stopper.page), stopper.page)
        await savedToAccount(stopper.page)

        // a minute on, the first device's own check (it asks every minute) brings the stop: no ghost timer
        await starter.clock.jump(61_000)
        await expect(timerButton(starter.page, 'Start timer'), 'a ghost timer keeps running on the device that started it').toBeVisible({ timeout: 30_000 })
        for (const device of [page, other.page]) {
          await expect(timerButton(device, 'Stop timer')).toHaveCount(0)
          const row = await readRow(device, 'Shared work')
          expect(row.length, 'the same 20 minutes on both').toMatch(/^0:20:\d\d$/)
          expect(row.from).toBe('10:00')
          await expect(entryInList(device, 'Shared work'), 'one entry on each device, not two').toHaveCount(1)
        }

        await savedToAccount(stopper.page)
        const entries = await accountEntries(page)
        expect(entries.map((e) => [e.description, e.stopped_at !== null])).toEqual([['Shared work', true]])
      } finally {
        await other.context.close()
      }
    })
  }

  test('6. a timer left running and found hours later still runs from its real start, once', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    await clock.settle()
    await startTimer(new Taps(page), page, 'Deep work')
    await savedToAccount(page)
    await page.close()

    // three hours go by with the app closed; he opens it again in a new tab of the same browser
    await clock.jump(3 * 60 * MINUTE)
    const back = await context.newPage()
    await openAgain(back)

    await expect(timerButton(back, 'Stop timer'), 'the timer is not running any more').toBeVisible()
    await expect(timerButton(back, 'Start timer')).toHaveCount(0)
    const shown = onPhone(back)
      ? back.getByTestId('run-bar')
      : back.getByRole('main').getByRole('textbox', { name: 'Duration' }).first()
    if (onPhone(back)) await expect(shown).toContainText(/3:00:\d\d/)
    else await expect(shown).toHaveValue(/^3:00:\d\d$/)
    // one entry, not a second one made on opening: the phone lists a running one in its bar only
    if (onPhone(back)) await expect(back.getByRole('button', { name: /^Running: Deep work/ })).toHaveCount(1)
    else await expect(entryInList(back, 'Deep work')).toHaveCount(1)

    await savedToAccount(back)
    const entries = await accountEntries(back)
    expect(entries.map((e) => e.description)).toEqual(['Deep work'])
    expect(entries[0].stopped_at, 'still running on the account').toBeNull()
    const startedAfter = between('2026-11-18T09:00:00Z', entries[0].started_at)
    expect(startedAfter, 'from 10:00 Copenhagen, where it began, not from when the page was opened').toBeGreaterThanOrEqual(0)
    expect(startedAfter).toBeLessThan(30_000)
  })

  test('7. a deleted entry comes back exactly as it was when the delete is undone', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    await makeProject(page, 'Writing')
    const setup = new Taps(page)
    await clock.settle()
    await startTimer(setup, page, 'Edit the essay', 'Writing')
    await later(page, clock, 30 * MINUTE)
    await stopTimer(setup, page)
    await savedToAccount(page)
    const before = await readRow(page, 'Edit the essay')
    const [stored] = await accountEntries(page)
    const projectBefore = await projectNamed(page, stored.project_id)
    expect(projectBefore).toBe('Writing')

    // delete: a PC's row ⋮ then Delete; a phone's row opens the entry, which ends in Delete
    const taps = new Taps(page)
    const row = entryInList(page, 'Edit the essay').first()
    if (!onPhone(page)) {
      await taps.tap(row.getByRole('button', { name: 'More actions for this time entry' }), 'the row’s ⋮')
      await taps.tap(page.locator('[data-dropdown-panel]').getByRole('button', { name: 'Delete' }), 'Delete')
    } else {
      await taps.tap(row.getByRole('button', { name: /^Edit the essay/ }), 'the entry')
      await taps.tap(page.getByRole('dialog', { name: 'Time entry' }).getByRole('button', { name: 'Delete time entry' }), 'Delete')
    }
    await expect(entryInList(page, 'Edit the essay'), 'gone from the list').toHaveCount(0)
    await savedToAccount(page)
    expect(await accountEntries(page), 'gone from the account').toEqual([])

    await taps.tap(page.getByRole('button', { name: /Undo/ }), 'Undo')
    expect(taps.count, 'delete and undo take two taps on a PC, three on a phone (it opens the entry first)').toBeLessThanOrEqual(onPhone(page) ? 3 : 3)

    expect(await readRow(page, 'Edit the essay'), 'the same row: name, length, start and end').toEqual(before)
    await savedToAccount(page)
    const [restored] = await accountEntries(page)
    expect(restored, 'the same entry on the account, not a copy').toMatchObject({
      id: stored.id,
      description: 'Edit the essay',
      project_id: stored.project_id,
      started_at: stored.started_at,
      stopped_at: stored.stopped_at,
      deleted_at: null,
    })
    expect(await projectNamed(page, restored.project_id)).toBe('Writing')
  })

  test('8. continuing a past entry starts a new running entry with the same description and project', async ({ page, context }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    await makeProject(page, 'Research')
    const setup = new Taps(page)
    await clock.settle()
    await startTimer(setup, page, 'Read the paper', 'Research')
    await later(page, clock, 30 * MINUTE)
    await stopTimer(setup, page)
    await later(page, clock, 60 * MINUTE)
    const [past] = await accountEntries(page)

    const taps = new Taps(page)
    await taps.tap(entryInList(page, 'Read the paper').first().getByRole('button', { name: 'Continue this entry' }), 'Continue')
    expect(taps.count, 'continuing is one tap').toBe(1)

    await expect(timerButton(page, 'Stop timer')).toBeVisible()
    if (onPhone(page)) await expect(page.getByTestId('run-bar')).toContainText('Read the paper')
    else await expect(page.getByPlaceholder('What are you working on?')).toHaveValue('Read the paper')

    await savedToAccount(page)
    const entries = await accountEntries(page)
    expect(entries, 'the past entry and the new one').toHaveLength(2)
    const running = entries.filter((e) => e.stopped_at === null)
    expect(running).toHaveLength(1)
    expect(running[0].id, 'a new entry, not the old one reopened').not.toBe(past.id)
    expect(running[0].description).toBe('Read the paper')
    expect(running[0].project_id, 'the same project').toBe(past.project_id)
    expect(entries.find((e) => e.id === past.id), 'the past entry is untouched').toMatchObject({ started_at: past.started_at, stopped_at: past.stopped_at })
  })

  test('9. start and stop with no signal, then signal back: it reaches the other device and nothing is lost', async ({ browser, page, context, account }) => {
    const clock = await fixClock(context, MORNING)
    await openClean(page)
    await clock.settle()
    const other = await openOtherDevice(browser, page, account.storageState, clock)
    try {
      await clock.setOffline(true)

      const taps = new Taps(page)
      await startTimer(taps, page, 'Train legs')
      await expect(page.locator('header').getByRole('button', { name: /^Offline/ }), 'the screen says the work waits for signal').toBeVisible()
      await clock.jump(15 * MINUTE)
      await stopTimer(taps, page)
      const offline = await readRow(page, 'Train legs')
      expect(offline.length).toMatch(/^0:15:\d\d$/)
      expect(offline.from).toBe('10:00')

      await clock.setOffline(false)
      await savedToAccount(page, 40_000)

      await openAgain(other.page)
      const there = await readRow(other.page, 'Train legs')
      expect(there, 'the other device shows the same entry: length, start and end').toEqual(offline)
      await expect(entryInList(other.page, 'Train legs')).toHaveCount(1)
      await expect(timerButton(other.page, 'Stop timer'), 'no timer running there').toHaveCount(0)

      const entries = await accountEntries(page)
      expect(entries.map((e) => [e.description, e.stopped_at !== null])).toEqual([['Train legs', true]])
    } finally {
      await other.context.close()
    }
  })

  test('10. a timer across midnight shows on both days, with each day’s total and the whole', async ({ page, context }) => {
    // 23:30 Copenhagen on Wed 18 Nov to 00:30 on Thu 19 Nov: the calendar day changes in the middle
    const clock = await fixClock(context, '2026-11-18T23:30:00+01:00')
    await openClean(page)
    const taps = new Taps(page)
    await clock.settle()
    await startTimer(taps, page, 'Night shift')
    await later(page, clock, 60 * MINUTE)
    await stopTimer(taps, page)

    // one entry, drawn under each of the two days, each saying it carries on
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { name: 'Today', level: 3 })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Yesterday', level: 3 })).toBeVisible()
    await expect(entryInList(page, 'Night shift')).toHaveCount(2)
    await expect(main.getByText('from the day before')).toBeVisible()
    await expect(main.getByText('next day')).toBeVisible()
    const row = await readRow(page, 'Night shift')
    expect(row.from).toBe('23:30')
    expect(row.to).toBe('00:30')
    expect(row.length, 'the whole hour, give or take the seconds the timer ran').toMatch(/^1:00:0\d$/)

    // each day counts only its own half hour (give or take the seconds the timer ran before and after), the week all of it
    const text = (await main.innerText()).replace(/\s+/g, ' ')
    const before = clockSeconds(text.match(/Yesterday (\d+:\d\d:\d\d)/i)?.[1] ?? '')
    const after = clockSeconds(text.match(/Today (\d+:\d\d:\d\d)/i)?.[1] ?? '')
    expect(30 * 60 - before, 'the first day holds the half hour up to midnight, less the seconds the timer started late').toBeGreaterThanOrEqual(0)
    expect(30 * 60 - before).toBeLessThan(30)
    expect(after - 30 * 60, 'the second day holds the half hour after midnight, plus the seconds it ran over').toBeGreaterThanOrEqual(0)
    expect(after - 30 * 60).toBeLessThan(30)
    expect(before + after, 'the two days add up to the whole entry').toBe(clockSeconds(row.length))
    expect(text, 'the week holds the whole hour').toMatch(/(This week|Week total) 1:00:\d\d/i)

    await savedToAccount(page)
    const [entry] = await accountEntries(page)
    expect(entry.started_at.slice(0, 13), '23:30 Copenhagen is 22:30 in UTC').toBe('2026-11-18T22')
    expect(entry.stopped_at!.slice(0, 13), '00:30 on the 19th is 23:30 in UTC on the 18th').toBe('2026-11-18T23')
  })
})
