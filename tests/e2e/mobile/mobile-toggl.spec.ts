/**
 * Phone-viewport coverage for the time tracker at /test/toggl.
 *
 * Runs in the mobile-* Playwright projects (iPhone 14 / Pixel 7). It guards the
 * things that actually broke at 390px: page-width overflow, the bottom tab bar,
 * the compact entry rows, the report filter sheet and touch-target sizes.
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE = '/test/toggl'
const STORAGE_KEY = 'toggl-clone:v1'

async function openFreshSandbox(page: Page) {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Time', exact: true }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(800)
}

/**
 * The bottom bar is `position: fixed`; Playwright's mobile emulation measures
 * actionability against the layout viewport, so a plain click can report a
 * false interception. The element's own hit-test is asserted separately below.
 */
const tab = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true })

/** The two sections that live behind "More" on a phone, not in the bar */
const BEHIND_MORE = ['Manage', 'Settings']

async function goTo(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0))
  // dispatchEvent, not click(): in `next dev` the dev-tools badge sits in a
  // bottom corner and covers part of the bar. That overlay does not exist in a
  // production build, and the bar's own hit-test is asserted separately.
  if (BEHIND_MORE.includes(name)) {
    await tab(page, 'More').dispatchEvent('click')
    await page.waitForTimeout(400)
    // a real click here on purpose: the sheet's rows have to be tappable, and
    // Playwright refuses a click on an element something else is covering.
    // The sheet was drawn under this very bar the first time it was wired up.
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
    await page.waitForTimeout(700)
    return
  }
  await tab(page, name).dispatchEvent('click')
  await page.waitForTimeout(700)
}

/** The workspace starts empty, so tests that need rows create them */
async function trackEntry(page: Page, description: string) {
  await page.getByPlaceholder('What are you working on?').fill(description)
  await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
  await page.waitForTimeout(700)
  await page.locator('main').getByRole('button', { name: 'Stop timer' }).click()
  await page.waitForTimeout(400)
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

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

test.describe('time tracker on a phone', () => {
  test.describe.configure({ mode: 'serial' })

  test('every screen fits the viewport with no horizontal scrolling', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'phone entry')

    for (const screen of ['Timer', 'Calendar', 'Reports', 'Projects', 'Manage', 'Settings']) {
      if (screen !== 'Timer') await goTo(page, screen)
      const { scrollWidth, innerWidth } = await pageOverflow(page)
      expect(scrollWidth, `${screen} overflows horizontally`).toBeLessThanOrEqual(innerWidth + 1)
    }
  })

  test('the bottom tab bar is present, reachable and switches screens', async ({ page }) => {
    await openFreshSandbox(page)

    const bar = page.locator('nav[aria-label="Sections"]')
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
    await expect(page.locator('main')).toContainText(/total hours/i)
    await goTo(page, 'Timer')
    await expect(page.getByPlaceholder('What are you working on?')).toBeVisible()
  })

  test('entry rows are compact and open the detail sheet on tap', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'phone entry')

    const firstRow = page.locator('ul.divide-y > li').first()
    await firstRow.locator('[role="button"]').first().click()
    await expect(page.getByText('Time entry details')).toBeVisible()

    // the sheet fills the screen rather than floating in a corner
    const sheet = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('h3')].find((h) => h.textContent === 'Time entry details')
      const panel = heading?.closest('div.flex')?.parentElement
      const rect = panel!.getBoundingClientRect()
      return { width: Math.round(rect.width), viewport: window.innerWidth }
    })
    expect(sheet.width).toBeGreaterThanOrEqual(sheet.viewport - 2)
  })

  test('a grouped entry can be expanded on a phone, not just on a desktop', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'grouped work')
    await trackEntry(page, 'grouped work')

    // the badge is its own control: tapping the row opens the lead entry's
    // sheet, which used to leave the rest of the group unreachable here
    const badge = page.getByRole('button', { name: 'Expand group' })
    await expect(badge).toBeVisible()
    const box = await badge.boundingBox()
    expect(box!.height, 'the group toggle is too short to tap').toBeGreaterThanOrEqual(44)

    const collapsed = await page.locator('ul.divide-y li').count()
    await badge.click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Collapse group' })).toBeVisible()
    expect(await page.locator('ul.divide-y li').count()).toBeGreaterThan(collapsed)

    await page.getByRole('button', { name: 'Collapse group' }).click()
    await page.waitForTimeout(300)
    expect(await page.locator('ul.divide-y li').count()).toBe(collapsed)
  })

  test('bulk selection is opt-in, so checkboxes do not clutter the list', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'phone entry')

    await expect(page.locator('input[aria-label="Select time entry"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Select' }).first().click()
    await page.waitForTimeout(300)
    expect(await page.locator('input[aria-label="Select time entry"]').count()).toBeGreaterThan(0)
  })

  test('report filters live in a sheet instead of a wall of controls', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'phone entry')
    await goTo(page, 'Reports')

    await page.getByRole('button', { name: /Filters/ }).click()
    await expect(page.getByText('Report settings')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Projects' }).first()).toBeVisible()
  })

  test('the calendar opens on a single day rather than a seven-column grid', async ({ page }) => {
    await openFreshSandbox(page)
    await goTo(page, 'Calendar')

    const dayButton = page.getByRole('button', { name: 'Day', exact: true })
    await expect(dayButton).toHaveClass(/bg-primary/)
    const { scrollWidth, innerWidth } = await pageOverflow(page)
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1)
  })

  test('no field is small enough to make iOS zoom the page when tapped', async ({ page }) => {
    await openFreshSandbox(page)

    // Safari zooms the whole page when you tap an input under 16px, and the
    // page never zooms back. The main timer field was 14px, as were ten
    // dropdowns across Reports and Settings.
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

    for (const screen of ['Timer', 'Calendar', 'Reports', 'Projects', 'Manage', 'Settings']) {
      if (screen !== 'Timer') await goTo(page, screen)
      const found = await tooSmall()
      expect(found, `${screen} has fields under 16px: ${JSON.stringify(found)}`).toEqual([])
    }
  })

  /**
   * THE CLASS GUARD, not a spot check.
   *
   * The slice sets its own floor — `touchTarget` is 44px on a phone, 32 with a
   * mouse — and then three controls quietly sat under it: the favourites tile at
   * 40px, the sync badge at 27px on the one control whose whole point is being
   * tappable when it says "Not saved. Tap to try again", and the Reports metrics
   * picker at 36px. Each was found by measuring, none by looking.
   *
   * Every visible button on every screen, so the next one that lands short is
   * caught by the sweep rather than by somebody's thumb. Buttons with no box are
   * skipped: a layout the other viewport owns is not this test's business.
   */
  test('no visible control on any screen is too small to tap', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'a row to measure')

    const tooSmall = () =>
      page.evaluate(() => {
        const found: { label: string; w: number; h: number }[] = []
        for (const button of document.querySelectorAll('button')) {
          const box = button.getBoundingClientRect()
          if (!box.width || !box.height) continue
          if (getComputedStyle(button).visibility === 'hidden') continue
          if (box.height >= 44 && box.width >= 44) continue
          found.push({
            label: (button.getAttribute('aria-label') ?? button.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50),
            w: Math.round(box.width),
            h: Math.round(box.height),
          })
        }
        return found
      })

    for (const screen of ['Timer', 'Calendar', 'Reports', 'Projects', 'Manage', 'Settings']) {
      if (screen !== 'Timer') await goTo(page, screen)
      const found = await tooSmall()
      expect(found, `${screen} has controls under 44px: ${JSON.stringify(found)}`).toEqual([])
    }
  })

  /**
   * A favourite used to be permanent on a phone. Its × was `hidden … sm:flex`,
   * and the only other way to un-favourite something is the star in the timer
   * bar, which acts on the draft — so it only works while the draft still
   * matches that favourite exactly. Move on to anything else and you were left
   * with a tile you could not remove whose only behaviour is starting a timer.
   */
  test('a favourite can be removed on a phone, and putting it back is one tap', async ({ page }) => {
    await openFreshSandbox(page)

    await page.getByPlaceholder('What are you working on?').fill('a favourite')
    await page.locator('main').getByRole('button', { name: 'Toggle favorite' }).click()
    await page.waitForTimeout(500)

    const stored = (key: string) =>
      page.evaluate((k) => JSON.parse(window.localStorage.getItem(k)!).favorites.length, key)
    expect(await stored(STORAGE_KEY)).toBe(1)

    // a real click, which Playwright refuses on a hidden or covered element
    await page.getByRole('button', { name: /Remove .* from favorites/ }).click()
    await page.waitForTimeout(500)
    expect(await stored(STORAGE_KEY)).toBe(0)

    await page.getByRole('button', { name: /Undo/ }).click()
    await page.waitForTimeout(500)
    expect(await stored(STORAGE_KEY), 'undo did not put it back').toBe(1)
  })

  /**
   * "Continue" sits 8px from the row's own tap area and 4px from the entry
   * menu. Hitting it while a timer runs ends that timer — the right rule, but it
   * used to happen in silence, and a timer that stopped without being mentioned
   * surfaces days later as a total that is wrong. I did this to myself with a
   * thumb while testing something else.
   */
  test('a tap that stops the timer you were running says so, and can be undone', async ({ page }) => {
    await openFreshSandbox(page)
    await trackEntry(page, 'old work')

    await page.getByPlaceholder('What are you working on?').fill('what I am doing now')
    await page.locator('main').getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(800)

    const running = () =>
      page.evaluate((key) => {
        const state = JSON.parse(window.localStorage.getItem(key)!)
        return state.entries.find((e: { duration: number }) => e.duration < 0)?.description ?? null
      }, STORAGE_KEY)
    expect(await running()).toBe('what I am doing now')

    await page.getByRole('button', { name: 'Continue this entry' }).last().click()
    await page.waitForTimeout(600)

    expect(await running(), 'the running timer was not displaced').toBe('old work')
    await expect(page.getByText(/Stopped .* and started /)).toBeVisible()

    await page.getByRole('button', { name: /Undo/ }).click()
    await page.waitForTimeout(700)
    expect(await running(), 'undo did not put the timer back').toBe('what I am doing now')
  })

  test('primary controls are large enough to tap', async ({ page }) => {
    await openFreshSandbox(page)

    const startButton = page.locator('main').getByRole('button', { name: 'Start timer' }).first()
    const startBox = await startButton.boundingBox()
    expect(startBox!.height, 'the start button is too short to tap').toBeGreaterThanOrEqual(36)

    // every tab in the bottom bar
    const tabs = page.locator('nav[aria-label="Sections"] button')
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
   * back to you and then discarded. On a phone there was no repair: the
   * inline-editable row that saves you on a desktop is `hidden sm:grid`.
   */
  test('what you fill in after pressing Start is what gets saved', async ({ page }) => {
    await openFreshSandbox(page)
    const bar = page.locator('main > div').first()

    // a project to reach for later
    await bar.getByRole('button', { name: 'Project', exact: true }).click()
    await page.getByPlaceholder(/Search or add a project/).fill('Writing')
    await page.getByRole('button', { name: /Create/ }).click()
    await page.waitForTimeout(400)
    await bar.getByRole('button', { name: 'Writing', exact: true }).click()
    await page.getByRole('button', { name: 'No project', exact: true }).click()
    await page.waitForTimeout(400)

    // start FIRST, fill in AFTER — the order this app is used in
    await bar.getByRole('button', { name: 'Start timer' }).click()
    await page.waitForTimeout(700)

    await page.getByPlaceholder('What are you working on?').fill('morning pages')
    await page.waitForTimeout(800) // past the commit pause

    await bar.getByRole('button', { name: 'Project', exact: true }).click()
    await page.getByPlaceholder(/Search or add a project/).fill('wri')
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Writing', exact: true }).last().click()
    await page.waitForTimeout(400)

    await bar.getByRole('button', { name: 'Non-billable' }).click()
    await page.waitForTimeout(400)

    await bar.getByRole('button', { name: 'Stop timer' }).click()
    await page.waitForTimeout(700)

    const saved = await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key)!)
      const entry = [...state.entries].sort((a, b) => b.start.localeCompare(a.start))[0]
      return {
        description: entry.description,
        project: state.projects.find((p: { id: string }) => p.id === entry.projectId)?.name ?? null,
        billable: entry.billable,
      }
    }, STORAGE_KEY)

    expect(saved.description, 'the description was thrown away').toBe('morning pages')
    expect(saved.project, 'the project was thrown away').toBe('Writing')
    expect(saved.billable, 'billable was thrown away').toBe(true)
  })

  test('typing a project name in the description box offers the project', async ({ page }) => {
    await openFreshSandbox(page)
    const bar = page.locator('main > div').first()

    await bar.getByRole('button', { name: 'Project', exact: true }).click()
    await page.getByPlaceholder(/Search or add a project/).fill('Writing')
    await page.getByRole('button', { name: /Create/ }).click()
    await page.waitForTimeout(400)
    await bar.getByRole('button', { name: 'Writing', exact: true }).click()
    await page.getByRole('button', { name: 'No project', exact: true }).click()
    await page.waitForTimeout(400)

    // no `@` typed: the grammar was invisible at this width, so plain text has
    // to work on its own
    await page.getByPlaceholder('What are you working on?').fill('wri')
    await page.waitForTimeout(500)

    const panel = page.locator('[data-dropdown-panel]')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Writing' })).toBeVisible()

    await panel.getByRole('button', { name: 'Writing' }).click()
    await page.waitForTimeout(400)
    // the words are the description somebody meant to write; only the project is set
    await expect(page.getByPlaceholder('What are you working on?')).toHaveValue('wri')
    await expect(bar.getByRole('button', { name: 'Writing', exact: true })).toBeVisible()
  })

  test('the section bar is five items with readable labels, and the way out says where it goes', async ({ page }) => {
    await openFreshSandbox(page)

    const tabs = page.locator('nav[aria-label="Sections"] button')
    await expect(tabs).toHaveCount(5)
    for (let i = 0; i < 5; i++) {
      const size = await tabs.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      // the app's own tab bar set 12px as its floor, deliberately
      expect(size, 'a section label is below the app-wide 12px floor').toBeGreaterThanOrEqual(12)
    }

    const back = page.locator('header a').first()
    const box = await back.boundingBox()
    expect(box!.height, 'the only way out of the tracker is under 44px').toBeGreaterThanOrEqual(44)
    expect((await back.innerText()).trim(), 'the way out is an unlabelled arrow').not.toBe('←')
  })

  test('the sections behind More can actually be tapped', async ({ page }) => {
    await openFreshSandbox(page)
    // goTo uses a real click for these, which Playwright refuses if anything
    // covers them — the sheet was drawn under the nav bar the first time
    await goTo(page, 'Settings')
    await expect(page.locator('main')).toContainText(/Profile|Workspace|Automation/)
    await goTo(page, 'Manage')
    await expect(page.locator('main')).toContainText(/Clients|Tags|Team/)
  })

  test('it opens where you left it, and the tab does not name a lab page', async ({ page }) => {
    await openFreshSandbox(page)
    await goTo(page, 'Reports')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Time' }).waitFor({ timeout: 20000 })
    await page.waitForTimeout(800)

    const current = page.locator('nav[aria-label="Sections"] button[aria-current="page"]')
    await expect(current).toHaveText('Reports')
    expect(await page.title()).not.toContain('/test/')
  })

  test('an idle page does no work: observers are not rebuilt as the clock ticks', async ({ page }) => {
    await openFreshSandbox(page)

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
    // samples across four idle seconds catch.
    const count = () => page.evaluate(() => (window as unknown as { __observersBuilt: number }).__observersBuilt)
    await page.waitForTimeout(1500)
    const settled = await count()
    await page.waitForTimeout(4000)
    const later = await count()

    expect(later - settled, 'the idle page is still rebuilding observers as it ticks').toBe(0)
  })
})
