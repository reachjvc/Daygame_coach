/**
 * Phone-viewport coverage for the Time Log, on the product route.
 *
 * Runs in the `phone` lane (iPhone 14) on pull requests and in `android`
 * (Pixel 7) nightly. It guards the things that actually broke at 390px:
 * page-width overflow, the bottom bar, the compact entry rows, tap-target
 * sizes and the iOS zoom floor.
 *
 * Written for the Time Log phone layout (Plans/time-log-phone.md): three tabs
 * (Timer, Calendar, Reports) with the run bar above them, "Settings and more"
 * (Projects, Clients, Tags, Settings, Import and export) in the header, and one
 * entry sheet for everything an entry can be asked.
 *
 * It signs in as the worker's own account, so each test starts from an
 * emptied account (helpers/timetrack.ts).
 */

import { type Locator, type Page } from '@playwright/test'
import { test, expect } from '../fixtures/test'
import { STORAGE_KEY, TRACKER, openFreshTracker, openTracker, readState, startNamed, tapStop, trackEntry } from '../helpers/timetrack'

/** The three tabs of the bar at the bottom */
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name, exact: true })

/** What ⚙ "Settings and more" opens, and the title the header then shows */
const BEHIND_MENU: Record<string, string> = {
  Projects: 'Projects',
  Clients: 'Clients',
  Tags: 'Tags',
  Settings: 'Settings',
  'Import and export': 'Import/export',
}

/** Something only that screen draws, so arriving there is a thing to wait for */
const SCREEN_READY: Record<string, (page: Page) => Locator> = {
  Timer: (page) => page.getByTestId('run-bar'),
  Calendar: (page) => page.locator('main [data-day-header]').first(),
  Reports: (page) => page.getByRole('region', { name: 'Tracked hours' }),
}

const ALL_SCREENS = ['Timer', 'Calendar', 'Reports', ...Object.keys(BEHIND_MENU)]

async function goTo(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0))
  if (name in BEHIND_MENU) {
    await page.getByRole('button', { name: 'Settings and more' }).click()
    // a real click on purpose: the sheet's rows have to be tappable
    await page.getByRole('dialog', { name: 'Settings and more' }).getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('banner').getByRole('heading', { level: 2 })).toHaveText(BEHIND_MENU[name])
    return
  }
  // dispatchEvent, not click(): in `next dev` the dev-tools badge sits in a bottom corner
  // and covers part of the bar. That overlay does not exist in a production build.
  await tab(page, name).dispatchEvent('click')
  await expect(SCREEN_READY[name](page)).toBeVisible()
}

/** The frame after a tap has been drawn: React has rendered what the tap changed */
const painted = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

const pageOverflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

/** Open the sheet of the first entry in the list */
async function openFirstEntry(page: Page) {
  await page.locator('main li div[role="button"]').first().click()
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await expect(sheet).toBeVisible()
  return sheet
}

/** A project, made the way a person makes one on a phone: ⚙, Projects, New project */
async function makeProject(page: Page, name: string) {
  await goTo(page, 'Projects')
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText(name).first()).toBeVisible()
  await goTo(page, 'Timer')
}

// No serial mode: each worker signs in to an account of its own and every test
// empties it first, so these may run side by side.
test.describe('time tracker on a phone', () => {
  test('every screen fits the viewport with no horizontal scrolling', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'phone entry')

    for (const screen of ALL_SCREENS) {
      if (screen !== 'Timer') await goTo(page, screen)
      const { scrollWidth, innerWidth } = await pageOverflow(page)
      expect(scrollWidth, `${screen} overflows horizontally`).toBeLessThanOrEqual(innerWidth + 1)
    }
  })

  /**
   * THE SAME SCREENS, WITH A TIMER RUNNING, which is the state the test above
   * never sees: it stops its timer inside `trackEntry` before it navigates.
   * With the badge keeping its words (offline) and the run bar showing the
   * timer, the header once pushed its bell off a 390px screen.
   */
  test('every screen still fits while a timer is running', async ({ page, context }) => {
    await openFreshTracker(page)
    await startNamed(page, 'a timer left running')
    await expect(page.getByTestId('run-bar').getByRole('button', { name: 'Stop timer' })).toBeVisible()

    // OFFLINE, so the badge keeps its words ("Offline · 1 waiting") for every
    // measurement. Online it shows nothing once saved, and words only while a
    // save is in flight, so the widest state is the one to measure.
    await context.setOffline(true)
    try {
      await expect(page.getByRole('banner').getByRole('button', { name: /^Offline/ })).toBeVisible()
      for (const screen of ALL_SCREENS) {
        if (screen !== 'Timer') await goTo(page, screen)
        // the bar with the running timer is what makes this different from the test above
        await expect(page.getByTestId('run-bar').getByRole('button', { name: 'Stop timer' })).toBeVisible()
        const { scrollWidth, innerWidth } = await pageOverflow(page)
        expect(scrollWidth, `${screen} overflows horizontally with a timer running`).toBeLessThanOrEqual(innerWidth + 1)
      }
    } finally {
      await context.setOffline(false)
    }
  })

  test('the bottom tab bar is present, reachable and switches screens', async ({ page }) => {
    await openFreshTracker(page)

    const bar = page.getByRole('navigation', { name: 'Sections' })
    await expect(bar).toBeVisible()

    // it sits at the bottom of the viewport and hit-tests to itself
    const ownsItsPixels = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Sections"]')!
      const rect = nav.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.x + rect.width * 0.5, rect.y + rect.height / 2)
      return { atBottom: Math.abs(rect.bottom - window.innerHeight) < 2, ownedByNav: nav.contains(hit) }
    })
    expect(ownsItsPixels.atBottom).toBe(true)
    expect(ownsItsPixels.ownedByNav).toBe(true)

    await goTo(page, 'Reports')
    await expect(page.locator('main')).toContainText(/tracked hours|total hours/i)
    await goTo(page, 'Timer')
    await expect(page.getByTestId('run-bar').getByRole('button', { name: /working on/ })).toBeVisible()
  })

  test('entry rows are compact and open the entry sheet on tap', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'phone entry')

    const sheet = await openFirstEntry(page)
    await expect(sheet.getByPlaceholder(/worked on|working on/)).toHaveValue('phone entry')

    // the sheet fills the screen's width rather than floating in a corner
    const { width, viewport } = await sheet.evaluate((el) => ({ width: Math.round(el.getBoundingClientRect().width), viewport: window.innerWidth }))
    expect(width).toBeGreaterThanOrEqual(viewport - 2)
  })

  test('a grouped entry can be expanded on a phone, not just on a desktop', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'grouped work')
    await trackEntry(page, 'grouped work')

    // the badge is its own control: tapping the row opens the lead entry's
    // sheet, which used to leave the rest of the group unreachable here
    const badge = page.getByRole('button', { name: 'Expand group' })
    await expect(badge).toBeVisible()
    const box = await badge.boundingBox()
    expect(box!.height, 'the group toggle is too short to tap').toBeGreaterThanOrEqual(44)

    const rows = page.locator('main ul.divide-y li')
    const collapsed = await rows.count()
    await badge.click()
    await expect(page.getByRole('button', { name: 'Collapse group' })).toBeVisible()
    await expect.poll(() => rows.count()).toBeGreaterThan(collapsed)

    await page.getByRole('button', { name: 'Collapse group' }).click()
    await expect.poll(() => rows.count()).toBe(collapsed)
  })

  test('the calendar opens on a single day with a week strip, not a seven-column grid', async ({ page }) => {
    await openFreshTracker(page)
    await goTo(page, 'Calendar')

    await expect(page.getByRole('group', { name: 'Week' }).getByRole('button', { pressed: true })).toHaveCount(1)
    await expect(page.locator('main [data-day-column]')).toHaveCount(1)
    const { scrollWidth, innerWidth } = await pageOverflow(page)
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1)
  })

  test('no field is small enough to make iOS zoom the page when tapped', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'a row for the sheet')

    // Safari zooms the whole page when you tap an input under 16px, and the
    // page never zooms back.
    const tooSmall = async () =>
      page.evaluate(() => {
        const found: { label: string; px: number }[] = []
        for (const el of document.querySelectorAll('input, select, textarea')) {
          const style = getComputedStyle(el)
          const box = el.getBoundingClientRect()
          if (!box.width || !box.height || style.display === 'none' || style.visibility === 'hidden') continue
          const type = el.getAttribute('type') ?? el.tagName.toLowerCase()
          if (type === 'checkbox' || type === 'radio') continue
          const px = parseFloat(style.fontSize)
          if (px < 16) {
            found.push({ label: el.getAttribute('placeholder') ?? el.getAttribute('aria-label') ?? type, px })
          }
        }
        return found
      })

    for (const screen of ALL_SCREENS) {
      if (screen !== 'Timer') await goTo(page, screen)
      const found = await tooSmall()
      expect(found, `${screen} has fields under 16px: ${JSON.stringify(found)}`).toEqual([])
    }

    // and the sheet, a state to enter rather than a place to navigate to
    await goTo(page, 'Timer')
    await openFirstEntry(page)
    const found = await tooSmall()
    expect(found, `the entry sheet has fields under 16px: ${JSON.stringify(found)}`).toEqual([])
  })

  /**
   * THE CLASS GUARD: every kind of thing a thumb can hit, on every screen and in the
   * entry sheet. The target measured is the EFFECTIVE one: a 16px checkbox inside a
   * 44px label is fine, because the label is what you hit.
   */
  const TAPPABLE = 'button, select, textarea, a[href], input, [role=button], [role=switch], summary'

  test('no visible control on any screen is too small to tap', async ({ page }) => {
    await openFreshTracker(page)

    // a grouped row, expanded: the state in which a 28px group chip once survived this
    await trackEntry(page, 'a row to measure')
    await trackEntry(page, 'a row to measure')
    const expand = page.getByRole('button', { name: /Expand group/ })
    await expect(expand, 'the fixture did not produce a grouped row').toBeVisible()
    await expand.click()
    await expect(page.getByRole('button', { name: /Collapse group/ })).toBeVisible()

    const tooSmall = (selector: string) =>
      page.evaluate((sel) => {
        const found: { what: string; label: string; size: string }[] = []
        for (const el of document.querySelectorAll(sel)) {
          // a form control's target is its label when it has one
          const target = el.tagName === 'INPUT' ? ((el.closest('label') as HTMLElement | null) ?? el) : (el as HTMLElement)
          const box = target.getBoundingClientRect()
          if (!box.width || !box.height) continue
          // A calendar block's height IS its length on the day's time scale: a 10-minute
          // entry drawn 44px tall would claim most of an hour.
          if (el.hasAttribute('data-entry-block')) continue
          if (getComputedStyle(el).visibility === 'hidden') continue
          if (el.getAttribute('type') === 'hidden') continue
          if (box.height >= 44 && box.width >= 44) continue
          found.push({
            what: el.tagName.toLowerCase(),
            label: (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
            size: `${Math.round(box.width)}x${Math.round(box.height)}`,
          })
        }
        return found
      }, selector)

    for (const screen of ALL_SCREENS) {
      if (screen !== 'Timer') await goTo(page, screen)
      await painted(page)
      const found = await tooSmall(TAPPABLE)
      expect(found, `${screen} has controls under 44px: ${JSON.stringify(found)}`).toEqual([])
    }

    // the sheets: a state you have to enter, not a place you navigate to
    await goTo(page, 'Timer')
    await openFirstEntry(page)
    const sheet = await tooSmall(TAPPABLE)
    expect(sheet, `the entry sheet has controls under 44px: ${JSON.stringify(sheet)}`).toEqual([])
  })

  /**
   * A favourite used to be permanent on a phone: nothing there could remove it. It is
   * added from the entry's own sheet, removed with the × on its chip, and the removal
   * says so and can be undone.
   */
  test('a favourite can be removed on a phone, and putting it back is one tap', async ({ page }) => {
    await openFreshTracker(page)
    const favourites = async () => (await readState(page)).favorites.length

    await trackEntry(page, 'a favourite')
    const sheet = await openFirstEntry(page)
    await sheet.getByRole('button', { name: 'More options' }).click()
    await page.getByRole('button', { name: 'Add to favorites' }).click()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect.poll(favourites).toBe(1)

    // a real click, which Playwright refuses on a hidden or covered element
    await page.getByRole('button', { name: /Remove .* from favorites/ }).click()
    await expect.poll(favourites).toBe(0)

    await page.getByRole('button', { name: /Undo/ }).click()
    await expect.poll(favourites, { message: 'undo did not put it back' }).toBe(1)
  })

  /**
   * "Continue" sits next to the row's own tap area. Hitting it while a timer runs
   * ends that timer, the right rule, but it used to happen in silence, and a timer
   * that stopped without being mentioned surfaces days later as a wrong total.
   */
  test('a tap that stops the timer you were running says so, and can be undone', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'old work')

    const running = () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem(key)!)
        return state.entries.find((e: { duration: number }) => e.duration < 0)?.description ?? null
      }, STORAGE_KEY)

    await startNamed(page, 'what I am doing now')
    await expect.poll(running).toBe('what I am doing now')

    await page.getByRole('button', { name: 'Continue this entry' }).last().click()
    await expect.poll(running, { message: 'the running timer was not displaced' }).toBe('old work')
    await expect(page.getByText(/Stopped .* and started /)).toBeVisible()

    await page.getByRole('button', { name: /Undo/ }).click()
    await expect.poll(running, { message: 'undo did not put the timer back' }).toBe('what I am doing now')
  })

  test('primary controls are large enough to tap', async ({ page }) => {
    await openFreshTracker(page)

    // the bar's two buttons: the name, and the round start
    const bar = page.getByTestId('run-bar')
    for (const name of [/working on/, 'Start timer']) {
      const box = await bar.getByRole('button', { name }).boundingBox()
      expect(box!.height, `${name} is too short to tap`).toBeGreaterThanOrEqual(44)
      expect(box!.width, `${name} is too narrow to tap`).toBeGreaterThanOrEqual(44)
    }

    // every tab in the bottom bar
    const tabs = page.getByRole('navigation', { name: 'Sections' }).getByRole('button')
    for (let i = 0; i < (await tabs.count()); i++) {
      const box = await tabs.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
  })

  /**
   * THE BUG THE WHOLE PLAN WAS WRITTEN FOR.
   *
   * The bar wrote to the draft and nothing wrote the draft onto the entry that
   * was already running, so everything entered after pressing Start was shown
   * back to you and then discarded. On a phone the running entry's sheet is the
   * only place to fill it in.
   */
  test('what you fill in after pressing Start is what gets saved', async ({ page }) => {
    await openFreshTracker(page)
    await makeProject(page, 'Writing')

    /** The running entry, as this browser holds it */
    const runningEntry = () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem(key)!)
        const entry = state.entries.find((e: { duration: number }) => e.duration < 0)
        if (!entry) return null
        return {
          description: entry.description,
          project: state.projects.find((p: { id: string }) => p.id === entry.projectId)?.name ?? null,
        }
      }, STORAGE_KEY)

    // start FIRST, fill in AFTER: the order this app is used in
    await page.getByTestId('run-bar').getByRole('button', { name: 'Start timer' }).click()
    const bar = page.getByTestId('run-bar')
    await expect(bar.getByRole('button', { name: 'Stop timer' })).toBeVisible()

    await bar.getByRole('button', { name: 'Edit the running time entry' }).click()
    const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
    await sheet.getByPlaceholder(/worked on|working on/).fill('morning pages')
    await sheet.getByRole('button', { name: 'More options' }).click()
    await page.getByRole('button', { name: 'Project and task…' }).click()
    await page.getByPlaceholder(/Search by project, task or client/).fill('wri')
    await page.getByRole('button', { name: 'Writing', exact: true }).last().click()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()

    await expect.poll(async () => (await runningEntry())?.description).toBe('morning pages')
    await expect.poll(async () => (await runningEntry())?.project).toBe('Writing')

    await tapStop(page)

    const saved = await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      const entry = [...state.entries].sort((a, b) => b.start.localeCompare(a.start))[0]
      return {
        description: entry.description,
        project: state.projects.find((p: { id: string }) => p.id === entry.projectId)?.name ?? null,
      }
    }, STORAGE_KEY)

    expect(saved.description, 'the description was thrown away').toBe('morning pages')
    expect(saved.project, 'the project was thrown away').toBe('Writing')
  })

  test('typing a project name in the description box offers the project', async ({ page }) => {
    await openFreshTracker(page)
    await makeProject(page, 'Writing')

    await page.getByTestId('run-bar').getByRole('button', { name: /working on/ }).click()
    const sheet = page.getByRole('dialog', { name: 'New time entry' })
    // no `@` typed: the grammar is invisible at this width, so plain text has to work on its own
    await sheet.getByPlaceholder(/worked on|working on/).fill('wri')

    const panel = page.locator('[data-dropdown-panel]')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Writing' })).toBeVisible()

    await panel.getByRole('button', { name: 'Writing' }).click()
    // the words are the description somebody meant to write; only the project is set
    await expect(sheet.getByRole('button', { name: 'Writing' }).first()).toBeVisible()
    await expect(sheet.getByPlaceholder(/worked on|working on/)).toHaveValue('wri')
  })

  test('the section bar is three items with readable labels, and the way out says where it goes', async ({ page }) => {
    await openFreshTracker(page)

    const tabs = page.getByRole('navigation', { name: 'Sections' }).getByRole('button')
    await expect(tabs).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      const size = await tabs.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      // the app's own tab bar set 12px as its floor, deliberately
      expect(size, 'a section label is below the app-wide 12px floor').toBeGreaterThanOrEqual(12)
    }

    // `:visible`: the app's own header is in the page too, and on a phone it is there but hidden
    const back = page.locator('header:visible a').first()
    const box = await back.boundingBox()
    expect(box!.height, 'the only way out of the tracker is under 44px').toBeGreaterThanOrEqual(44)
    expect((await back.innerText()).trim(), 'the way out is an unlabelled arrow').not.toBe('←')
  })

  test('the sections behind the menu can actually be tapped', async ({ page }) => {
    await openFreshTracker(page)
    // goTo uses a real click for these, which Playwright refuses if anything covers them
    await goTo(page, 'Settings')
    await expect(page.locator('main')).toContainText(/Profile|Workspace|Automation/)
    await goTo(page, 'Clients')
    await expect(page.locator('main')).toContainText(/Clients/)
  })

  test('a reload stays on its section, Time itself opens on Timer, and the tab does not name a lab page', async ({ page }) => {
    await openFreshTracker(page)
    await goTo(page, 'Reports')

    // the section is in the address, so a reload keeps it
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor({ timeout: 30_000 })
    const current = page.getByRole('navigation', { name: 'Sections' }).locator('button[aria-current="page"]')
    await expect(current).toHaveText('Reports')
    expect(await page.title()).not.toMatch(/\/test\//)

    // the app's own Time link names no section: that is the timer, whatever was open last
    await openTracker(page)
    await expect(current).toHaveText('Timer')
    expect(page.url()).toContain(TRACKER)
  })

  test('an idle page does no work: observers are not rebuilt as the clock ticks @timing', async ({ page }) => {
    await openFreshTracker(page)

    // The shell's bottom-bar effect had no dependency array, so it rebuilt a
    // ResizeObserver after every render — against a one-second clock. Measured
    // at eight in six idle seconds before this was fixed.
    await page.evaluate(() => {
      const w = window as unknown as { __observersBuilt: number }
      w.__observersBuilt = 0
      const Real = window.ResizeObserver
      window.ResizeObserver = class extends Real {
        constructor(callback: ResizeObserverCallback) {
          super(callback)
          w.__observersBuilt++
        }
      }
    })

    // GROWTH is the assertion, not the absolute count. A count of zero passes
    // in Chromium and fails on WebKit, which builds exactly one of its own
    // after load — engine internals this test has no business policing. What
    // the bug actually was is "one more every render", and that is what two
    // samples across four idle seconds catch: idle TIME is the thing measured.
    const count = () => page.evaluate(() => (window as unknown as { __observersBuilt: number }).__observersBuilt)
    await page.waitForTimeout(1500)
    const settled = await count()
    await page.waitForTimeout(4000)
    const later = await count()

    expect(later - settled, 'the idle page is still rebuilding observers as it ticks').toBe(0)
  })
})
