/**
 * ONE LANGUAGE, MEASURED — on a phone, with a program running.
 *
 * Every claim in Phase 9 is about pixels and colours, and every one of them was
 * made by reading source. A class list is not a measurement: `min-h-11` on a
 * flex child that is also `items-center` inside a `h-9` parent renders at 36 px
 * and the source says 44. So this measures the rendered boxes.
 *
 * What it caught before the phase ran, all measured at 390 px: 11-px tab
 * labels, a 26-px "Start again", a 26-px Delete, a 20-px back link, and an
 * outline button that flashed the sunset red on hover — `--accent` is
 * `#e63946`, and a bordered button hovering red reads as a warning rather than
 * as something you may press.
 *
 * IN THE `training` PROJECT AND IGNORED BY `chromium`. The chromium project
 * matches every `*.spec.ts` it is not told to ignore, so without both edits
 * this runs in parallel against the one shared training account and corrupts
 * the specs that are wiping it clean.
 */

import { test, expect, type Browser, type Page } from "@playwright/test"
import { PHONE, cleanUp, resetAndEnroll } from "./helpers/training.helper"

test.use({ viewport: PHONE, hasTouch: true })
test.describe.configure({ mode: "serial" })

/** The one orange, as the stylesheet declares it. */
const ORANGE = "rgb(255, 107, 53)"
/** The sunset red, which no bordered button may reach for on hover. */
const SUNSET_RED = "rgb(230, 57, 70)"

/** Everything a finger has to hit, plus the tabs the sweep's selector misses. */
const CONTROLS = 'button, a[href], [role="tab"], input, select, textarea'

/** The floor, and the two ways a rendered box gets under it. */
const FLOOR = 44

interface Measured {
  tag: string
  label: string
  height: number
}

/**
 * Every visible control's rendered height. Invisible ones are not targets.
 *
 * THE DEV OVERLAY IS EXCLUDED BY ITS SHADOW ROOT. Its buttons are 24 and 32 px
 * and they are not this app's; they do not exist in a production build at all,
 * so counting them would make this spec fail only in the environment it runs
 * in. `el.closest("nextjs-portal")` does not find them — Playwright's selector
 * engine pierces open shadow roots and `closest` stops at the boundary — but
 * `getRootNode() === document` does, and this app uses no shadow DOM of its own.
 */
async function controls(page: Page): Promise<Measured[]> {
  return page.$$eval(CONTROLS, (nodes) =>
    nodes
      .filter((el) => el.getRootNode() === document)
      .filter((el) => {
        const box = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity) > 0.05
        )
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        label:
          el.getAttribute("aria-label") ??
          el.getAttribute("data-testid") ??
          (el.textContent ?? "").trim().slice(0, 40),
        height: Math.round(el.getBoundingClientRect().height),
      }))
  )
}

/** Every rendered font size under `floor`, with the words it is applied to. */
async function tinyText(page: Page, floor = 12): Promise<string[]> {
  return page.$$eval(
    "body *",
    (nodes, min) =>
      nodes
        .filter((el) => el.getRootNode() === document)
        .filter((el) => {
          const text = [...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0
          )
          if (!text) return false
          const box = el.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) return false
          return parseFloat(window.getComputedStyle(el).fontSize) < min
        })
        .map(
          (el) =>
            `${Math.round(parseFloat(window.getComputedStyle(el).fontSize))}px "${(el.textContent ?? "")
              .trim()
              .slice(0, 40)}" ${el.closest("[data-testid]")?.getAttribute("data-testid") ?? ""}`
        ),
    floor
  )
}

/** Elements filled with the app's one orange. */
async function oranges(page: Page): Promise<string[]> {
  return page.$$eval(
    "body *",
    (nodes, colour) =>
      nodes
        .filter((el) => el.getRootNode() === document)
        .filter((el) => {
          const box = el.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) return false
          return window.getComputedStyle(el).backgroundColor === colour
        })
        .map((el) => (el.textContent ?? "").trim().slice(0, 40) || el.tagName.toLowerCase()),
    ORANGE
  )
}

/**
 * WAIT FOR THE TAB'S OWN CONTENT, not for a number of milliseconds.
 *
 * Both tabs are lazy, so a fixed sleep either measures the Suspense fallback —
 * nine chrome controls, no tab content, and a pass that means nothing — or it is
 * longer than it needs to be on every run for ever. Each tab names the thing
 * that proves it has arrived.
 */
async function openTab(page: Page, tab: "today" | "history" | "progress") {
  await page.goto(`/programs?tab=${tab}`, { waitUntil: "domcontentloaded" })
  /**
   * THE TAB HAS ARRIVED WHEN ITS PLACEHOLDER HAS GONE, not when a particular
   * thing is on it.
   *
   * The first version waited for `week-dots` on Progress, which only exists
   * once the account has trained — and it went red the day the training suite
   * moved to an account of its own with no history in it. "Nothing logged yet.
   * Finish a workout and it will be here" is a perfectly arrived tab, and a
   * measurement of the controls on it is exactly as valid.
   *
   * Every one of these tabs renders `animate-pulse` while it loads and nothing
   * afterwards, which is the one signal that means the same thing for a full
   * account and an empty one.
   */
  await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 30000 })
  await expect(page.locator("[data-slot='tabs-content'] .animate-pulse")).toHaveCount(0, {
    timeout: 30000,
  })
  /**
   * AND THE WORD, because the Today tab does not use the pulse. It renders a
   * plain "Loading…" while the enrollment read is in flight, so waiting on the
   * placeholder alone let the measurement run against a tab that had not
   * decided yet — 0 controls, 0 oranges, and a pass or a fail that meant
   * nothing either way.
   */
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 30000 })
}

/**
 * A page from `browser.newPage()` is on `about:blank`, and both helpers run
 * relative `fetch`es inside the page — which is "Failed to parse URL from
 * /api/workouts/live" until something has actually loaded from the origin.
 */
async function onTheApp(browser: Browser) {
  const page = await browser.newPage()
  await page.goto("/programs", { waitUntil: "domcontentloaded" })
  return page
}

test.beforeAll(async ({ browser }) => {
  const page = await onTheApp(browser)
  await resetAndEnroll(page)
  await page.close()
})

test.afterAll(async ({ browser }) => {
  const page = await onTheApp(browser)
  await cleanUp(page)
  await page.close()
})

test("Today, History and Progress: every control is 44px and no text is under 12px", async ({
  page,
}) => {
  for (const tab of ["today", "history", "progress"] as const) {
    await openTab(page, tab)

    const small = (await controls(page)).filter((c) => c.height < FLOOR)
    expect(
      small.map((c) => `${tab}: <${c.tag}> "${c.label}" is ${c.height}px`),
      "measured at 390px, not read off a class list"
    ).toEqual([])

    const tiny = await tinyText(page)
    expect(tiny.map((t) => `${tab}: ${t}`)).toEqual([])
  }
})

test("exactly one orange on Today, and none on History or Progress", async ({ page }) => {
  /**
   * ONE "DO THIS" PER SCREEN. Level chips, unit chips and Start were all
   * `variant="default"` at once, so the only control that did something
   * irreversible shouted no louder than the two that did not.
   *
   * The bottom tab bar's current tab is orange TEXT rather than an orange
   * fill, so it does not count here — this measures `background-color`.
   *
   * MEASURED WITH A PROGRAM RUNNING, which the fixture guarantees. The EMPTY
   * Today has two — "Browse programs" and "Start a workout now" — and that is
   * Phase 5's deliberate "both doors, on the screen you land on": somebody who
   * only wants to log today should not have to find a tab first. Not asserted
   * here rather than quietly changed, because re-deciding it is not this
   * test's business; it is recorded so the next reader knows it was a choice.
   */
  await openTab(page, "today")
  const onToday = await oranges(page)
  expect(onToday, `Today has ${onToday.length} orange fills: ${onToday.join(" | ")}`).toHaveLength(1)

  for (const tab of ["history", "progress"] as const) {
    await openTab(page, tab)
    const found = await oranges(page)
    expect(found, `${tab} should offer no "do this": ${found.join(" | ")}`).toEqual([])
  }
})

test("no training box is under 16px on a phone", async ({ page }) => {
  /**
   * Tapping a text box smaller than 16 px makes iOS Safari zoom the whole page,
   * and it does not zoom back. The rule is in `globals.css` with `!important`
   * and an exception for boxes deliberately larger; this is the half that
   * proves it survives Tailwind's own specificity.
   */
  for (const tab of ["today", "history", "progress"] as const) {
    await openTab(page, tab)
    const zooming = await page.$$eval("input, select, textarea", (nodes) =>
      nodes
        .filter((el) => el.getRootNode() === document)
        .filter((el) => el.getBoundingClientRect().height > 0)
        .filter((el) => parseFloat(window.getComputedStyle(el).fontSize) < 16)
        .map(
          (el) =>
            `${Math.round(parseFloat(window.getComputedStyle(el).fontSize))}px ${
              el.getAttribute("aria-label") ?? el.getAttribute("name") ?? el.tagName
            }`
        )
    )
    expect(zooming.map((z) => `${tab}: ${z}`)).toEqual([])
  }
})

test("no bordered button flashes the sunset red when you hover it", async ({ page }) => {
  await openTab(page, "today")
  const outlined = page.locator('[data-slot="button"]').first()
  await expect(outlined).toBeVisible()
  await outlined.hover()
  await page.waitForTimeout(250)

  const background = await outlined.evaluate((el) => window.getComputedStyle(el).backgroundColor)
  expect(
    background,
    "`--accent` is the sunset red; a bordered button hovering it reads as a warning"
  ).not.toBe(SUNSET_RED)
})

test("the live screen: every control is 44px, and only the caption row is 11px", async ({
  page,
}) => {
  await openTab(page, "today")
  await page.getByTestId("start-workout").click()
  await page.waitForURL(/\/programs\/live/)
  await expect(page.getByTestId("live-column")).toBeVisible({ timeout: 30000 })

  try {
    const small = (await controls(page)).filter((c) => c.height < FLOOR)
    expect(small.map((c) => `<${c.tag}> "${c.label}" is ${c.height}px`)).toEqual([])

    /**
     * The set grid's column captions — SET · PREVIOUS · KG · REPS — are the one
     * place in all of training allowed under 12 px, because they are four words
     * that never change sitting directly above the numbers they label.
     */
    const under12 = await tinyText(page)
    const notCaption = await page.$$eval("body *", (nodes) =>
      nodes
        .filter((el) => el.getRootNode() === document)
        .filter((el) => {
          const size = parseFloat(window.getComputedStyle(el).fontSize)
          if (size >= 12) return false
          const box = el.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) return false
          const hasText = [...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0
          )
          return hasText && !el.closest('[data-testid^="lift-"]')
        })
        .map((el) => (el.textContent ?? "").trim().slice(0, 40))
    )
    expect(
      notCaption,
      `under 12px and not a column caption: ${notCaption.join(" | ")} (all: ${under12.length})`
    ).toEqual([])

    const orange = await oranges(page)
    expect(orange, `the live screen's one orange is Finish: ${orange.join(" | ")}`).toHaveLength(1)
  } finally {
    await cleanUp(page)
  }
})
