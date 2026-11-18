/**
 * THE CRAVING AND SLIP DIARY COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (b, c, d, e) walks every seen screen of its spec in
 * order, logs an entry and checks it shows in the list and moves the chart. Each screen is shot
 * into ~/.cache/daygame-research/quit-copy/diary/shots-ours/<letter>/.
 * Everything lives in this browser's storage, so nothing is written to the live database.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/diary/shots-ours")

let n = 0
async function shot(page: Page, letter: string, name: string) {
  n += 1
  const dir = path.join(SHOTS, letter)
  mkdirSync(dir, { recursive: true })
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

async function open(page: Page, letter: string) {
  n = 0
  rmSync(path.join(SHOTS, letter), { recursive: true, force: true })
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const res = await page.goto(`/quit/lab/diary/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId(`diary-${letter}`)).toBeVisible()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  return errors
}

const screenOf = (page: Page, letter: string) => page.getByTestId(`diary-${letter}`)
const num = async (page: Page, testId: string, attr: string) => Number(await page.getByTestId(testId).first().getAttribute(attr))

test("copy B: one screen is log and chart; tap counts, sheet opens a tip, example clears", async ({ page }) => {
  const errors = await open(page, "b")
  const root = screenOf(page, "b")
  await expect(root).toHaveAttribute("data-screen", "cravings")
  await expect(page.locator("[data-testid^=b-row-]")).toHaveCount(4)
  await expect(page.locator("[data-testid^=b-slice-]")).toHaveCount(4)
  expect(await page.getByTestId("placeholder").count()).toBeGreaterThanOrEqual(2)
  await expect(page.getByTestId("b-pie")).toHaveAttribute("data-total", "16")
  await expect(page.getByTestId("b-pct-0")).toHaveText("38%")
  await shot(page, "b", "cravings")

  // the other two icon buttons and the other bottom tabs belong to other tools
  await page.getByTestId("b-sub-1").click()
  await expect(page.getByTestId("b-other-sub")).toBeVisible()
  await page.getByTestId("b-sub-0").click()
  await page.getByTestId("b-nav-0").click()
  await expect(page.getByTestId("b-other-nav")).toBeVisible()
  await shot(page, "b", "other-tab")
  await page.getByTestId("b-nav-2").click()

  // tapping a situation counts it (+1) and opens the sheet with its tip
  await page.getByTestId("b-row-0").click()
  await expect(root).toHaveAttribute("data-screen", "sheet")
  await expect(page.getByTestId("b-sheet-count")).toHaveText("7")
  await expect(page.getByTestId("b-sheet-pct")).toHaveText("41%")
  await expect(page.getByTestId("b-tip")).toContainText(/\w/)
  await shot(page, "b", "sheet")
  await page.getByTestId("b-plus").click()
  await expect(page.getByTestId("b-sheet-count")).toHaveText("8")
  await page.getByTestId("b-minus").click()
  await expect(page.getByTestId("b-sheet-count")).toHaveText("7")
  await page.getByTestId("b-next-tip").click()
  await expect(page.getByTestId("b-tip")).toHaveAttribute("data-tip", "1")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "b", "next-tip")
  await page.getByTestId("b-sheet-close").click()
  await expect(page.getByTestId("b-count-0")).toHaveText("7")
  await expect(page.getByTestId("b-pie")).toHaveAttribute("data-total", "17")

  // a situation with no seen tip shows a dashed tile
  await page.getByTestId("b-row-1").click()
  await expect(page.getByTestId("b-tip").getByTestId("placeholder")).toBeVisible()
  await page.getByTestId("b-sheet-close").click()

  // clear the example: empty chart, then the first count is 100%
  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("example-bar")).toHaveCount(0)
  await expect(page.getByTestId("b-pie")).toHaveAttribute("data-total", "0")
  await shot(page, "b", "cleared")
  await page.getByTestId("b-row-2").click()
  await expect(page.getByTestId("b-sheet-pct")).toHaveText("100%")
  await page.getByTestId("b-sheet-close").click()
  await expect(page.getByTestId("b-pie")).toHaveAttribute("data-total", "1")
  await shot(page, "b", "first-count")
  expect(errors).toEqual([])
})

test("copy C: week strip, check-in form, mood donut, trends, two line charts, insights", async ({ page }) => {
  const errors = await open(page, "c")
  const root = screenOf(page, "c")
  await expect(root).toHaveAttribute("data-screen", "timer")
  await expect(page.getByTestId("c-today")).toBeVisible()
  await shot(page, "c", "timer")
  const today = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })

  // numbers before the check-in
  await page.getByTestId("c-nav-3").click()
  await expect(root).toHaveAttribute("data-screen", "entries")
  await expect(page.getByTestId("inferred-tag").first()).toBeVisible()
  await expect(page.locator("[data-testid^=c-entry-20]")).toHaveCount(14)
  await shot(page, "c", "entries")
  await page.getByTestId("c-go-moodchart").click()
  const moods0 = await num(page, "c-donut", "data-total")
  await page.getByTestId("screen-back").click()
  await page.getByTestId("c-go-urges").click()
  const days0 = (await page.getByTestId("c-line").getAttribute("data-points"))!.split(",").length
  await page.getByTestId("screen-back").click()
  await page.getByTestId("c-nav-0").click()

  // the check-in form
  await page.getByTestId("c-checkin").click()
  await expect(root).toHaveAttribute("data-screen", "checkin")
  await shot(page, "c", "checkin")
  await page.getByTestId("c-smoked-yes").click()
  await expect(page.getByTestId("c-smoked-yes")).toHaveAttribute("aria-checked", "true")
  await page.getByTestId("c-urges").fill("3")
  await page.getByTestId("c-intensity").fill("6")
  await expect(page.getByTestId("c-intensity-value")).toHaveText("6")
  await page.getByTestId("c-trigger-row").click()
  await expect(root).toHaveAttribute("data-screen", "trigger")
  await expect(page.locator("[data-testid^=c-mood-]")).toHaveCount(8)
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await page.getByTestId("c-mood-1").click()
  await shot(page, "c", "trigger")
  await page.getByTestId("screen-back").click()
  await page.getByTestId("c-withdrawal-row").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "c", "withdrawal")
  await page.getByTestId("screen-back").click()
  await page.getByTestId("c-save").click()
  await expect(root).toHaveAttribute("data-screen", "timer")
  await shot(page, "c", "timer-after")

  // the entry is in the list and moves the charts
  await page.getByTestId("c-nav-3").click()
  await expect(page.getByTestId(`c-entry-${today}`)).toContainText("3")
  await expect(page.locator("[data-testid^=c-entry-20]")).toHaveCount(15)
  await page.getByTestId("c-go-moodchart").click()
  await expect(root).toHaveAttribute("data-screen", "moodchart")
  expect(await num(page, "c-donut", "data-total")).toBe(moods0 + 1)
  await expect(page.getByTestId("c-donut").locator("text").first()).toBeVisible()
  await shot(page, "c", "mood-chart")
  await page.getByTestId("screen-back").click()

  await page.getByTestId("c-go-trends").click()
  await expect(root).toHaveAttribute("data-screen", "trends")
  await expect(page.getByTestId("c-most-common")).toBeVisible()
  await page.getByTestId("c-graph").click()
  await expect(page.getByTestId("c-graph-list").getByTestId("placeholder")).toBeVisible()
  await shot(page, "c", "trends-dropdown")
  await page.getByTestId("c-graph").click()
  await shot(page, "c", "trends")
  await page.getByTestId("c-moods").click()
  await page.getByTestId("c-moods-opt-2").click()
  expect(await page.locator("[data-testid^=c-donut-slice-]").count()).toBeLessThanOrEqual(1)
  await shot(page, "c", "trends-filtered")
  await page.getByTestId("screen-back").click()

  await page.getByTestId("c-go-urges").click()
  await expect(root).toHaveAttribute("data-screen", "urges")
  const urgePoints = (await page.getByTestId("c-line").getAttribute("data-points"))!.split(",")
  expect(urgePoints).toHaveLength(days0 + 1)
  expect(urgePoints[urgePoints.length - 1]).toBe("3")
  await shot(page, "c", "urges-per-day")
  await page.getByTestId("c-seg-1").click()
  expect(((await page.getByTestId("c-line").getAttribute("data-points")) ?? "").endsWith(",6")).toBe(true)
  await shot(page, "c", "avg-intensity")
  await page.getByTestId("screen-back").click()

  await page.getByTestId("c-go-intensity").click()
  await expect(root).toHaveAttribute("data-screen", "intensity")
  await expect(page.getByTestId("c-trend-value")).toHaveText(/^\d+\.\d$/)
  await shot(page, "c", "intensity")
  await page.getByTestId("screen-back").click()

  await page.getByTestId("c-go-insights").click()
  await expect(root).toHaveAttribute("data-screen", "insights")
  await expect(page.getByTestId("c-insights").locator("li")).toHaveCount(7)
  await shot(page, "c", "insights")
  await page.getByTestId("screen-back").click()

  // other tabs belong to other tools
  await page.getByTestId("c-nav-1").click()
  await expect(page.getByText(/another tool/)).toBeVisible()
  await shot(page, "c", "stats-tab")

  // clearing the example leaves only the entry just made
  await page.getByTestId("c-nav-3").click()
  await page.getByTestId("example-clear").click()
  await expect(page.locator("[data-testid^=c-entry-20]")).toHaveCount(1)
  expect(errors).toEqual([])
})

test("copy D: six-tile panel, strength and feeling, context, save, log", async ({ page }) => {
  const errors = await open(page, "d")
  const root = screenOf(page, "d")
  await expect(root).toHaveAttribute("data-screen", "panel")
  await expect(page.locator("[data-testid^=tile-]")).toHaveCount(6)
  await shot(page, "d", "panel")

  await page.getByTestId("tile-overcame").click()
  await expect(page.getByTestId("strength")).toBeVisible()
  await expect(page.getByTestId("next")).toBeDisabled()
  await page.getByTestId("strength-slider").fill("7")
  await expect(page.getByTestId("strength-value")).toHaveText("7")
  await page.getByTestId("feeling-2").click()
  await shot(page, "d", "strength-feeling")
  await page.getByTestId("next").click()
  await expect(page.getByTestId("context")).toBeVisible()
  await expect(page.getByTestId("next")).toBeDisabled()
  await page.getByTestId("context-1").click()
  await shot(page, "d", "context")
  await page.getByTestId("next").click()
  await expect(root).toHaveAttribute("data-screen", "saved")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "d", "saved")

  await page.getByTestId("d-saved-log").click()
  await expect(root).toHaveAttribute("data-screen", "history")
  await expect(page.getByTestId("d-log-row")).toHaveCount(15)
  await expect(page.getByTestId("d-log-row").first()).toContainText("7")
  await expect(page.getByTestId("placeholder").first()).toBeVisible()
  await shot(page, "d", "log")
  await page.getByTestId("screen-back").click()

  // "I smoked" is a normal log entry too
  await page.getByTestId("tile-smoked").click()
  await page.getByTestId("feeling-6").click()
  await page.getByTestId("next").click()
  await page.getByTestId("context-0").click()
  await page.getByTestId("next").click()
  await page.getByTestId("d-saved-log").click()
  await expect(page.getByTestId("d-log-row")).toHaveCount(16)
  await expect(page.getByTestId("d-log-row").first()).toHaveAttribute("data-mode", "smoked")
  await page.getByTestId("screen-back").click()

  // the four help tiles belong to another tool
  await page.getByTestId("tile-breathe").click()
  await expect(root).toHaveAttribute("data-screen", "other")
  await shot(page, "d", "other-tool")
  await page.getByTestId("back").click()

  await page.getByTestId("example-clear").click()
  await page.getByTestId("d-to-log").click()
  await expect(page.getByTestId("d-log-row")).toHaveCount(2)
  expect(errors).toEqual([])
})

test("copy E: trigger donut with category tabs, add a craving, history, diary", async ({ page }) => {
  const errors = await open(page, "e")
  const root = screenOf(page, "e")
  await expect(root).toHaveAttribute("data-screen", "stats")
  const total0 = await num(page, "e-donut", "data-total")
  expect(total0).toBeGreaterThan(10)
  await expect(page.getByTestId("e-cat-name")).toHaveText("Mixed")
  await expect(page.locator("[data-testid^=e-cat-]")).toHaveCount(8)
  await shot(page, "e", "trigger-stats")

  // category tabs filter the donut
  await page.getByTestId("e-cat-1").click()
  await expect(page.getByTestId("e-cat-name")).toHaveText("Feelings")
  for (const key of ["4", "5", "6", "7", "8", "9", "10", "11"]) await expect(page.getByTestId(`e-donut-slice-${key}`)).toHaveCount(0)
  await shot(page, "e", "feelings")
  await page.getByTestId("e-cat-4").click()
  await expect(page.getByTestId("e-donut")).toHaveAttribute("data-total", "0")
  await shot(page, "e", "personal-empty")
  await page.getByTestId("e-cat-0").click()

  // add a craving with two triggers: the donut total rises by two
  await page.getByTestId("e-add").click()
  await expect(root).toHaveAttribute("data-screen", "add")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await expect(page.getByTestId("e-add-save")).toBeDisabled()
  expect(await page.getByTestId("placeholder").count()).toBeGreaterThanOrEqual(6)
  await shot(page, "e", "add-craving")
  await page.getByTestId("e-pick-7").click()
  await page.getByTestId("e-pick-10").click()
  await shot(page, "e", "add-craving-picked")
  await page.getByTestId("e-add-save").click()
  await expect(root).toHaveAttribute("data-screen", "stats")
  expect(await num(page, "e-donut", "data-total")).toBe(total0 + 2)

  // percent with one decimal
  const labels = await page.locator("[data-testid^=e-donut-slice-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-value")))
  expect(labels.length).toBeGreaterThan(3)
  for (const l of labels) expect(l).toMatch(/^\d+\.\d%$/)

  // history lists the new craving first
  await page.getByTestId("e-tab-1").click()
  await expect(root).toHaveAttribute("data-screen", "history")
  await expect(page.getByTestId("e-history-row").first()).toContainText("Driving, Alcohol")
  await shot(page, "e", "history")

  // diary: list, menu, new entry
  await page.getByTestId("e-switch-1").click()
  await expect(root).toHaveAttribute("data-screen", "diary")
  await expect(page.getByTestId("e-note")).toHaveCount(3)
  await shot(page, "e", "diary")
  await page.getByTestId("e-menu").click()
  await shot(page, "e", "diary-menu")
  await page.getByTestId("e-menu-add").click()
  await expect(root).toHaveAttribute("data-screen", "new")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await page.getByTestId("e-mood-smile").click()
  await page.getByTestId("e-title").fill("Good morning")
  await page.getByTestId("e-body").fill("Woke up rested and had no urge at all.")
  await shot(page, "e", "new-entry")
  await page.getByTestId("e-note-save").click()
  await expect(root).toHaveAttribute("data-screen", "diary")
  await expect(page.getByTestId("e-note")).toHaveCount(4)
  await expect(page.getByTestId("e-note").first()).toContainText("Good morning")

  // the relapse assistant was only in a listing
  await page.getByTestId("e-switch-2").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "e", "relapse-assistant")
  await page.getByTestId("screen-back").click()

  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("e-donut")).toHaveAttribute("data-total", "2")
  expect(errors).toEqual([])
})
