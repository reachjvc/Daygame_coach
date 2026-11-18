/**
 * THE IMPROVED DAILY CHECK-IN (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: morning (pledge, forecast), evening (clear or slipped, hard, urges, feelings,
 * note), the month calendar in its four modes with a day summary, "fill in yesterday", the example data, pattern
 * lines with both day counts, reminders, and the addiction switcher. State lives in the browser
 * (`quit-lab-v1`); nothing is written to the database. Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/checkin/shots-ours/best")
const URL = "/quit/lab/checkin/best?preview=1"

let n = 0
test.beforeAll(() => {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
})

async function shot(page: Page, name: string, width = 390) {
  n++
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
}

const dateKey = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function open(page: Page, own: boolean) {
  expect((await page.goto(URL))?.status()).toBe(200)
  await expect(page.getByTestId("checkin-best")).toBeVisible()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  if (own) {
    await page.getByTestId("example-clear").click()
    await expect(page.getByTestId("example-bar")).toHaveCount(0)
  }
}

/** Every tap target in view is at least 44px tall. */
async function tapsBigEnough(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, input, textarea, [role=radio]")]
      .filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.height < 43.5
      })
      .map((el) => el.getAttribute("data-testid") ?? el.textContent),
  )
  expect(small).toEqual([])
}

test("morning, evening, month, yesterday, reminders on a phone", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page, true)
  await shot(page, "today-empty")
  await tapsBigEnough(page)
  await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "0")
  await expect(page.getByTestId("tab-today")).not.toContainText(/streak|points|rank|!/i)

  // morning: pledge, then forecast; Back on every step
  await page.getByTestId("morning-start").click()
  await expect(page.getByTestId("step-pledge")).toBeVisible()
  await page.getByTestId("pledge-input").fill("Today I stay clear.")
  await shot(page, "morning-pledge")
  await page.getByTestId("flow-next").click()
  await expect(page.getByTestId("step-forecast")).toBeVisible()
  await expect(page.getByTestId("forecast-5")).toContainText("Very hard")
  await expect(page.getByTestId("forecast-1")).toContainText("Easy")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("pledge-input")).toHaveValue("Today I stay clear.")
  await page.getByTestId("flow-next").click()
  await page.getByTestId("forecast-4").click()
  await tapsBigEnough(page)
  await shot(page, "morning-forecast")
  await page.getByTestId("flow-save").click()
  await expect(page.getByTestId("saved-line")).toBeVisible()
  await shot(page, "morning-saved")
  await page.getByTestId("done-back").click()
  await expect(page.getByTestId("morning-pledge")).toContainText("Today I stay clear.")
  await expect(page.getByTestId("morning-forecast")).toContainText("4 of 5")

  // evening: clear, hard 2, urges 1, feelings, note
  await page.getByTestId("evening-start").click()
  await expect(page.getByTestId("step-outcome")).toContainText("Did you smoke today?")
  await expect(page.getByTestId("flow-next")).toBeDisabled()
  await page.getByTestId("outcome-clear").click()
  await shot(page, "evening-outcome")
  await page.getByTestId("flow-next").click()
  await expect(page.getByTestId("hard-forecast")).toContainText("4 of 5")
  await page.getByTestId("hard-2").click()
  await shot(page, "evening-hard")
  await page.getByTestId("flow-next").click()
  await page.getByTestId("urges-1").click()
  await shot(page, "evening-urges")
  await page.getByTestId("flow-next").click()
  await expect(page.getByTestId("step-feelings")).toBeVisible()
  await page.getByTestId("feeling-craving").click()
  await page.getByTestId("feeling-proud").click()
  await expect(page.getByTestId("feeling-craving")).toHaveAttribute("aria-pressed", "true")
  await tapsBigEnough(page)
  await shot(page, "evening-feelings")
  await page.getByTestId("flow-next").click()
  await expect(page.getByTestId("note-privacy")).toContainText("Only on this phone")
  await page.getByTestId("note-input").fill("Walked after dinner.")
  await shot(page, "evening-note")
  await page.getByTestId("flow-save").click()
  await expect(page.getByTestId("done-summary")).toBeVisible()
  await expect(page.getByTestId("sum-1")).toHaveText("Clear day")
  await expect(page.getByTestId("sum-2")).toHaveText("Expected 4, it was 2, urges 1")
  await expect(page.getByTestId("sum-3")).toContainText("Cravings, Feeling proud")
  await expect(page.getByTestId("sum-note")).toContainText("Walked after dinner.")
  await shot(page, "day-saved")
  await page.getByTestId("done-back").click()
  await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "1")
  await expect(page.getByTestId("count-clear")).toHaveAttribute("data-n", "1")

  // fill in yesterday: a slip
  await expect(page.getByTestId("lookback-start")).toBeVisible()
  await shot(page, "today-with-lookback")
  await page.getByTestId("lookback-start").click()
  await expect(page.getByTestId("flow-evening")).toHaveAttribute("data-date", dateKey(-1))
  await page.getByTestId("outcome-slip").click()
  await expect(page.getByTestId("outcome-slip")).toContainText("Yes, I smoked")
  await shot(page, "yesterday-outcome")
  for (let i = 0; i < 4; i++) await page.getByTestId("flow-next").click()
  await page.getByTestId("flow-save").click()
  await expect(page.getByTestId("sum-1")).toHaveText("You smoked")
  await page.getByTestId("done-back").click()
  await expect(page.getByTestId("lookback-start")).toHaveCount(0)
  await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "2")
  await expect(page.getByTestId("count-clear")).toHaveAttribute("data-n", "1")

  // month: four modes, grey slip cell, day summary
  await page.getByTestId("ck-tab-1").click()
  const yesterday = dateKey(-1)
  const today = dateKey(0)
  if (yesterday.slice(0, 7) !== today.slice(0, 7)) await page.getByTestId("month-prev").click()
  await expect(page.getByTestId(`cell-${yesterday}`)).toHaveAttribute("data-state", "slip")
  await expect(page.getByTestId(`cell-${yesterday}`)).toHaveClass(/bg-muted/)
  await expect(page.getByTestId(`cell-${yesterday}`)).not.toHaveClass(/red/)
  await shot(page, "month-clear")
  await page.getByTestId("mode-1").click()
  await expect(page.getByTestId("grid")).toHaveAttribute("data-mode", "hard")
  await shot(page, "month-hard")
  await page.getByTestId("mode-2").click()
  await shot(page, "month-feelings")
  await page.getByTestId("mode-3").click()
  await shot(page, "month-notes")
  await page.getByTestId("mode-0").click()
  if (yesterday.slice(0, 7) !== today.slice(0, 7)) await page.getByTestId("month-next").click()
  await page.getByTestId(`cell-${today}`).click()
  await expect(page.getByTestId("day-summary")).toContainText("Clear day")
  await expect(page.getByTestId("day-summary")).toContainText("Expected 4, it was 2, urges 1")
  await shot(page, "month-day-summary")
  await page.getByTestId("month-prev").click()
  await page.getByTestId("month-next").click()
  await tapsBigEnough(page)

  // pattern: not yet
  await page.getByTestId("ck-tab-2").click()
  await expect(page.getByTestId("pattern-wait")).toContainText("14 check-ins")
  await expect(page.getByTestId("pattern-wait")).toContainText("You have 2.")
  await expect(page.getByTestId("pattern-own")).toContainText("not a study")
  await shot(page, "pattern-wait")

  // reminders
  await page.getByTestId("ck-tab-3").click()
  await expect(page.getByTestId("reminder-morning")).toHaveValue("08:00")
  await page.getByTestId("reminder-morning").fill("07:30")
  await page.getByTestId("reminder-evening").fill("22:15")
  await shot(page, "reminders")
  await page.reload()
  await page.getByTestId("ck-tab-3").click()
  await expect(page.getByTestId("reminder-morning")).toHaveValue("07:30")
  await expect(page.getByTestId("reminder-evening")).toHaveValue("22:15")
  expect(errors).toEqual([])
})

test("example data fills the month and shows pattern lines with both counts", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page, false)
  await shot(page, "example-today")
  await expect(page.getByTestId("lookback-start")).toBeVisible()
  await page.getByTestId("ck-tab-1").click()
  const d2 = dateKey(-2)
  if (d2.slice(0, 7) !== dateKey(0).slice(0, 7)) await page.getByTestId("month-prev").click()
  await expect(page.getByTestId(`cell-${d2}`)).not.toHaveAttribute("data-state", "none")
  await shot(page, "example-month")
  await page.getByTestId("ck-tab-2").click()
  await expect(page.getByTestId("pattern-own")).toContainText("only your own days")
  const first = page.getByTestId("pattern-line-0").locator("p")
  await expect(first).toContainText("On the 6 days you expected it to be hard, you slipped on 3; on the other 14 days, on 1.")
  await expect(first).toHaveAttribute("data-with-days", "6")
  await expect(first).toHaveAttribute("data-other-days", "14")
  const body = await page.getByTestId("tab-pattern").innerText()
  expect(body).not.toMatch(/%|percent|likely|!/i)
  await expect(page.getByTestId("pattern-line-1")).toContainText("urges were 4 or 5")
  await expect(page.getByTestId("tab-pattern")).toContainText('"Boredom"')
  await expect(page.getByTestId("pairs-line")).toContainText("Of 20 days with a forecast and a result")
  await shot(page, "example-pattern")
  // clear the example, then load it again
  await page.getByTestId("ck-tab-0").click()
  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "0")
  await page.getByTestId("example-load").click()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  expect(errors).toEqual([])
})

test("switching what he works on changes the wording and never crashes", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page, true)
  const words: Record<string, [string, string]> = {
    weed: ["Did you use today?", "Yes, I used"],
    porn: ["Did you watch today?", "Yes, I watched"],
    alcohol: ["Did you drink today?", "Yes, I drank"],
    nicotine: ["Did you smoke today?", "Yes, I smoked"],
  }
  for (const id of ["weed", "porn", "alcohol", "nicotine"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId(`switch-${id}`)).toHaveAttribute("aria-checked", "true")
    await page.getByTestId("evening-start").click()
    await expect(page.getByTestId("step-outcome")).toHaveText(words[id][0])
    await expect(page.getByTestId("outcome-slip")).toHaveText(words[id][1])
    if (id === "porn") await shot(page, "switch-porn")
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("tab-today")).toBeVisible()
  }
  expect(errors).toEqual([])
})

test("desktop width keeps the same screens", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await open(page, false)
  await page.getByTestId("ck-tab-1").click()
  await expect(page.getByTestId("grid")).toBeVisible()
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(DIR, "desktop-month.png"), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})
