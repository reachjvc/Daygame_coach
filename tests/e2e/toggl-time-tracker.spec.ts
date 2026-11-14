/**
 * The time tracker's own behaviour — grouping, pickers, rounding, layout,
 * shortcuts — on the product route, /dashboard/time.
 *
 * These ran signed OUT against `/test/toggl`, a lab copy of the same components
 * that returns 404 in the production build CI runs. On the product route the
 * workspace is the account's — the worker's own — so each test starts from an
 * emptied account (see helpers/timetrack.ts) rather than from a cleared
 * browser. The account round trip itself — two devices, offline, deletions —
 * is timetrack-sync's.
 *
 * Tests tagged @engine are the ones where the browser engine is the risk
 * (layout, focus, storage events); the nightly WebKit and Firefox projects run
 * only those. The one tagged @timing measures wall-clock time on purpose.
 */

import { devices, type Page } from '@playwright/test'
import { test, expect } from './fixtures/test'
import {
  STORAGE_KEY,
  TRACKER,
  blur,
  entriesOnAccount,
  openFreshTracker,
  openTracker,
  readState,
  reopenFromAccount,
  savedToAccount,
  setIdleOnAccount,
  timerButton,
  trackEntry,
} from './helpers/timetrack'

/**
 * The tracker's own header. Since Time shows the app's header on the PC
 * (Plans/time-tracker-like-toggl.md D9) there are two banners on the page, and
 * the running entry is shown in this one.
 */
function trackerHeader(page: Page) {
  return page.getByRole('banner').filter({ has: page.getByRole('heading', { name: 'Time Log', exact: true }) })
}

/**
 * ICS fixture: one timed event today plus an all-day event (which must be skipped).
 * Timestamps are relative to today, or the event lands outside the visible range.
 */
function icsStamp(hour: number, minute = 0): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(hour)}${pad(minute)}00Z`
}

function tomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

const ICS_FIXTURE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:e2e-1@test',
  `DTSTART:${icsStamp(9)}`,
  `DTEND:${icsStamp(10)}`,
  'SUMMARY:Imported standup',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:e2e-2@test',
  `DTSTART;VALUE=DATE:${tomorrowDate()}`,
  `DTEND;VALUE=DATE:${tomorrowDate()}`,
  'SUMMARY:All day offsite',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

/** Create a project from the timer bar's picker */
async function createProject(page: import('@playwright/test').Page, name: string) {
  const timerBar = page.locator('main > div').first()
  await timerBar.locator('button').first().click()
  await page.getByPlaceholder('Search by project, task or client').fill(name)
  await page.getByRole('button', { name: `Create “${name}”` }).click()
  await expect(timerBar.getByRole('button', { name, exact: true })).toBeVisible()
}

const nav = (page: import('@playwright/test').Page, name: string | RegExp) =>
  page.getByRole('navigation').getByRole('button', { name })

/**
 * The calendar: on a PC the Timer page's Calendar view (its "Calendar | List
 * view" switch, Plans/toggl-parity.md Phase 5), on a phone the Calendar tab.
 */
async function openCalendar(page: import('@playwright/test').Page) {
  const sidebar = page.getByRole('navigation', { name: 'Tracker' })
  if (!(await sidebar.isVisible())) {
    await nav(page, 'Calendar').click()
    return
  }
  await sidebar.getByRole('button', { name: /^Timer/ }).click()
  await page.getByRole('group', { name: 'Timer view' }).getByRole('button', { name: 'Calendar', exact: true }).click()
}

/**
 * WHAT EACH TAB AND THE ACCOUNT HELD, for a failure that only happens in CI.
 *
 * "Two tabs stay in step" failed on Firefox and Safari in CI's production
 * build (runs 38437166271, 38439853507) and never locally: the second tab's
 * Start did not become Stop, or its entry never reached the list. The page
 * snapshot Playwright keeps is the FIRST tab's, which says nothing about that.
 * This puts both tabs' entries — running or not — and the account's beside the
 * error, so the next red run says whose copy won.
 */
async function whatEachTabHolds(first: Page, second: Page, secondSaid: string[]): Promise<string> {
  const entries = async (tab: Page) => {
    const state = (await readState(tab).catch(() => null)) as { entries?: { description: string; stop: string | null }[] } | null
    return (state?.entries ?? []).map((e) => `${e.description || '(none)'}${e.stop === null ? ' [running]' : ''}`)
  }
  // The sync line is a header button ("Saved. Saved to your account"); read them all rather than guess its other wordings.
  const status = (tab: Page) =>
    tab
      .evaluate(() => [...document.querySelectorAll('header button')].map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '').filter(Boolean).slice(0, 3).join(' | '))
      .catch(() => '?')
  // What the second tab's composer held: a Start that was pressed but disabled,
  // or a description that never reached the field, each read differently.
  const composer = await second
    .evaluate(() => {
      const field = document.querySelector<HTMLInputElement>('input[placeholder="What are you working on?"]')
      const start = [...document.querySelectorAll<HTMLButtonElement>('main button')].find((b) => /Start timer|Stop timer/.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))
      return `field="${field?.value ?? '(none)'}" button="${start?.getAttribute('aria-label') ?? start?.textContent ?? '(none)'}" disabled=${start?.disabled ?? '?'}`
    })
    .catch(() => '?')
  return [
    `first tab:  ${JSON.stringify(await entries(first))} · ${await status(first)}`,
    `second tab: ${JSON.stringify(await entries(second))} · ${await status(second)} · ${composer}`,
    `account:    ${JSON.stringify(await entriesOnAccount(first).catch((e) => [`unreadable: ${e}`]))}`,
    // An exception in the Start handler would leave every copy untouched, which
    // is what CI showed three times; only the tab's own errors can say so.
    `second tab said: ${secondSaid.length ? secondSaid.slice(-8).map((line) => line.slice(0, 240)).join(' ‖ ') : '(no errors or warnings)'}`,
  ].join('\n')
}

/** Runs `steps`; if they fail, the error carries `context()`, read at the moment of failure. */
async function explainedBy(context: () => Promise<string>, steps: () => Promise<void>): Promise<void> {
  try {
    await steps()
  } catch (error) {
    const said = await context().catch((e) => `(could not read: ${e})`)
    if (error instanceof Error) error.message += `\n\n${said}`
    throw error
  }
}

test.describe('Toggl-style time tracker', () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('sample data left in an existing browser is cleaned out on load', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'my own work')
    await savedToAccount(page)

    // plant a legacy sample row the way older builds stored it
    await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      state.entries.push({
        ...state.entries[0],
        id: 'e2e-legacy-sample',
        description: 'Client sync',
        createdWith: 'daygame-coach /test/toggl (demo data)',
      })
      window.localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Removed 1 sample entries/)).toBeVisible({ timeout: 20_000 })
    await savedToAccount(page)

    const state = await readState(page)
    expect(state.entries.map((e: { description: string }) => e.description)).toEqual(['my own work'])
    // and the sample never reached the account on its way out
    expect(await entriesOnAccount(page)).toEqual(['my own work'])
  })

  test('starts and stops the timer, and mirrors it in the tab title', async ({ page }) => {
    await openFreshTracker(page)

    await page.getByPlaceholder('What are you working on?').fill('E2E entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()

    await expect(trackerHeader(page)).toContainText('E2E entry')
    await expect(page).toHaveTitle(/\d+:\d\d:\d\d · E2E entry/)

    await blur(page)
    await page.keyboard.press('s')
    await expect(trackerHeader(page)).not.toContainText('E2E entry')
    await expect(page).toHaveTitle('Time Log')
  })

  test('keyboard shortcuts continue the last entry', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'shortcut source')

    const running = async () =>
      (await readState(page)).entries.filter((e: { duration: number }) => e.duration < 0).length

    await blur(page)
    await page.keyboard.press('c')
    await expect.poll(running).toBe(1)

    await blur(page)
    await page.keyboard.press('s')
    await expect.poll(running).toBe(0)

    await blur(page)
    await page.keyboard.press('Shift+?')
    await expect(page.getByText('Keyboard shortcuts')).toBeVisible()
  })

  test('imports an .ics calendar, skipping all-day events', async ({ page }) => {
    await openFreshTracker(page)
    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Integrations' }).click()
    await page.getByRole('button', { name: /Upload \.ics/ }).click()

    await page.setInputFiles('input[type="file"][accept*=".ics"]', {
      name: 'e2e.ics',
      mimeType: 'text/calendar',
      buffer: Buffer.from(ICS_FIXTURE),
    })

    await expect(page.getByText(/Imported 1 event \(skipped 1 all-day\)/)).toBeVisible({ timeout: 10_000 })

    await openCalendar(page)
    await expect(page.locator('main')).toContainText('Imported standup')
  })

  test('does not store the secret calendar address unless asked to', async ({ page }) => {
    await openFreshTracker(page)
    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Integrations' }).click()
    await page.getByRole('button', { name: 'Secret address' }).click()

    const field = page.getByLabel('Secret iCal address')
    await expect(field).toHaveAttribute('type', 'password')

    // Stub the server route so the test never reaches the network
    await page.route('**/api/timetrack/calendar', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ics: ICS_FIXTURE }) }),
    )
    await field.fill('https://calendar.google.com/calendar/ical/e2e-secret-token/basic.ics')
    await page.getByRole('button', { name: 'Import' }).click()
    await expect(page.locator('main')).toContainText('not saved', { timeout: 10_000 })
    await savedToAccount(page)

    // neither in this browser nor on the account
    const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
    expect(raw).not.toContain('e2e-secret-token')
    const account = await (await page.request.get('/api/timetrack/sync')).text()
    expect(account).not.toContain('e2e-secret-token')
  })

  test('enforces required fields, then saves once they are filled', async ({ page }) => {
    // The setting is the account's workspace config; the next test's
    // openFreshTracker tombstones the workspace, which puts it back
    await openFreshTracker(page)

    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Workspace', exact: true }).click()
    const required = page.getByRole('switch', { name: 'Project is required' })
    await required.click()
    await expect(required).toHaveAttribute('aria-checked', 'true')

    await nav(page, 'Timer').click()
    await page.getByPlaceholder('What are you working on?').fill('Blocked entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    // exactly one toast, not one per React render pass
    await expect(page.getByText(/Project is required/)).toHaveCount(1)
    await expect(trackerHeader(page)).not.toContainText('Blocked entry')

    await createProject(page, 'Client work')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await expect(trackerHeader(page)).toContainText('Blocked entry')
  })

  test('reports tabs render and rounding changes the total', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'reportable work')
    await nav(page, 'Reports').click()

    await expect(page.locator('main')).toContainText(/total hours/i)
    for (const tab of ['Detailed', 'Workload', 'Profitability', 'My reports']) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await expect(page.locator('main')).toBeVisible()
    }

    await page.getByRole('button', { name: 'Summary', exact: true }).click()
    const totalTile = page.locator('main').getByText(/total hours/i).locator('..')
    await expect(totalTile).toBeVisible()
    const before = await totalTile.innerText()
    await page.getByText(/^Rounding:/).click()
    await page.getByText('Round time entries').click()
    const selects = page.locator('[data-dropdown-panel] select')
    await selects.nth(0).selectOption('up')
    await selects.nth(1).selectOption('60')
    await expect.poll(() => totalTile.innerText()).not.toEqual(before)
  })

  test('creating a tag or project from an entry row saves both the entity and the link', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'book writing')

    const row = page.locator('ul.divide-y > li').first()

    await row.getByRole('button', { name: 'Tags' }).click()
    await expect(page.getByText('There are no tags yet')).toBeVisible()
    await page.getByPlaceholder('Add/filter tags').fill('focus')
    await page.getByRole('button', { name: /Create/ }).click()
    await expect(row).toContainText('focus')

    await row.getByRole('button', { name: 'Project' }).click()
    await page.getByPlaceholder('Search by project, task or client').fill('Book')
    await page.getByRole('button', { name: /Create/ }).click()
    await expect(row).toContainText('Book')

    const state = await readState(page)
    const entry = state.entries[0]

    // the entity itself must exist — an earlier build linked the entry to an id
    // that was never saved, because two state updates overwrote each other
    expect(state.tags.map((t: { name: string }) => t.name)).toEqual(['focus'])
    expect(state.projects.map((p: { name: string }) => p.name)).toEqual(['Book'])
    expect(entry.tagIds).toHaveLength(1)
    expect(state.tags.some((t: { id: string }) => t.id === entry.tagIds[0])).toBe(true)
    expect(state.projects.some((p: { id: string }) => p.id === entry.projectId)).toBe(true)
  })

  /**
   * The day card sets `overflow-hidden` for its rounded corners, so a picker
   * panel drawn inside it was sliced off at the card's bottom edge: on the last
   * row of a day you saw the search box and none of your tags. Panels now
   * render into <body>, so this checks the option is really painted where its
   * box says it is — a bounding box alone survives being clipped.
   */
  test('a tag picker on the last row of a day shows the tag list, not just the search box @engine', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'business')
    await trackEntry(page, 'book writing')

    const rows = page.locator('ul.divide-y > li')
    await expect(rows).toHaveCount(2)

    // two tags, so the list is taller than the card has room for.
    // Creating one closes the panel, and the trigger is then named after it.
    for (const [trigger, name] of [['Tags', 'focus'], ['focus', 'deep work']]) {
      await rows.first().getByRole('button', { name: trigger }).click()
      await page.getByPlaceholder('Add/filter tags').fill(name)
      await page.getByRole('button', { name: `Create “${name}”` }).click()
      await expect(page.locator('[data-dropdown-panel]')).toHaveCount(0)
    }

    // the bottom row: its panel falls entirely outside the day card
    await rows.last().getByRole('button', { name: 'Tags' }).click()
    const option = page.locator('[data-dropdown-panel]').getByText('deep work')
    await expect(option).toBeVisible()

    const painted = await option.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      return !!hit && (element.contains(hit) || hit.contains(element))
    })
    expect(painted).toBe(true)

    await option.click()
    await expect
      .poll(async () => {
        const state = await readState(page)
        return state.entries.find((e: { description: string }) => e.description === 'business')?.tagIds.length
      })
      .toBe(1)
  })

  /**
   * The panel is drawn into <body>, so nothing about focus follows from the
   * markup any more: an unmeasured panel that is `visibility: hidden` refuses
   * the search box's autoFocus, and tab order would run straight past a menu
   * sitting at the end of the document. Both only fail in a real browser.
   */
  test('opening a picker puts the keyboard inside it, and closing gives it back @engine', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'business')
    const row = page.locator('ul.divide-y > li').first()
    const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim())

    await row.getByRole('button', { name: 'Tags' }).click()
    const search = page.getByPlaceholder('Add/filter tags')
    await expect(search).toBeFocused()
    await page.keyboard.type('focus')
    await expect(search).toHaveValue('focus')

    await page.keyboard.press('Escape')
    await expect.poll(focused).toBe('Tags')

    // a menu has no autoFocus field of its own, so the panel has to place it:
    // on its first item that can be pressed, and Tab goes on to the next. Which
    // items those are depends on the layout's order (on a PC, Toggl's:
    // Plans/toggl-parity.md Phase 5; Split is greyed on an entry this short).
    await row.getByRole('button', { name: 'More actions for this time entry' }).click()
    const items = await page
      .locator('[data-dropdown-panel] button:not([disabled])')
      .evaluateAll((buttons) => buttons.map((b) => b.textContent?.trim()))
    expect(items.length).toBeGreaterThan(1)
    await expect.poll(focused).toBe(items[0])
    await page.keyboard.press('Tab')
    await expect.poll(focused).toBe(items[1])
  })

  test('idle detection never fires while you work elsewhere, and asks when you come back @timing', async ({ page }) => {
    // Turned on with a three-second threshold on the ACCOUNT, which is where
    // the setting lives; a browser-only change is overwritten by the account's
    // copy the moment the page syncs. Put back afterwards.
    await openFreshTracker(page)
    await setIdleOnAccount(page, { enabled: true, minutes: 0.05 })
    try {
      await reopenFromAccount(page)
      expect((await readState(page)).idle.enabled, 'the idle setting did not reach the page').toBe(true)

      // pretend the tab is in the background before tracking starts: time spent
      // in another app is work, not idling
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true })
        document.hasFocus = () => false
      })

      await page.getByPlaceholder('What are you working on?').fill('Design review')
      await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
      // past the threshold, with the tab "away": no prompt may appear. Wall
      // time is what is under test, so this one waits for it.
      await page.waitForTimeout(4000)
      await expect(page.getByText(/No activity for/)).toHaveCount(0)

      // back on the page and not touching it — now the question is fair
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true })
        document.hasFocus = () => true
      })
      await expect(page.getByText(/No activity for/)).toBeVisible({ timeout: 10_000 })

      // and it reads as language, not as 0.05 hours
      await expect(page.locator('h3').filter({ hasText: /No activity for/ })).toContainText(/second|minute/)
      await expect(page.getByRole('button', { name: /Count them/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Drop them, keep tracking/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Drop them and stop/ })).toBeVisible()
    } finally {
      await setIdleOnAccount(page, { enabled: false, minutes: 10 })
    }
  })

  test('warns instead of silently losing data when saving fails @engine', async ({ page }) => {
    await openFreshTracker(page)
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError')
      }
    })
    await page.locator('main').getByRole('button', { name: /Stop timer|Start timer/ }).first().click()
    await expect(page.getByText(/Could not save to this browser/)).toBeVisible()
  })

  test('every entry row shares one column layout, group badge or not @engine', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'grouped work')
    await trackEntry(page, 'grouped work')
    await createProject(page, 'Column Check')
    await trackEntry(page, 'solo work')

    // both layouts render a badge; only the pointer one is in the a11y tree here
    const badge = page.getByRole('button', { name: 'Expand group' })
    await expect(badge).toBeVisible()

    /** every pointer-layout row, as "offset:width" per column */
    const geometry = () =>
      page.evaluate(() => {
        const rows = [...document.querySelectorAll('ul.divide-y > li')]
          .map((li) => li.querySelector(':scope > div.hidden'))
          .filter((row): row is HTMLElement => row !== null)
        return rows.map((row) => {
          const origin = row.getBoundingClientRect().x
          const cells = [...row.children]
            .map((cell) => {
              const box = cell.getBoundingClientRect()
              return `${Math.round(box.x - origin)}:${Math.round(box.width)}`
            })
            .join(' ')
          const description = row.querySelector('input[placeholder="(no description)"]')!
          return { cells, description: Math.round(description.getBoundingClientRect().width) }
        })
      })

    // a group badge, a row without one, a row with a project and a row without
    for (const width of [1280, 900, 700]) {
      await page.setViewportSize({ width, height: 800 })
      // the layout has answered the resize when every row is drawn at it
      await expect
        .poll(async () => (await geometry()).length, { message: `no pointer rows at ${width}px` })
        .toBeGreaterThanOrEqual(2)

      const rows = await geometry()
      const templates = [...new Set(rows.map((r) => r.cells))]
      expect(templates, `columns drift between rows at ${width}px`).toHaveLength(1)
      // the description must not be squeezed out by the fixed columns
      expect(Math.min(...rows.map((r) => r.description)), `description collapsed at ${width}px`).toBeGreaterThanOrEqual(120)
    }

    // expanding the group keeps the children on the same columns
    await page.setViewportSize({ width: 1280, height: 800 })
    await badge.click()
    await expect.poll(async () => (await geometry()).length).toBeGreaterThan(2)
    const expanded = await geometry()
    expect([...new Set(expanded.map((r) => r.cells))], 'expanded group children drift').toHaveLength(1)
  })

  test('two tabs of the same browser stay in step instead of overwriting each other @engine', async ({ page, context }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'from tab A')

    // A second tab used to load its own copy of the workspace and then save it
    // back on the next change, silently throwing away whatever the first tab
    // had done in the meantime.
    const second = await context.newPage()
    const secondSaid: string[] = []
    second.on('pageerror', (error) => secondSaid.push(`uncaught: ${error.message}`))
    second.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') secondSaid.push(`${message.type()}: ${message.text()}`)
    })
    await second.goto(TRACKER, { waitUntil: 'domcontentloaded' })
    await second.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
    await expect(second.locator('main input[value="from tab A"]').first()).toBeVisible({ timeout: 20_000 })

    // now track in the second tab and watch the first one follow
    await explainedBy(() => whatEachTabHolds(page, second, secondSaid), async () => {
      await trackEntry(second, 'from tab B')
      await expect(page.locator('main input[value="from tab B"]').first()).toBeVisible({ timeout: 10_000 })

      // and the first tab's entry is still there — nothing was overwritten
      await expect(page.locator('main input[value="from tab A"]').first()).toBeVisible()
    })
    await second.close()
  })

  test('survives a reload and stays usable on a narrow viewport @engine', async ({ page }) => {
    await openFreshTracker(page)
    await page.getByPlaceholder('What are you working on?').fill('Persisted entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await expect(trackerHeader(page)).toContainText('Persisted entry')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await openTracker(page)
    await expect(trackerHeader(page)).toContainText('Persisted entry')

    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400)
  })

  /**
   * D8 in Plans/time-tracker-like-toggl.md: the section and the open sheet live
   * in the address. Android's Back closed nothing and left the tracker; a reload
   * forgot the section. The browser's own Back is what is pressed here.
   */
  test('on a phone, Back closes the sheet, then steps back a section, and a reload keeps the section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openFreshTracker(page)
    await trackEntry(page, 'Back check')

    const sections = page.getByRole('navigation', { name: 'Sections' })
    const current = () => sections.locator('[aria-current="page"]')
    await sections.getByRole('button', { name: 'Calendar' }).click()
    await expect(page).toHaveURL(/\?view=calendar$/)

    // the entry is seconds long, so its block is tiny: open it the way a tap does
    await page.locator('[data-block][title^="Back check ·"]').first().dispatchEvent('click')
    // on the phone a tap selects the block and its panel offers Edit (Phase 4), which opens the one sheet (Phase 2)
    await page.getByRole('region', { name: 'Selected time entry' }).getByRole('button', { name: 'Edit' }).click()
    const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
    await expect(sheet).toBeVisible()
    await expect(page).toHaveURL(/[?&]entry=/)

    await page.goBack()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(/\?view=calendar$/)
    await expect(current()).toHaveText('Calendar')

    await page.goBack()
    await expect(current()).toHaveText('Timer')
    await expect(page).toHaveURL(new RegExp(`${TRACKER}$`))

    await page.goForward()
    await expect(current()).toHaveText('Calendar')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(current()).toHaveText('Calendar', { timeout: 30_000 })
    await expect(page).toHaveURL(/\?view=calendar$/)
  })

  /**
   * Phase 6: the calendar with a mouse. A drag on empty space makes a block, a
   * drag of its body moves it, and its TOP edge resizes it now too; a click
   * still only opens it (edits audit B2). The pointer is captured only once a
   * drag has moved: captured on the press, the click went to the day column
   * and the sheet never opened.
   */
  test('the calendar takes a mouse: drag to make, drag to move, either edge to resize, click to open', async ({ page }) => {
    await openFreshTracker(page)
    await openCalendar(page)
    await chooseDayView(page)
    await page.locator('main').getByRole('button', { name: 'Next', exact: true }).click()
    await scrollCalendarTo(page, 9 * 60)

    let column = await calendarColumn(page)
    await page.mouse.move(column.x, column.yAt(10 * 60))
    await page.mouse.down()
    for (let m = 5; m <= 90; m += 5) await page.mouse.move(column.x, column.yAt(10 * 60 + m))
    await page.mouse.up()
    // on a PC the drag asks for the block in the box beside it, and Add time entry makes it (Plans/toggl-parity.md Phase 6)
    const asked = page.getByRole('dialog', { name: 'New time entry' })
    if (await page.getByRole('navigation', { name: 'Tracker' }).isVisible()) await asked.getByRole('button', { name: 'Add time entry' }).click()
    const block = page.locator('[data-entry-block]')
    await expect(block).toHaveAccessibleName('(no description), 10:00 to 11:30, planned')

    // by its body, 15 minutes later
    column = await calendarColumn(page)
    let box = (await block.boundingBox())!
    await page.mouse.move(column.x, box.y + box.height / 2)
    await page.mouse.down()
    for (let m = 5; m <= 15; m += 5) await page.mouse.move(column.x, box.y + box.height / 2 + m * column.minutePx)
    await page.mouse.up()
    await expect(block).toHaveAccessibleName('(no description), 10:15 to 11:45, planned')

    // by its top edge, 30 minutes earlier
    box = (await block.boundingBox())!
    await page.mouse.move(column.x, box.y + 3)
    await page.mouse.down()
    for (let m = 5; m <= 30; m += 5) await page.mouse.move(column.x, box.y + 3 - m * column.minutePx)
    await page.mouse.up()
    await expect(block).toHaveAccessibleName('(no description), 09:45 to 11:45, planned')

    // a click opens it and changes nothing: the box beside it on a PC, the sheet on a phone
    await block.click()
    const sheet = page.getByRole('dialog', { name: /^(Time entry details|Edit time entry)$/ })
    await expect(sheet).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(block).toHaveAccessibleName('(no description), 09:45 to 11:45, planned')

    // and so does Enter, on the block Tab reaches
    await block.focus()
    await page.keyboard.press('Enter')
    await expect(sheet).toBeVisible()

    await savedToAccount(page)
    expect(await entriesOnAccount(page)).toEqual([''])
  })
})

/** Day view: from Toggl Track's "Week view ▾" menu on a PC (Plans/toggl-parity.md Phase 6), the Day chip on a phone */
async function chooseDayView(page: Page) {
  const menu = page.getByRole('button', { name: 'Calendar view' })
  if (await menu.isVisible()) {
    await menu.click()
    await page.getByRole('button', { name: 'Day view' }).click()
  } else {
    await page.locator('main').getByRole('button', { name: 'Day', exact: true }).click()
  }
}

/** The calendar's first day column, measured where it is drawn now: `yAt(minutes)` is a page y */
async function calendarColumn(page: Page) {
  const box = (await page.locator('[data-day-column]').first().boundingBox())!
  const minutePx = box.height / (24 * 60)
  return { x: box.x + box.width * 0.3, minutePx, yAt: (minutes: number) => box.y + minutes * minutePx + 1 }
}

/** Scroll the calendar so this minute of the day is at the top of its window */
async function scrollCalendarTo(page: Page, minutes: number) {
  await page.evaluate((m) => {
    const column = document.querySelector('[data-day-column]')!
    const scroller = document.querySelector<HTMLElement>('[data-calendar-scroll]')!
    scroller.scrollTop = (m * column.getBoundingClientRect().height) / (24 * 60)
  }, minutes)
}

/**
 * A finger, through Chromium's DevTools protocol: the page gets real touches,
 * and the browser itself decides whether they scroll — which is what a
 * synthetic event in the page could never show.
 */
async function fingerOn(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  return {
    down: (x: number, y: number) => send('touchStart', x, y),
    /** in steps, as a finger reports */
    slide: async (from: { x: number; y: number }, to: { x: number; y: number }, steps: number) => {
      for (let i = 1; i <= steps; i++) await send('touchMove', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
    },
    up: () => send('touchEnd'),
  }
}

/** The first day's header: its name, then what it has tracked (on the phone, the day line above the week strip) */
const dayHeader = (page: Page) => page.locator('[data-day-header]').first().locator('p')

/**
 * A block a held finger made opens its sheet with the name ready to type, as
 * Toggl opens its editor (audit findability, Phase 8). Closed with nothing
 * typed, the block stays as it was made.
 */
async function closeNewBlockSheet(page: Page) {
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await expect(sheet, 'a block made by holding did not open its sheet').toBeVisible()
  await expect(sheet.getByPlaceholder(/worked on|working on/)).toBeFocused()
  await sheet.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(sheet).toBeHidden()
}

/**
 * Tomorrow, the way the phone's calendar gets there (Plans/toggl-parity.md
 * Phase 4): its day in the week strip, or the next week's strip first when
 * today ends the week. A real tap, which is also what lets Chrome vibrate.
 */
async function tapTomorrow(page: Page) {
  const tomorrow = await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const day = page.locator(`[data-day="${tomorrow}"]`)
  if ((await day.count()) === 0) await page.getByRole('button', { name: 'Next week' }).tap()
  await day.tap()
}

/** The calendar on the phone, by the section bar */
async function openPhoneCalendar(page: Page) {
  // dispatchEvent: under `next dev` the dev-tools badge sits over a corner of the bar
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Calendar' }).dispatchEvent('click')
  await expect(page.locator('main').getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('data-active', 'true')
}

/**
 * Phase 6 of Plans/time-tracker-like-toggl.md: the calendar on the owner's
 * Android phone. A finger held 400 ms makes, moves and resizes; before that
 * it scrolls, or swipes the day. Every 5-minute step ticks the vibration.
 */
test.describe('the calendar by touch, on an Android phone @phone', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', "a finger can be dragged only through Chromium's DevTools protocol; Playwright's WebKit (the iPhone lane) can only tap")
  test.use({
    viewport: devices['Pixel 7'].viewport,
    userAgent: devices['Pixel 7'].userAgent,
    deviceScaleFactor: devices['Pixel 7'].deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  })

  test('a held finger plans Gym tomorrow 10:00–11:30: striped, counted nowhere, saved to the account @phone', async ({ page }) => {
    // every tick of the motor, counted
    await page.addInitScript(() => {
      const ticks: number[] = []
      Object.defineProperty(window, '__ticks', { value: ticks })
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (pattern: number) => (ticks.push(pattern), true) })
    })
    await openFreshTracker(page)
    await openPhoneCalendar(page)
    const todayTotal = await dayHeader(page).nth(1).textContent()
    const today = (await dayHeader(page).first().textContent())!
    // a real tap, which is also what lets Chrome vibrate at all
    await tapTomorrow(page)
    await expect(dayHeader(page).first()).not.toHaveText(today)
    await scrollCalendarTo(page, 9 * 60 + 15)

    const column = await calendarColumn(page)
    const finger = await fingerOn(page)
    await finger.down(column.x, column.yAt(10 * 60))
    // the hold takes: the block to be appears under the finger
    const preview = page.locator('[data-preview]')
    await expect(preview).toBeVisible()
    await finger.slide({ x: column.x, y: column.yAt(10 * 60) }, { x: column.x, y: column.yAt(11 * 60 + 30) }, 18)
    await expect(preview).toHaveText('10:00–11:30 · 1h 30m')
    await expect(preview, 'a planned block lost its stripes while drawn').toHaveAttribute('data-planned', 'true')
    await finger.up()
    await closeNewBlockSheet(page)

    const block = page.locator('[data-entry-block]')
    await expect(block).toHaveAccessibleName('(no description), 10:00 to 11:30, planned')
    await expect(block).toHaveCSS('background-image', /repeating-linear-gradient/)
    // a fresh account shows durations as 0:47:06, Toggl's default (Plans/toggl-parity.md, Phase 7)
    await expect(dayHeader(page).nth(1)).toHaveText('0:00:00')
    // one tick as the hold took, one per step — a quarter hour on the phone's calendar (D-PHONE-CAL)
    expect(await page.evaluate(() => (window as unknown as { __ticks: number[] }).__ticks)).toEqual(Array(7).fill(5))

    await savedToAccount(page)
    expect(await entriesOnAccount(page)).toEqual([''])

    // back on today, by a swipe: its total is what it was
    const swipeY = column.yAt(12 * 60)
    await finger.down(column.x - 40, swipeY)
    await finger.slide({ x: column.x - 40, y: swipeY }, { x: column.x + 160, y: swipeY }, 6)
    await finger.up()
    await expect(dayHeader(page).first()).toHaveText(today)
    await expect(dayHeader(page).nth(1)).toHaveText(todayTotal!)

    // and the list says so beside tomorrow's total
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Timer' }).dispatchEvent('click')
    await expect(page.getByText('0:00:00 · 1:30:00 planned')).toBeVisible()
  })

  test('a held block moves alone; its top edge takes the entry before along, its bottom edge only itself @phone', async ({ page }) => {
    await openFreshTracker(page)
    await openPhoneCalendar(page)
    const today = (await dayHeader(page).first().textContent())!
    await tapTomorrow(page)
    await expect(dayHeader(page).first()).not.toHaveText(today)
    await scrollCalendarTo(page, 9 * 60)
    const finger = await fingerOn(page)
    const column = await calendarColumn(page)
    const make = async (from: number, to: number) => {
      await finger.down(column.x, column.yAt(from))
      await expect(page.locator('[data-preview]')).toBeVisible()
      await finger.slide({ x: column.x, y: column.yAt(from) }, { x: column.x, y: column.yAt(to) }, (to - from) / 5)
      await finger.up()
      await closeNewBlockSheet(page)
    }
    // two blocks that touch: 10:00–11:00, then 11:00–11:30
    await make(10 * 60, 11 * 60)
    await make(11 * 60, 11 * 60 + 30)
    await expect(page.getByRole('button', { name: /^\(no description\), 10:00 to 11:00/ })).toBeVisible()
    const second = page.getByRole('button', { name: /^\(no description\), 11:00 to 11:30/ })
    await expect(second).toBeVisible()

    /** Hold a block at this height inside it, wait for the hold to take, and drag it this many minutes */
    const holdAndDrag = async (block: typeof second, at: (box: { y: number; height: number }) => number, minutes: number) => {
      const box = (await block.boundingBox())!
      const y = at(box)
      await finger.down(column.x, y)
      await expect(block).toHaveAttribute('data-held', 'true')
      await finger.slide({ x: column.x, y }, { x: column.x, y: y + minutes * column.minutePx }, Math.abs(minutes) / 5)
      await finger.up()
    }

    // its top edge 15 minutes up: the entry that ended where it started ends there too (D12)
    await holdAndDrag(second, (box) => box.y + 4, -15)
    await expect(page.getByRole('button', { name: /^\(no description\), 10:45 to 11:30/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^\(no description\), 10:00 to 10:45/ })).toBeVisible()
    await expect(page.getByText('Also moved ‘(no description)’ to end 10:45')).toBeVisible()

    // its bottom edge 15 minutes down
    const moved = page.getByRole('button', { name: /^\(no description\), 10:45 to 11:30/ })
    await holdAndDrag(moved, (box) => box.y + box.height - 4, 15)
    await expect(page.getByRole('button', { name: /^\(no description\), 10:45 to 11:45/ })).toBeVisible()

    // the first one by its body, 30 minutes earlier: it moves alone
    const early = page.getByRole('button', { name: /^\(no description\), 10:00 to 10:45/ })
    await holdAndDrag(early, (box) => box.y + box.height / 2, -30)
    await expect(page.getByRole('button', { name: /^\(no description\), 09:30 to 10:15/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^\(no description\), 10:45 to 11:45/ })).toBeVisible()
    await savedToAccount(page)
  })

  /**
   * D-SWIPE (Plans/toggl-parity.md Phase 3): right past three quarters of the
   * row continues it, left deletes it with Undo — and a finger going up the
   * list is a scroll that moves neither, with real touches the browser itself
   * decides about.
   */
  test('a row swiped right continues it, left deletes it, and a scroll over it does neither @phone', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'Email')
    const row = page.locator('[data-swipe-row]').filter({ hasText: 'Email' }).first()
    const finger = await fingerOn(page)
    const box = async () => (await row.boundingBox())!

    // up the list: a scroll, not a swipe
    let b = await box()
    await finger.down(b.x + b.width / 2, b.y + b.height / 2)
    await finger.slide({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, { x: b.x + b.width / 2 + 30, y: b.y + b.height / 2 - 200 }, 8)
    await finger.up()
    await expect(timerButton(page, 'Start timer')).toBeVisible()
    expect((await readState(page)).entries.filter((e: { stop: string | null }) => e.stop === null)).toEqual([])

    // right, past 75%: Email again, running
    b = await box()
    await finger.down(b.x + 12, b.y + b.height / 2)
    await finger.slide({ x: b.x + 12, y: b.y + b.height / 2 }, { x: b.x + 12 + b.width * 0.85, y: b.y + b.height / 2 + 4 }, 10)
    await finger.up()
    await expect(timerButton(page, 'Stop timer')).toBeVisible()
    await expect(page.getByTestId('run-bar')).toContainText('Email')
    await timerButton(page, 'Stop timer').click()

    // left, past 75%: deleted, with Undo
    const before = (await readState(page)).entries.filter((e: { serverDeletedAt: string | null }) => !e.serverDeletedAt).length
    b = await box()
    await finger.down(b.x + b.width - 12, b.y + b.height / 2)
    await finger.slide({ x: b.x + b.width - 12, y: b.y + b.height / 2 }, { x: b.x + b.width * 0.1, y: b.y + b.height / 2 - 4 }, 10)
    await finger.up()
    // the two Emails are one grouped row by now (Group similar entries), and a row goes whole
    await expect(page.getByText(/^(Time entry was deleted|\d+ time entries deleted)$/)).toBeVisible()
    await expect
      .poll(async () => (await readState(page)).entries.filter((e: { serverDeletedAt: string | null }) => !e.serverDeletedAt).length)
      .toBeLessThan(before)
  })

  test('a quick flick scrolls the calendar and makes nothing; a sideways swipe turns the day @phone', async ({ page }) => {
    await openFreshTracker(page)
    await openPhoneCalendar(page)
    const today = (await dayHeader(page).first().textContent())!
    await scrollCalendarTo(page, 8 * 60)
    const scrollTop = () => page.locator('[data-calendar-scroll]').evaluate((el) => el.scrollTop)
    const before = await scrollTop()
    const column = await calendarColumn(page)
    const finger = await fingerOn(page)
    const y = column.yAt(10 * 60)

    await finger.down(column.x, y)
    await finger.slide({ x: column.x, y }, { x: column.x, y: y - 240 }, 8)
    await finger.up()

    await expect.poll(scrollTop, { message: 'the flick did not scroll' }).toBeGreaterThan(before + 100)
    // the press is over, so no hold can take after this
    await expect(page.locator('[data-calendar-grid]')).not.toHaveAttribute('data-pressing')
    await expect(page.locator('[data-preview]')).toHaveCount(0)
    expect((await readState(page)).entries).toEqual([])

    // sideways, leftwards: the next day
    const swipeY = column.yAt(12 * 60)
    await finger.down(column.x + 150, swipeY)
    await finger.slide({ x: column.x + 150, y: swipeY }, { x: column.x - 40, y: swipeY + 6 }, 6)
    await finger.up()
    await expect(dayHeader(page).first()).not.toHaveText(today)
    expect((await readState(page)).entries).toEqual([])
  })
})
