/**
 * THE IMPROVED QUIT DATE AND PLAN (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: goal first, near-date chips, the far-date line with its basis, a
 * break with a length and a live countdown, the result (date, days to go, calendar links, checklist,
 * ladder, runs), the "not ready" path and the addiction switcher. State lives in the browser
 * (`quit-lab-v1`); nothing is written to the database. Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/quitdate/shots-ours/best")
const URL = "/quit/lab/quitdate/best?preview=1"

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

/** A date key `offset` days from today (negative: in the past). */
const dateKey = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function open(page: Page) {
  expect((await page.goto(URL))?.status()).toBe(200)
  await expect(page.getByTestId("step-goal")).toBeVisible()
}

test("stop for good: next Monday, result with date, days to go, calendar, checklist, ladder", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page)
  await shot(page, "goal")
  // goal first; the step-down line sits under "stop for good" with its basis on tap
  await expect(page.getByTestId("goal-next")).toBeDisabled()
  await page.getByTestId("goal-stop").click()
  await expect(page.getByTestId("ev-abrupt")).toContainText("No step-down path here.")
  await page.getByTestId("ev-abrupt-basis").click()
  await expect(page.getByTestId("ev-abrupt-detail")).toContainText("697")
  await page.getByTestId("ev-abrupt-detail").getByRole("button", { name: "Source" }).click()
  await expect(page.getByTestId("ev-abrupt-detail")).toContainText("Quitting smoking abruptly is more likely to lead to lasting abstinence than cutting down first")
  await shot(page, "goal-stop-basis")
  await page.getByTestId("goal-next").click()

  // near dates first, no "today" chip, no date pre-picked
  await expect(page.getByTestId("step-date")).toBeVisible()
  await expect(page.getByTestId("date-chosen")).toHaveText("No date picked yet.")
  await expect(page.getByRole("radio", { name: /today/i })).toHaveCount(0)
  for (const c of ["in3", "weekend", "monday", "in14"]) await expect(page.getByTestId(`chip-${c}`)).toBeVisible()
  await shot(page, "date")
  await page.getByTestId("chip-monday").click()
  const monday = await page.getByTestId("chip-monday").getAttribute("data-date")
  expect(new Date(`${monday}T12:00:00`).getDay()).toBe(1)
  await expect(page.getByTestId("date-chosen")).toContainText("Monday")
  await expect(page.getByTestId("far-warning")).toHaveCount(0)
  await shot(page, "date-monday")
  await page.getByTestId("date-next").click()

  // result
  await expect(page.getByTestId("result")).toHaveAttribute("data-goal", "stop")
  await expect(page.getByTestId("result-date")).toContainText("Monday")
  const days = Number(await page.getByTestId("result-days").getAttribute("data-days"))
  expect(days).toBeGreaterThanOrEqual(1)
  expect(days).toBeLessThanOrEqual(7)
  await expect(page.getByTestId("result-days")).toContainText("to go")
  const google = await page.getByTestId("cal-google").getAttribute("href")
  expect(google).toContain("calendar.google.com/calendar/render")
  expect(google).toContain(`dates=${monday!.replace(/-/g, "")}/`)
  expect(await page.getByTestId("cal-ics").getAttribute("href")).toContain("BEGIN%3AVCALENDAR")
  await expect(page.getByTestId("cal-ics")).toHaveAttribute("download", "quit-date.ics")
  await shot(page, "result-top")

  // checklist from the five plan steps, ticks stay
  await page.getByTestId("checklist").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("checklist-count")).toHaveText("0 of 5 done")
  await expect(page.getByTestId("check-0")).toContainText("Name what it does for you")
  await page.getByTestId("check-0").click()
  await expect(page.getByTestId("checklist-count")).toHaveText("1 of 5 done")
  await shot(page, "result-checklist")

  // ladder: first goal next, counted from the date
  await page.getByTestId("ladder").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("ladder-countdown")).toHaveAttribute("data-next", "d1")
  await expect(page.getByTestId("ladder-countdown")).toHaveText(/^\d+D \d+H \d+M \d+S$/)
  for (const r of ["d1", "d3", "w1", "w2", "m1"]) await expect(page.getByTestId(`rung-${r}`)).toHaveAttribute("data-reached", "false")
  await shot(page, "result-ladder")
  await page.getByTestId("runs").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("runs-before")).toContainText("Your first run starts")
  await shot(page, "result-runs-before")

  const text = await page.locator("body").innerText()
  expect(text).not.toContain("!")
  expect(errors).toEqual([])

  // the plan survives a reload
  await page.reload()
  await expect(page.getByTestId("result-date")).toContainText("Monday")
  await expect(page.getByTestId("checklist-count")).toHaveText("1 of 5 done")
})

test("a date 20 days out shows the far-date line (past 7 days); its basis and quotes are one tap away", async ({ page }) => {
  await open(page)
  await page.getByTestId("goal-stop").click()
  await page.getByTestId("goal-next").click()
  await page.getByTestId("date-input").fill(dateKey(7))
  await expect(page.getByTestId("far-warning")).toHaveCount(0)
  await page.getByTestId("date-input").fill(dateKey(8))
  await expect(page.getByTestId("far-warning")).toBeVisible()
  await page.getByTestId("date-input").fill(dateKey(20))
  const warn = page.getByTestId("far-warning")
  await expect(warn).toContainText("In one large study of smokers, those who picked a later quit date were less often smoke-free 6 months on: about 40% with a date in week 1, 23% in week 5.")
  await expect(warn).toContainText("A second study of smokers also found later dates went with less success.")
  await expect(page.getByTestId("ev-far-detail")).toHaveCount(0)
  await shot(page, "date-far-warning")
  await page.getByTestId("ev-far-basis").click()
  const detail = page.getByTestId("ev-far-detail")
  await expect(detail).toContainText("1,848")
  await expect(detail).toContainText("the date itself was not randomized")
  await detail.getByRole("button", { name: "Source" }).click()
  await expect(detail).toContainText("Anesi GL")
  await expect(detail).toContainText("39.6, 22.6, 10.9, and 4.3%")
  await shot(page, "date-far-basis")
  // the date itself is still allowed
  await page.getByTestId("date-next").click()
  await expect(page.getByTestId("result-days")).toHaveAttribute("data-days", "20")
  await expect(page.getByTestId("result-days")).toHaveText("20 days to go.")
  await shot(page, "result-far")
})

test("a break of 2 weeks: length step, end date, live countdown", async ({ page }) => {
  await open(page)
  await page.getByTestId("goal-break").click()
  await page.getByTestId("goal-next").click()
  await page.getByTestId("chip-in3").click()
  await page.getByTestId("date-next").click()
  await expect(page.getByTestId("step-length")).toBeVisible()
  await expect(page.getByTestId("length-next")).toBeDisabled()
  for (const l of ["w1", "w2", "w4", "set"]) await expect(page.getByTestId(`len-${l}`)).toBeVisible()
  await shot(page, "length")
  await page.getByTestId("len-w2").click()
  await expect(page.getByTestId("end-chosen")).toContainText("Ends")
  await shot(page, "length-2-weeks")
  await page.getByTestId("length-next").click()

  await expect(page.getByTestId("result")).toHaveAttribute("data-goal", "break")
  const first = await page.getByTestId("break-countdown").innerText()
  expect(first).toMatch(/^1[67]D \d+H \d+M \d+S$/)
  await expect(page.getByTestId("break-countdown")).not.toHaveText(first, { timeout: 5000 })
  expect(await page.getByTestId("cal-google").getAttribute("href")).toContain("text=Break%20ends")
  await shot(page, "result-break")

  // a set end date before the start is refused
  await page.getByTestId("plan-change").click()
  await page.getByTestId("goal-break").click()
  await page.getByTestId("goal-next").click()
  await page.getByTestId("chip-in14").click()
  await page.getByTestId("date-next").click()
  await page.getByTestId("len-set").click()
  await page.getByTestId("end-input").fill(dateKey(5))
  await expect(page.getByTestId("end-error")).toBeVisible()
  await expect(page.getByTestId("length-next")).toBeDisabled()
  await page.getByTestId("end-input").fill(dateKey(30))
  await expect(page.getByTestId("length-next")).toBeEnabled()
  await shot(page, "length-set-date")
})

test("not ready yet: step 1 of his plan, a nudge, then a date", async ({ page }) => {
  await open(page)
  await page.getByTestId("goal-later").click()
  await page.getByTestId("goal-next").click()
  const later = page.getByTestId("step-later")
  await expect(later).toBeVisible()
  await expect(page.getByTestId("later-step")).toContainText("Name what it does for you")
  await expect(page.getByTestId("later-step")).toContainText("Still using? Don’t quit yet.")
  await expect(later).toContainText("Pick a date when you are ready.")
  await shot(page, "not-ready")
  await page.getByTestId("later-pick").click()
  await expect(page.getByTestId("step-date")).toBeVisible()
  await expect(page.getByTestId("date-next")).toBeDisabled()
})

test("runs: a date in the past, a slip keeps the past run and the total", async ({ page }) => {
  await open(page)
  await page.getByTestId("goal-stop").click()
  await page.getByTestId("goal-next").click()
  await page.getByTestId("date-input").fill(dateKey(-9))
  await page.getByTestId("date-next").click()
  await page.getByTestId("runs").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("runs-current")).toHaveAttribute("data-value", "10")
  await expect(page.getByTestId("runs-total")).toHaveAttribute("data-value", "10")
  await expect(page.getByTestId("rung-w1")).toHaveAttribute("data-reached", "true")
  await expect(page.getByTestId("rung-w2")).toHaveAttribute("data-reached", "false")
  await expect(page.getByTestId("ladder-countdown")).toHaveAttribute("data-next", "w2")
  await shot(page, "runs-one-run")
  await page.getByTestId("slip").click()
  await expect(page.getByTestId("slip-note")).toContainText("Every clear day stays counted")
  await expect(page.getByTestId("runs-total")).toHaveAttribute("data-value", "9")
  await expect(page.getByTestId("runs-best")).toHaveAttribute("data-value", "9")
  await expect(page.getByTestId("runs-current")).toHaveAttribute("data-value", "0")
  await expect(page.getByTestId("past-runs").locator("li")).toHaveCount(1)
  await expect(page.getByTestId("past-runs")).toContainText("9 days")
  await shot(page, "runs-after-slip")
  await page.reload()
  await expect(page.getByTestId("past-runs").locator("li")).toHaveCount(1)
})

test("switcher: weed and alcohol tag smoker lines, porn hides them, nothing crashes", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page)
  await expect(page.getByTestId("switch-nicotine")).toHaveAttribute("aria-checked", "true")
  for (const id of ["weed", "alcohol", "porn"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId(`switch-${id}`)).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("step-goal")).toBeVisible()
    await page.getByTestId("goal-stop").click()
    if (id === "porn") await expect(page.getByTestId("ev-abrupt")).toHaveCount(0)
    else {
      await expect(page.getByTestId("ev-abrupt")).toBeVisible()
      await expect(page.getByTestId("ev-abrupt-tag")).toHaveText("Studied in smokers")
    }
    await shot(page, `switch-${id}-goal`)
    await page.getByTestId("goal-next").click()
    await page.getByTestId("date-input").fill(dateKey(25))
    if (id === "porn") await expect(page.getByTestId("far-warning")).toHaveCount(0)
    else await expect(page.getByTestId("ev-far-tag")).toHaveText("Studied in smokers")
    await shot(page, `switch-${id}-far`)
    await page.getByTestId("date-next").click()
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("ladder")).toBeVisible()
    await shot(page, `switch-${id}-result`)
    await page.getByTestId("plan-change").click()
  }
  expect(errors).toEqual([])
})

test("desktop width 1280: no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page)
  await page.getByTestId("goal-stop").click()
  await page.getByTestId("goal-next").click()
  await page.getByTestId("chip-in14").click()
  await page.getByTestId("date-next").click()
  await expect(page.getByTestId("result")).toBeVisible()
  await shot(page, "desktop-result", 1280)
})
