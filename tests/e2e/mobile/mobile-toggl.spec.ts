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
  await page.getByRole('heading', { name: 'My Workspace' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(800)
}

/**
 * The bottom bar is `position: fixed`; Playwright's mobile emulation measures
 * actionability against the layout viewport, so a plain click can report a
 * false interception. The element's own hit-test is asserted separately below.
 */
const tab = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true })

async function goTo(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0))
  // dispatchEvent, not click(): in `next dev` the dev-tools badge sits in a
  // bottom corner and covers part of the bar. That overlay does not exist in a
  // production build, and the bar's own hit-test is asserted separately.
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
})
