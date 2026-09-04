/**
 * End-to-end coverage for the Toggl-style time tracker at /test/toggl.
 *
 * The page is client-only and stores everything in localStorage, so each test
 * clears that key and reloads to get the deterministic seeded workspace.
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE = '/test/toggl'
const STORAGE_KEY = 'toggl-clone:v1'

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

async function openFreshSandbox(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(600)
}

/** Track one entry through the UI, since the workspace starts empty */
async function trackEntry(page: Page, description: string) {
  await page.getByPlaceholder('What are you working on?').fill(description)
  await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
  await page.waitForTimeout(700)
  await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()
  await page.waitForTimeout(400)
}

/** Create a project from the timer bar's picker */
async function createProject(page: Page, name: string) {
  const timerBar = page.locator('main > div').first()
  await timerBar.locator('button').first().click()
  await page.getByPlaceholder('Search or add a project…').fill(name)
  await page.getByRole('button', { name: `Create “${name}”` }).click()
  await page.waitForTimeout(400)
}

const nav = (page: Page, name: string | RegExp) =>
  page.getByRole('navigation').getByRole('button', { name })

/** Shortcuts are ignored while a field has focus, so blur first */
const blur = (page: Page) =>
  page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())

const readState = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), STORAGE_KEY)

/**
 * These run signed OUT on purpose.
 *
 * They are about the tracker itself — grouping, pickers, rounding, the layout —
 * and none of them is about your account. Once syncing existed, running them
 * signed in meant "clear this browser" no longer produced an empty workspace:
 * the account's own projects and tags came back down, and tests asserting on an
 * empty one failed for a reason that had nothing to do with what they check.
 *
 * The signed-in paths have their own suites: timetrack-sync and
 * timetrack-edge-cases.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Toggl-style time tracker', () => {
  // One test stubs the calendar route, so run serially and drop interceptions
  // afterwards — required by tests/unit/e2e-isolation.test.ts
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('a new workspace starts completely empty', async ({ page }) => {
    await openFreshSandbox(page)

    await expect(page.getByText('No time entries yet')).toBeVisible()
    const state = await readState(page)
    expect(state.entries).toHaveLength(0)
    expect(state.projects).toHaveLength(0)
    expect(state.clients).toHaveLength(0)
    expect(state.tags).toHaveLength(0)
    expect(state.favorites).toHaveLength(0)
    // only you, so rates and reports have an owner
    expect(state.members).toHaveLength(1)
    expect(state.members[0].isSelf).toBe(true)
  })

  test('sample data left in an existing browser is cleaned out on load', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'my own work')

    // plant a legacy sample row the way older builds stored it
    await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      state.entries.push({
        ...state.entries[0],
        id: 9999,
        description: 'Client sync',
        createdWith: 'daygame-coach /test/toggl (demo data)',
      })
      window.localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor()
    await page.waitForTimeout(900)

    const state = await readState(page)
    expect(state.entries.map((e: { description: string }) => e.description)).toEqual(['my own work'])
    await expect(page.getByText(/Removed 1 sample entries/)).toBeVisible()
  })

  test('starts and stops the timer, and mirrors it in the tab title', async ({ page }) => {
    await openFreshSandbox(page)

    await page.getByPlaceholder('What are you working on?').fill('E2E entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(1500)

    await expect(page.getByRole('banner')).toContainText('E2E entry')
    await expect(page).toHaveTitle(/\d+:\d\d:\d\d · E2E entry/)

    await blur(page)
    await page.keyboard.press('s')
    await page.waitForTimeout(400)
    await expect(page.getByRole('banner')).not.toContainText('E2E entry')
  })

  test('keyboard shortcuts continue the last entry', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'shortcut source')

    await blur(page)
    await page.keyboard.press('c')
    await page.waitForTimeout(600)
    const afterContinue = await readState(page)
    expect(afterContinue.entries.filter((e: { duration: number }) => e.duration < 0)).toHaveLength(1)

    await blur(page)
    await page.keyboard.press('s')
    await page.waitForTimeout(400)

    await blur(page)
    await page.keyboard.press('Shift+?')
    await expect(page.getByText('Keyboard shortcuts')).toBeVisible()
  })

  test('imports an .ics calendar, skipping all-day events', async ({ page }) => {
    await openFreshSandbox(page)
    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Integrations' }).click()
    await page.getByRole('button', { name: /Upload \.ics/ }).click()

    await page.setInputFiles('input[type="file"][accept*=".ics"]', {
      name: 'e2e.ics',
      mimeType: 'text/calendar',
      buffer: Buffer.from(ICS_FIXTURE),
    })
    await page.waitForTimeout(900)

    await expect(page.getByText(/Imported 1 event \(skipped 1 all-day\)/)).toBeVisible()

    await nav(page, 'Calendar').click()
    await page.waitForTimeout(700)
    await expect(page.locator('main')).toContainText('Imported standup')
  })

  test('does not store the secret calendar address unless asked to', async ({ page }) => {
    await openFreshSandbox(page)
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
    await page.waitForTimeout(900)

    const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
    expect(raw).not.toContain('e2e-secret-token')
    await expect(page.locator('main')).toContainText('not saved')
  })

  test('enforces required fields, then saves once they are filled', async ({ page }) => {
    await openFreshSandbox(page)

    await nav(page, 'Settings').click()
    await page.getByRole('button', { name: 'Workspace', exact: true }).click()
    await page.getByRole('switch', { name: 'Project is required' }).click()

    await nav(page, 'Timer').click()
    await page.waitForTimeout(500)
    await page.getByPlaceholder('What are you working on?').fill('Blocked entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    // exactly one toast, not one per React render pass
    await expect(page.getByText(/Project is required/)).toHaveCount(1)

    await createProject(page, 'Client work')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(600)
    await expect(page.getByRole('banner')).toContainText('Blocked entry')
  })

  test('reports tabs render and rounding changes the total', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'reportable work')
    await nav(page, 'Reports').click()
    await page.waitForTimeout(800)

    await expect(page.locator('main')).toContainText(/total hours/i)
    for (const tab of ['Detailed', 'Workload', 'Profitability', 'My reports']) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await page.waitForTimeout(400)
      await expect(page.locator('main')).toBeVisible()
    }

    await page.getByRole('button', { name: 'Summary', exact: true }).click()
    await page.waitForTimeout(400)
    const totalTile = page.locator('main').getByText(/total hours/i).locator('..')
    const before = await totalTile.innerText()
    await page.getByText(/^Rounding:/).click()
    await page.getByText('Round time entries').click()
    const selects = page.locator('[data-dropdown-panel] select')
    await selects.nth(0).selectOption('up')
    await selects.nth(1).selectOption('60')
    await page.waitForTimeout(600)
    expect(await totalTile.innerText()).not.toEqual(before)
  })

  test('creating a tag or project from an entry row saves both the entity and the link', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'book writing')

    const row = page.locator('ul.divide-y > li').first()

    await row.getByRole('button', { name: 'Tags' }).click()
    await expect(page.getByText('No tags yet — type a name to add one')).toBeVisible()
    await page.getByPlaceholder('Search or add a tag…').fill('focus')
    await page.getByRole('button', { name: /Create/ }).click()
    await page.waitForTimeout(600)

    await row.getByRole('button', { name: 'Project' }).click()
    await page.getByPlaceholder('Search or add a project…').fill('Book')
    await page.getByRole('button', { name: /Create/ }).click()
    await page.waitForTimeout(600)

    const state = await readState(page)
    const entry = state.entries[0]

    // the entity itself must exist — an earlier build linked the entry to an id
    // that was never saved, because two state updates overwrote each other
    expect(state.tags.map((t: { name: string }) => t.name)).toEqual(['focus'])
    expect(state.projects.map((p: { name: string }) => p.name)).toEqual(['Book'])
    expect(entry.tagIds).toHaveLength(1)
    expect(state.tags.some((t: { id: number }) => t.id === entry.tagIds[0])).toBe(true)
    expect(state.projects.some((p: { id: number }) => p.id === entry.projectId)).toBe(true)

    await expect(row).toContainText('focus')
    await expect(row).toContainText('Book')
  })

  /**
   * The day card sets `overflow-hidden` for its rounded corners, so a picker
   * panel drawn inside it was sliced off at the card's bottom edge: on the last
   * row of a day you saw the search box and none of your tags. Panels now
   * render into <body>, so this checks the option is really painted where its
   * box says it is — a bounding box alone survives being clipped.
   */
  test('a tag picker on the last row of a day shows the tag list, not just the search box', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'business')
    await trackEntry(page, 'book writing')

    const rows = page.locator('ul.divide-y > li')
    await expect(rows).toHaveCount(2)

    // two tags, so the list is taller than the card has room for.
    // Creating one closes the panel, and the trigger is then named after it.
    for (const [trigger, name] of [['Tags', 'focus'], ['focus', 'deep work']]) {
      await rows.first().getByRole('button', { name: trigger }).click()
      await page.getByPlaceholder('Search or add a tag…').fill(name)
      await page.getByRole('button', { name: `Create “${name}”` }).click()
      await page.waitForTimeout(400)
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
    await page.waitForTimeout(400)
    const state = await readState(page)
    const business = state.entries.find((e: { description: string }) => e.description === 'business')
    expect(business.tagIds).toHaveLength(1)
  })

  /**
   * The panel is drawn into <body>, so nothing about focus follows from the
   * markup any more: an unmeasured panel that is `visibility: hidden` refuses
   * the search box's autoFocus, and tab order would run straight past a menu
   * sitting at the end of the document. Both only fail in a real browser.
   */
  test('opening a picker puts the keyboard inside it, and closing gives it back', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'business')
    const row = page.locator('ul.divide-y > li').first()

    await row.getByRole('button', { name: 'Tags' }).click()
    await page.waitForTimeout(300)
    await page.keyboard.type('focus')
    await expect(page.getByPlaceholder('Search or add a tag…')).toHaveValue('focus')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Tags')

    // a menu has no autoFocus field of its own, so the panel has to place it
    await row.getByRole('button', { name: 'More actions for this time entry' }).click()
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Duplicate')
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Add to favorites')
  })

  test('idle detection is off by default and never fires while you work elsewhere', async ({ page }) => {
    await openFreshSandbox(page)

    // a web page cannot tell "away from the desk" from "in another app"
    const idle = await readState(page).then((s) => s.idle)
    expect(idle.enabled).toBe(false)

    // turn it on with a zero threshold so the check runs on the next tick
    await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      state.idle = { enabled: true, minutes: 0 }
      window.localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor()
    await page.waitForTimeout(600)

    // pretend the tab is in the background before tracking starts: time spent
    // in another app is work, not idling
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true })
      document.hasFocus = () => false
    })

    await page.getByPlaceholder('What are you working on?').fill('Design review')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(3000)
    await expect(page.getByText(/No activity for/)).toHaveCount(0)

    // back on the page and not touching it — now the question is fair
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true })
      document.hasFocus = () => true
    })
    await expect(page.getByText(/No activity for/)).toBeVisible({ timeout: 5000 })

    // and it reads as language, not as 0.05 hours
    await expect(page.locator('h3').filter({ hasText: /No activity for/ })).toContainText(/second|minute/)
    await expect(page.getByRole('button', { name: /Count them/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Drop them, keep tracking/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Drop them and stop/ })).toBeVisible()
  })

  test('warns instead of silently losing data when saving fails', async ({ page }) => {
    await openFreshSandbox(page)
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError')
      }
    })
    await page.locator('main').getByRole('button', { name: /Stop timer|Start timer/ }).first().click()
    await expect(page.getByText(/Could not save to this browser/)).toBeVisible()
  })

  test('every entry row shares one column layout, group badge or not', async ({ page }) => {
    await openFreshSandbox(page)
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
      await page.waitForTimeout(300)

      const rows = await geometry()
      expect(rows.length, `no pointer rows at ${width}px`).toBeGreaterThanOrEqual(2)
      const templates = [...new Set(rows.map((r) => r.cells))]
      expect(templates, `columns drift between rows at ${width}px`).toHaveLength(1)
      // the description must not be squeezed out by the fixed columns
      expect(Math.min(...rows.map((r) => r.description)), `description collapsed at ${width}px`).toBeGreaterThanOrEqual(120)
    }

    // expanding the group keeps the children on the same columns
    await page.setViewportSize({ width: 1280, height: 800 })
    await badge.click()
    await page.waitForTimeout(300)
    const expanded = await geometry()
    expect(expanded.length).toBeGreaterThan(2)
    expect([...new Set(expanded.map((r) => r.cells))], 'expanded group children drift').toHaveLength(1)
  })

  test('two tabs of the same browser stay in step instead of overwriting each other', async ({ page, context }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'from tab A')

    // A second tab used to load its own copy of the workspace and then save it
    // back on the next change, silently throwing away whatever the first tab
    // had done in the meantime.
    const second = await context.newPage()
    await second.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await second.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 20000 })
    await second.waitForTimeout(800)
    await expect(second.locator('main input[value="from tab A"]').first()).toBeVisible()

    // now track in the second tab and watch the first one follow
    await trackEntry(second, 'from tab B')
    await expect(page.locator('main input[value="from tab B"]').first()).toBeVisible({ timeout: 10000 })

    // and the first tab's entry is still there — nothing was overwritten
    await expect(page.locator('main input[value="from tab A"]').first()).toBeVisible()
    await second.close()
  })

  test('survives a reload and stays usable on a narrow viewport', async ({ page }) => {
    await openFreshSandbox(page)
    await page.getByPlaceholder('What are you working on?').fill('Persisted entry')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(700)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Workspace' }).waitFor()
    await page.waitForTimeout(800)
    await expect(page.locator('main input[value="Persisted entry"]').first()).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(400)
  })
})
