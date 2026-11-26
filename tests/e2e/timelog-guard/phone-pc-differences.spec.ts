/**
 * WHAT THE PHONE LEAVES OUT ON PURPOSE, AND THE PC KEEPS.
 *
 * The owner's decision of 2026-11-14 (Plans/time-log-phone.md D2, docs/tech.md
 * section 6): the phone hides Week view, the money and team reports, Billable,
 * the empty bell, the row's ⋮ menu, Team and the footer. The PC shows all of
 * them. One test per item, run at both sizes by `timelog-guard-phone` and
 * `timelog-guard-desktop`: gone on the phone, still there on the PC.
 *
 * Both halves matter. A test that only checked "hidden on the phone" would
 * pass when the thing was deleted from both, and a "still on the PC" half is
 * what keeps a phone fix from taking the PC's feature with it (his rule: the PC
 * never gets worse because of the phone).
 *
 * A fresh account, one finished entry where an item needs a row. No clock is
 * moved: nothing here is about time.
 */

import { type Page } from '@playwright/test'
import { test, expect } from '../fixtures/test'
import { entryInList, onPhone } from '../helpers/timetrack'
import { fixClock, type FixedClock } from './clock'
import { MORNING, Taps, goToSection, later, openClean, startTimer, stopTimer } from './helpers'

/** One finished entry, so there is a row (a PC) or a row to open (a phone) */
async function trackedEntry(page: Page, clock: FixedClock): Promise<void> {
  const taps = new Taps(page)
  await startTimer(taps, page, 'Admin work')
  // minutes on: the phone's bar ignores a tap in the first moments after it changed
  await later(page, clock, 5 * 60_000)
  await stopTimer(taps, page)
  await expect(entryInList(page, 'Admin work').first()).toBeVisible()
}

/** The phone opens an entry's sheet by a tap on its row */
async function openEntrySheet(page: Page) {
  await entryInList(page, 'Admin work').first().getByRole('button', { name: /^Admin work/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await expect(sheet).toBeVisible()
  return sheet
}

/** The reports: a PC opens them on the full report; a phone on the short one, and "Details" opens the report with tabs */
async function openReport(page: Page): Promise<void> {
  await goToSection(page, 'Reports')
  if (onPhone(page)) {
    await page.getByRole('region', { name: 'Tracked hours' }).getByRole('button', { name: 'Details' }).click()
    await expect(page.getByRole('main').getByRole('button', { name: 'Detailed', exact: true })).toBeVisible()
  } else {
    await expect(page.getByRole('main').getByRole('button', { name: 'Summary', exact: true })).toBeVisible()
  }
}

let clock: FixedClock
test.beforeEach(async ({ page, context }) => {
  clock = await fixClock(context, MORNING)
  await openClean(page)
})

test.describe('what the phone hides and the PC keeps', () => {
  test('Week view: a phone has the day only, a PC offers the week', async ({ page }) => {
    if (onPhone(page)) {
      await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Calendar', exact: true }).dispatchEvent('click')
      await expect(page.locator('main [data-day-header]').first(), 'the calendar did not open').toBeVisible()
      await expect(page.getByRole('button', { name: 'Calendar view' }), 'a phone has no Week / 5 days / Day choice').toHaveCount(0)
      await expect(page.locator('main [data-day-column]'), 'a phone draws one day').toHaveCount(1)
    } else {
      await page.getByRole('group', { name: 'Timer view' }).getByRole('button', { name: 'Calendar', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Calendar view' })).toContainText('Week view')
      await expect(page.locator('main [data-day-column]'), 'a PC draws the seven days of the week').toHaveCount(7)
    }
  })

  test('the money and team reports: a phone has Summary and Detailed, a PC has five tabs', async ({ page }) => {
    await trackedEntry(page, clock)
    await openReport(page)
    const main = page.getByRole('main')
    for (const name of ['Summary', 'Detailed']) await expect(main.getByRole('button', { name, exact: true })).toBeVisible()
    for (const name of ['Workload', 'Profitability', 'My reports']) {
      const tab = main.getByRole('button', { name, exact: true })
      if (onPhone(page)) await expect(tab, `${name} is a PC report`).toHaveCount(0)
      else await expect(tab, `${name} is gone from the PC`).toBeVisible()
    }
  })

  test('the money cards of the summary: a phone hides Billable hours and Amount until a rate exists, a PC shows them', async ({ page }) => {
    await trackedEntry(page, clock)
    await openReport(page)
    const main = page.getByRole('main')
    if (onPhone(page)) await main.getByRole('button', { name: 'Summary', exact: true }).click()
    await expect(main.getByText('Total hours'), 'the card that stays, so this is the right screen').toBeVisible()
    for (const card of ['Billable hours', 'Amount']) {
      const money = main.getByText(card, { exact: true })
      if (onPhone(page)) await expect(money, `${card} shows before any rate exists`).toHaveCount(0)
      else await expect(money).toBeVisible()
    }
  })

  test('Billable: a phone’s entry has no billable switch, a PC’s timer bar and rows have one', async ({ page }) => {
    await trackedEntry(page, clock)
    if (onPhone(page)) {
      const sheet = await openEntrySheet(page)
      await sheet.getByRole('button', { name: 'More options' }).click()
      await expect(page.getByRole('button', { name: 'Duplicate' }), 'the ⋮ menu is open, so its entries can be read').toBeVisible()
      await expect(page.getByRole('button', { name: /billable/i }), 'no Billable on the phone, in the sheet or its menu').toHaveCount(0)
    } else {
      await expect(page.getByRole('main').getByRole('button', { name: /billable/i }).first(), 'the PC’s switch is gone').toBeVisible()
      await expect(entryInList(page, 'Admin work').first().getByRole('button', { name: /billable/i }), 'and the row’s').toBeVisible()
    }
  })

  test('the bell: a phone shows none while no alert has fired, a PC always shows it', async ({ page }) => {
    const bell = page.locator('header').getByRole('button', { name: 'Project alerts' })
    if (onPhone(page)) await expect(bell).toHaveCount(0)
    else await expect(bell, 'the PC’s bell is gone').toBeVisible()
  })

  test('the row’s ⋮ menu: a phone’s rows have none (their actions are in the entry), a PC’s rows have it', async ({ page }) => {
    await trackedEntry(page, clock)
    const menu = entryInList(page, 'Admin work').first().getByRole('button', { name: 'More actions for this time entry' })
    if (onPhone(page)) {
      await expect(menu).toHaveCount(0)
      // what the ⋮ held is reachable, in the entry's own menu
      const sheet = await openEntrySheet(page)
      await sheet.getByRole('button', { name: 'More options' }).click()
      await expect(page.getByRole('button', { name: 'Duplicate' }), 'the actions did not move into the entry’s menu').toBeVisible()
    } else {
      await expect(menu, 'the PC’s ⋮ is gone').toBeVisible()
      await menu.click()
      await expect(page.locator('[data-dropdown-panel]').getByRole('button', { name: 'Delete' })).toBeVisible()
    }
  })

  test('Team: a phone’s menu has no Team (Clients and Tags stay), a PC’s sidebar has it', async ({ page }) => {
    if (onPhone(page)) {
      await page.getByRole('button', { name: 'Settings and more' }).click()
      const menu = page.getByRole('dialog', { name: 'Settings and more' })
      await expect(menu.getByRole('button', { name: 'Clients', exact: true }), 'the menu is open, so its entries can be read').toBeVisible()
      await expect(menu.getByRole('button', { name: 'Tags', exact: true })).toBeVisible()
      await expect(menu.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByRole('navigation', { name: 'Tracker' }).getByRole('button', { name: 'Team', exact: true })).toBeVisible()
    }
  })

  test('the footer “Created with … last updated”: a phone’s entry has none, a PC’s details have it', async ({ page }) => {
    await trackedEntry(page, clock)
    if (onPhone(page)) {
      const sheet = await openEntrySheet(page)
      await expect(sheet.getByPlaceholder(/worked on|working on/), 'the entry is open, so its page can be read').toHaveValue('Admin work')
      await expect(sheet.getByText(/Created with/)).toHaveCount(0)
      await expect(sheet.getByText(/last updated/)).toHaveCount(0)
    } else {
      await entryInList(page, 'Admin work').first().getByRole('button', { name: 'More actions for this time entry' }).click()
      await page.locator('[data-dropdown-panel]').getByRole('button', { name: 'Edit details…' }).click()
      await expect(page.getByText(/Created with .* last updated/)).toBeVisible()
    }
  })
})
