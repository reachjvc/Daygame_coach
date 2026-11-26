/**
 * THE TIME LOG'S APPROVED SCREEN PHOTOS, AT PHONE SIZE AND PC SIZE.
 *
 * The owner approved how these six screens look: the list with a few entries,
 * a running timer, one entry opened for editing (a sheet on a phone, the row's
 * "Edit details" box on a PC), the calendar, the reports and the settings. Each is
 * photographed and compared with the approved photo
 * (`__screens__/<project>/<name>.png`, next to this file) by
 * `toHaveScreenshot`. A change that moves, hides or recolours something on
 * one of them fails here, even when every story in the folder above still
 * passes.
 *
 * SAME PICTURE EVERY RUN:
 * - the clock is fixed (../clock.ts) at 10:00 on Wed 18 Nov 2026 in
 *   Copenhagen, and the account holds the same entries every time (SEED);
 * - the picture is taken only after the page says "Saved" and its fonts have
 *   loaded, with animations off and the caret hidden;
 * - what changes by the second is masked: the running timer's digits, the sync
 *   badge's time, any "x min ago", the clock's own readings in the calendar;
 * - Next's development badge is hidden, so a photo made against `next dev`
 *   shows what a production build shows.
 *
 * ONLY INSIDE THE PINNED DOCKER IMAGE: `scripts/timelog-photos.sh`. Another
 * machine draws fonts and edges differently, so its pixels would be wrong, and
 * a skip would let CI pass by doing nothing: so this file THROWS without the
 * variable the script sets.
 *
 * A photo changes on purpose only with the owner's yes: show him the old and
 * the new on a page first (docs/tech.md section 6).
 */

import { randomUUID } from 'node:crypto'
import { type Locator, type Page } from '@playwright/test'
import { test, expect } from '../../fixtures/test'
import { entryInList, onPhone, reopenFromAccount, savedToAccount, timerButton } from '../../helpers/timetrack'
import { fixClock, type FixedClock } from '../clock'
import { MORNING, Taps, goToSection, later, openClean, startTimer } from '../helpers'

if (!process.env.PW_IN_PHOTO_IMAGE) {
  throw new Error(
    'The screen photos are made and compared only in the pinned Docker image. ' +
      'Run: bash scripts/timelog-photos.sh   (it sets PW_IN_PHOTO_IMAGE=1; see docs/tech.md section 6).',
  )
}

const MINUTE = 60_000

/** Three projects and eight finished entries over three days (Mon 16 to Wed 18 Nov 2026, Copenhagen = UTC+1) */
const PROJECTS = [
  { name: 'Client website', color: '#0b83d9' },
  { name: 'Writing', color: '#2da608' },
  { name: 'Admin', color: '#e36a00' },
]
/** [description, project, day, from, to], the times in Copenhagen time */
const ENTRIES: [string, string, string, string, string][] = [
  ['Draft chapter', 'Writing', '2026-11-18', '08:15', '09:05'],
  ['Inbox and invoices', 'Admin', '2026-11-18', '09:10', '09:40'],
  ['Client site build', 'Client website', '2026-11-17', '09:00', '11:30'],
  ['Weekly planning', 'Admin', '2026-11-17', '12:30', '14:00'],
  ['Draft chapter', 'Writing', '2026-11-17', '14:15', '16:00'],
  ['Client site build', 'Client website', '2026-11-16', '09:30', '12:00'],
  ['Research notes', 'Writing', '2026-11-16', '13:00', '14:15'],
]

/** Puts the seed on the account, then opens the tracker again so everything shown comes from it */
async function seedAccount(page: Page): Promise<void> {
  const pulled = await page.request.get('/api/timetrack/sync')
  expect(pulled.status(), 'could not read the account').toBe(200)
  const body = (await pulled.json()) as { userId: string; rows: { timetrack_workspaces: { id: string; deleted_at: string | null }[] } }
  const workspace = body.rows.timetrack_workspaces.find((w) => w.deleted_at === null)
  expect(workspace, 'the account has no workspace to put the seed in').toBeDefined()
  // A row's id belongs to one account for good (a deleted row keeps it), so each seeding takes new ones; no id is ever drawn.
  const base = (id: string) => ({ id, user_id: body.userId, updated_at: new Date().toISOString(), deleted_at: null, workspace_id: workspace!.id })
  // Ids are new each time, but handed out in order: the app lists rows (and stacks the report's bars) by id when
  // nothing else tells them apart, so ids in a different order drew the same data in a different picture.
  const ids = (count: number) => Array.from({ length: count }, () => randomUUID()).sort()
  const projectIds = new Map(ids(PROJECTS.length).map((id, i) => [PROJECTS[i].name, id]))
  const entryIds = ids(ENTRIES.length)
  const rows = {
    timetrack_projects: PROJECTS.map((p, i) => ({
      ...base(projectIds.get(p.name)!),
      client_id: null,
      name: p.name,
      color: p.color,
      active: true,
      is_private: true,
      billable: false,
      currency: 'EUR',
      rate: null,
      estimate_type: 'hours',
      estimated_seconds: null,
      estimated_amount: null,
      auto_estimates: false,
      fixed_fee: null,
      is_template: false,
      recurring: false,
      recurring_period: null,
      recurring_start: null,
      start_date: null,
      end_date: null,
      status: 'active',
      member_ids: [],
      created_at: `2026-11-01T08:00:0${i}.000Z`,
    })),
    timetrack_entries: ENTRIES.map(([description, project, day, from, to], i) => {
      const at = (hhmm: string) => `${day}T${hhmm}:00+01:00`
      return {
        ...base(entryIds[i]),
        project_id: projectIds.get(project)!,
        task_id: null,
        description,
        billable: false,
        started_at: new Date(at(from)).toISOString(),
        stopped_at: new Date(at(to)).toISOString(),
        duration_seconds: (Date.parse(at(to)) - Date.parse(at(from))) / 1000,
        duration_only: false,
        created_with: 'photos',
        source_event_id: null,
        running_device_id: null,
        shared_with: [],
      }
    }),
  }
  const pushed = await page.request.post('/api/timetrack/sync', { data: { rows } })
  expect(pushed.ok(), `could not seed the account: ${pushed.status()} ${await pushed.text()}`).toBe(true)
  await reopenFromAccount(page)
  await expect(entryInList(page, 'Inbox and invoices').first()).toBeVisible()
}

/**
 * What changes by the second or the minute, as boxes to blank out of the photo.
 *
 * The sync badge always (it says when the account was last checked). While a
 * timer runs, every clock reading too: its own digits, and Today's and This
 * week's totals, which grow with it. The finished entries' lengths are not
 * masked in the other photos, so they are still checked there.
 */
function changing(page: Page, timerRuns: boolean): Locator[] {
  const always = [
    page.locator('header').getByRole('button', { name: /^Saved\./ }),
    page.locator('header').getByText(/^Saved\./),
    page.getByText(/\b(ago|just now)\b/i),
  ]
  if (!timerRuns) return always
  return [
    ...always,
    page.getByText(/^\d+:\d\d:\d\d$/),
    // a PC shows the running length in boxes (the bar's and the row's)
    page.getByRole('textbox', { name: 'Duration', exact: true }),
  ]
}

/** Ready to be photographed: saved, fonts loaded, Next's development badge and any toast hidden */
async function steady(page: Page): Promise<void> {
  await savedToAccount(page)
  await page.addStyleTag({ content: 'nextjs-portal, [data-nextjs-toast], [data-sonner-toaster] { display: none !important }' })
  await page.evaluate(() => document.fonts.ready)
}

async function photograph(page: Page, name: string, opts: { timerRuns?: boolean } = {}): Promise<void> {
  await steady(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    mask: changing(page, opts.timerRuns ?? false),
    maxDiffPixelRatio: 0.01,
  })
}

let clock: FixedClock
test.beforeEach(async ({ page, context }) => {
  clock = await fixClock(context, MORNING)
  await openClean(page)
  await seedAccount(page)
  await clock.settle()
})

test.describe('the Time Log, photographed', () => {
  test('the list with a few entries', async ({ page }) => {
    await photograph(page, 'list')
  })

  test('a running timer', async ({ page }) => {
    const taps = new Taps(page)
    await startTimer(taps, page, 'Review pull requests', 'Client website')
    await later(page, clock, 12 * MINUTE)
    await expect(timerButton(page, 'Stop timer')).toBeVisible()
    await photograph(page, 'running', { timerRuns: true })
  })

  test('one entry opened for editing', async ({ page }) => {
    if (onPhone(page)) {
      await entryInList(page, 'Inbox and invoices').first().getByRole('button', { name: /^Inbox and invoices/ }).click()
      await expect(page.getByRole('dialog', { name: 'Time entry', exact: true })).toBeVisible()
    } else {
      await entryInList(page, 'Inbox and invoices').first().getByRole('button', { name: 'More actions for this time entry' }).click()
      await page.locator('[data-dropdown-panel]').getByRole('button', { name: /Edit details/ }).click()
      const box = page.getByRole('dialog', { name: 'Time entry details' })
      await expect(box).toBeVisible()
      // the start and end wheels have turned to 09:10 and 09:40 (they settle after the box opens)
      await expect(box.locator('[role="option"][aria-selected="true"]')).toHaveText(['Today', '09', '10', 'Today', '09', '40'])
    }
    await photograph(page, 'edit-entry')
  })

  test('the calendar', async ({ page }) => {
    if (onPhone(page)) {
      await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Calendar', exact: true }).dispatchEvent('click')
    } else {
      await page.getByRole('group', { name: 'Timer view' }).getByRole('button', { name: 'Calendar', exact: true }).click()
    }
    await expect(page.locator('main [data-day-header]').first()).toBeVisible()
    await photograph(page, 'calendar')
  })

  test('the reports', async ({ page }) => {
    await goToSection(page, 'Reports')
    await expect(page.getByRole('main')).toContainText('Client website')
    await photograph(page, 'reports')
  })

  test('the settings', async ({ page }) => {
    if (onPhone(page)) {
      await page.getByRole('button', { name: 'Settings and more' }).click()
      await page.getByRole('dialog', { name: 'Settings and more' }).getByRole('button', { name: 'Settings', exact: true }).click()
    } else {
      await page.getByRole('navigation', { name: 'Tracker' }).getByRole('button', { name: /^Settings/ }).click()
    }
    await expect(page.getByRole('main').getByText('Profile').first()).toBeVisible()
    await photograph(page, 'settings')
  })
})
