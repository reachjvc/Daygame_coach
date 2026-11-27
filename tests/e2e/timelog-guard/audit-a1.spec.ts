/**
 * AUDIT A1: ONE PERSON, TWO DEVICES, CHANGES CLOSE TOGETHER.
 *
 * The stories (stories.spec.ts) and the reopen rig (reopen.spec.ts) cover a
 * timer started on one device and stopped, switched or edited on the other.
 * This file goes after what they miss: an Undo, or an open sheet, that is
 * made from a copy of an entry the other device has already changed.
 *
 * Every test here is a bug found by hand and marked `test.fail()` with the
 * reason, so the suite stays green until it is fixed. When the code is fixed
 * the test starts passing, Playwright reports "expected to fail, but passed",
 * and the `test.fail()` line is the one to delete.
 *
 * How "the other device has not heard yet" is made: that device's sync is cut
 * (`setOffline`) while the other one acts, then it comes back, as a phone in a
 * pocket or a tab that has not asked yet would be. Each test makes its own PC
 * and its own phone, so it runs once, in the desktop project.
 */
import { test, expect } from '../fixtures/test'
import type { Page } from '@playwright/test'
import { entryInList, savedToAccount, timerButton } from '../helpers/timetrack'
import { fixClock, type FixedClock } from './clock'
import { MORNING, Taps, accountEntries, type AccountEntry, later, openAgain, openClean, openOtherDevice, startTimer, stopTimer } from './helpers'

const MINUTE = 60_000

test.skip(({ isMobile }) => isMobile, 'makes its own phone and PC; runs once, in timelog-guard-desktop')
test.setTimeout(120_000)

/** The PC and a phone of the same account, both on the same fixed clock */
async function pcAndPhone(
  browser: Parameters<typeof openOtherDevice>[0],
  pc: Page,
  clock: FixedClock,
  storageState: string,
) {
  await openClean(pc)
  await clock.settle()
  const phone = await openOtherDevice(browser, pc, storageState, clock)
  // a stuck step fails with its own line, not with the whole test's timeout
  pc.setDefaultTimeout(20_000)
  phone.page.setDefaultTimeout(20_000)
  return phone
}

async function phoneOpensEntry(phone: Page, description: string) {
  await entryInList(phone, description).first().getByText(description).first().click()
  const sheet = phone.getByRole('dialog', { name: 'Time entry' })
  await expect(sheet).toBeVisible()
  return sheet
}

/** Delete the first row of the PC's list through its ⋮ menu */
async function pcDeletesFirstRow(pc: Page) {
  await pc.getByRole('button', { name: 'More actions for this time entry' }).first().click()
  await pc.locator('[data-dropdown-panel]').getByRole('button', { name: 'Delete' }).click()
}

/** Wait until the account holds the entry in the state the test is waiting for, and return it */
async function accountEntryWhere(pc: Page, description: string, what: string, ok: (e: AccountEntry) => boolean) {
  let found: AccountEntry | undefined
  await expect
    .poll(async () => {
      found = (await accountEntries(pc, { withDeleted: true })).find((e) => e.description === description && ok(e))
      return found !== undefined
    }, { message: `the account never held "${description}" ${what}`, timeout: 30_000 })
    .toBe(true)
  return found!
}

test.describe('Undo of a delete, made from a copy the other device has already changed', () => {
  test('the PC deletes a timer the phone has stopped, then undoes: the timer stays stopped', async ({ browser, page, context, account }) => {
    test.fail(true, 'BUG A1-1: Undo of a delete puts back the old whole row (restoreEntries), so the phone\'s Stop is undone and the timer runs again')
    const clock = await fixClock(context, MORNING)
    const phone = await pcAndPhone(browser, page, clock, account.storageState)
    try {
      await startTimer(new Taps(page), page, 'Run')
      await savedToAccount(page)
      await openAgain(phone.page)
      await later(page, clock, 20 * MINUTE)
      await later(phone.page, phone.clock, 20 * MINUTE)

      // the PC cannot hear the account while the phone stops the timer
      await clock.setOffline(true)
      await stopTimer(new Taps(phone.page), phone.page)
      await savedToAccount(phone.page)
      await pcDeletesFirstRow(page)
      await clock.setOffline(false)
      await accountEntryWhere(page, 'Run', 'deleted', (e) => e.deleted_at !== null)

      await page.getByRole('button', { name: /Undo/ }).click()
      const back = await accountEntryWhere(page, 'Run', 'back from the delete', (e) => e.deleted_at === null)
      expect(back.stopped_at, 'the timer the phone stopped is running again on the account').not.toBeNull()

      // and what the owner sees: the phone, a minute later, has no running timer
      await later(phone.page, phone.clock, 61_000)
      await expect(timerButton(phone.page, 'Stop timer'), 'a ghost timer runs on the phone').toHaveCount(0)
    } finally {
      await phone.context.close()
    }
  })

  test('the PC deletes an entry the phone has renamed, then undoes: the new name stays', async ({ browser, page, context, account }) => {
    test.fail(true, 'BUG A1-2: Undo of a delete puts back the old whole row (restoreEntries), so the phone\'s rename is silently lost')
    const clock = await fixClock(context, MORNING)
    const phone = await pcAndPhone(browser, page, clock, account.storageState)
    try {
      const taps = new Taps(page)
      await startTimer(taps, page, 'Alpha')
      await later(page, clock, 30 * MINUTE)
      await stopTimer(taps, page)
      await savedToAccount(page)
      await openAgain(phone.page)

      await clock.setOffline(true)
      const sheet = await phoneOpensEntry(phone.page, 'Alpha')
      await sheet.getByPlaceholder('I’ve worked on…').fill('Beta')
      await sheet.getByRole('button', { name: 'Done' }).click()
      await expect(sheet).toBeHidden()
      await savedToAccount(phone.page)
      await pcDeletesFirstRow(page)
      await clock.setOffline(false)
      await accountEntryWhere(page, 'Beta', 'deleted', (e) => e.deleted_at !== null)

      await page.getByRole('button', { name: /Undo/ }).click()
      await expect.poll(async () => (await accountEntries(page)).length, { message: 'the undone entry never came back on the account', timeout: 30_000 }).toBe(1)
      const [back] = await accountEntries(page)
      expect(back.description, 'the name the phone gave it is gone').toBe('Beta')
    } finally {
      await phone.context.close()
    }
  })
})

/** The tag names the account holds on each live entry */
async function tagsOnAccount(page: Page): Promise<Record<string, string[]>> {
  const response = await page.request.get('/api/timetrack/sync')
  expect(response.status(), 'could not read the account').toBe(200)
  const body = (await response.json()) as {
    rows: {
      timetrack_entries: { id: string; description: string; deleted_at: string | null }[]
      timetrack_tags: { id: string; name: string }[]
      timetrack_entry_tags: { entry_id: string; tag_id: string }[]
    }
  }
  const names = new Map(body.rows.timetrack_tags.map((t) => [t.id, t.name]))
  const out: Record<string, string[]> = {}
  for (const entry of body.rows.timetrack_entries.filter((e) => e.deleted_at === null)) {
    out[entry.description] = body.rows.timetrack_entry_tags
      .filter((l) => l.entry_id === entry.id)
      .map((l) => names.get(l.tag_id) ?? '?')
      .sort()
  }
  return out
}

test.describe('A sheet that stays open while the other device changes the entry', () => {
  test('the phone ticks a tag while the PC adds another to the same entry: both tags stay', async ({ browser, page, context, account }) => {
    test.fail(true, 'BUG A1-3: the phone sheet saves its whole tag list (EntrySheet changesBetween tagIds), so the tag the PC added meanwhile is removed')
    const clock = await fixClock(context, MORNING)
    const phone = await pcAndPhone(browser, page, clock, account.storageState)
    try {
      const taps = new Taps(page)
      await startTimer(taps, page, 'Alpha')
      await later(page, clock, 30 * MINUTE)
      await stopTimer(taps, page)
      await savedToAccount(page)

      // two tags exist, the entry has neither: made on the PC, which toggles each on and off again
      const row = page.locator('ul.divide-y li').first()
      const picker = () => page.locator('[data-dropdown-panel]')
      const tagButton = () => row.getByRole('button', { name: /^(Tags|red|blue|blue, red|red, blue)$/ }).first()
      for (const name of ['red', 'blue']) {
        await tagButton().click()
        await picker().getByPlaceholder('Add/filter tags').fill(name)
        await page.keyboard.press('ControlOrMeta+Enter')
        // made and put on the entry; now taken off again
        await expect(row.getByRole('button', { name, exact: true })).toBeVisible()
        await row.getByRole('button', { name, exact: true }).click()
        await picker().getByText(name, { exact: true }).click()
        await page.keyboard.press('Escape')
        await expect(tagButton()).toHaveText('Tags')
      }
      await expect.poll(async () => ((await (await page.request.get('/api/timetrack/sync')).json()) as { rows: { timetrack_tags: unknown[] } }).rows.timetrack_tags.length, { message: 'set-up: the two tags reached the account', timeout: 30_000 }).toBe(2)
      await expect.poll(() => tagsOnAccount(page), { message: 'set-up: the entry has no tag on the account', timeout: 30_000 }).toEqual({ Alpha: [] })

      // the phone opens the entry and ticks "blue" (not yet Done)
      await openAgain(phone.page)
      const sheet = await phoneOpensEntry(phone.page, 'Alpha')
      await sheet.getByRole('button', { name: 'Add tags' }).click()
      await sheet.getByRole('checkbox', { name: /blue/ }).click()

      // meanwhile the PC adds "red" to the same entry, and the phone's next check brings it
      await tagButton().click()
      await picker().getByText('red', { exact: true }).click()
      await page.keyboard.press('Escape')
      await expect.poll(async () => (await tagsOnAccount(page)).Alpha, { message: 'set-up: "red" is on the account', timeout: 30_000 }).toEqual(['red'])
      await later(phone.page, phone.clock, 61_000)
      await expect(entryInList(phone.page, 'Alpha').first(), 'set-up: the phone has heard of "red"').toContainText('red')

      await sheet.getByRole('button', { name: 'Done' }).click()
      await expect(sheet).toBeHidden()
      await expect
        .poll(async () => (await tagsOnAccount(page)).Alpha, { message: 'the phone\'s tag never reached the account', timeout: 30_000 })
        .toContain('blue')
      expect((await tagsOnAccount(page)).Alpha, 'the tag the PC added is gone').toEqual(['blue', 'red'])
    } finally {
      await phone.context.close()
    }
  })
})

test.describe('A tag taken off again before the first upload', () => {
  test('a tag ticked and unticked on the PC right after Stop is not on the account', async ({ browser, page, context, account }) => {
    test.fail(true, 'BUG A1-4: a tag unticked while the entry\'s first upload is still waiting is not uploaded as removed, so the account (and the phone) keep it')
    const clock = await fixClock(context, MORNING)
    const phone = await pcAndPhone(browser, page, clock, account.storageState)
    try {
      // a tag that already exists, on an entry that is already saved
      const taps = new Taps(page)
      await startTimer(taps, page, 'Alpha')
      await later(page, clock, 30 * MINUTE)
      await stopTimer(taps, page)
      await savedToAccount(page)
      const picker = () => page.locator('[data-dropdown-panel]')
      const tagButton = () => page.locator('ul.divide-y li').first().getByRole('button', { name: /^(Tags|blue)$/ }).first()
      await tagButton().click()
      await picker().getByPlaceholder('Add/filter tags').fill('blue')
      await page.keyboard.press('ControlOrMeta+Enter')
      await tagButton().click()
      await picker().getByText('blue', { exact: true }).click()
      await page.keyboard.press('Escape')
      await expect(tagButton()).toHaveText('Tags')
      await expect.poll(async () => (await tagsOnAccount(page)).Alpha, { message: 'set-up: the tag exists and Alpha has none', timeout: 30_000 }).toEqual([])

      // a second entry: Stop, and in the same breath tick the tag and take it off again
      await later(page, clock, 5 * MINUTE)
      await startTimer(taps, page, 'Beta')
      await later(page, clock, 10 * MINUTE)
      await stopTimer(taps, page)
      const tickOrUntick = async () => {
        await tagButton().click()
        await picker().getByText('blue', { exact: true }).click()
        await page.keyboard.press('Escape')
      }
      await tickOrUntick()
      await tickOrUntick()
      await expect(tagButton(), 'what the PC shows: no tag').toHaveText('Tags')

      // the account holds the stopped entry once its upload has gone; what it says about the tag is the finding
      await accountEntryWhere(page, 'Beta', 'stopped', (e) => e.stopped_at !== null)
      await savedToAccount(page)
      expect((await tagsOnAccount(page)).Beta, 'the account (and so the phone) still has the tag the PC took off').toEqual([])
    } finally {
      await phone.context.close()
    }
  })
})
