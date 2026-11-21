/**
 * THE IMPROVED HEALTH TIMELINE (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: set a quit date (and the example data), header day and count, every
 * card with its band, marker and sources on tap, the six-week strip, the body-recovery line, the
 * addiction switcher. State lives in the browser (`quit-lab-v1`); nothing is written to the
 * database. Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/timeline/shots-ours/best")
const SYMPTOMS = ["irritable", "anxious", "low-mood", "brain-fog", "restless", "sleep", "cue-craving"]
const URL = "/quit/lab/timeline/best?preview=1"

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

const dateKey = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Opens the page with the quit date `daysAgo` days back already stored (day = daysAgo + 1). */
async function openAt(page: Page, daysAgo: number) {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo).getTime()
  await page.addInitScript((s) => {
    try {
      if (!localStorage.getItem("quit-lab-v1")) localStorage.setItem("quit-lab-v1", JSON.stringify({ "timeline/best/setup": { startMs: s, seeded: 0 } }))
    } catch {
      // storage blocked: the test fails on the first expect
    }
  }, start)
  await page.goto(URL)
  await expect(page.getByTestId("best-header")).toBeVisible()
}

test("set a quit date: header day and count, cards with band, marker and sources, strip, recovery line", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  expect((await page.goto(URL))?.status()).toBe(200)
  await expect(page.getByTestId("setup-choice")).toBeVisible()
  await shot(page, "setup")
  await page.getByTestId("setup-own-btn").click()
  await page.getByTestId("setup-startMs").fill(dateKey(11))
  await shot(page, "setup-date")
  await page.getByTestId("setup-save").click()

  // day 12 (quit date is day 1), nothing past its range yet
  await expect(page.getByTestId("best-day")).toHaveText("12")
  await expect(page.getByTestId("best-count")).toHaveAttribute("data-past", "0")
  await expect(page.getByTestId("best-count")).toHaveAttribute("data-total", "6")
  await expect(page.getByTestId("best-count")).toContainText("0 of 6 symptoms are past the end")
  await shot(page, "day-12-top")

  for (const s of SYMPTOMS) {
    await expect(page.getByTestId(`card-${s}`)).toBeVisible()
    await expect(page.getByTestId(`marker-${s}`)).toHaveAttribute("data-day", "12")
  }
  // a ranged card: peak window, fading range, marker, the data file's sentence
  const irritable = page.getByTestId("card-irritable")
  await expect(irritable.getByTestId("band-peak-irritable")).toBeVisible()
  await expect(irritable.getByTestId("band-gone-irritable")).toBeVisible()
  await expect(irritable).toContainText("Short temper")
  await expect(irritable).toContainText("Gone within 10 days to 4 weeks, depending on the study.")
  await expect(irritable).toContainText("Peak window: days 1 to 7.")
  await expect(irritable).toContainText("Gone between day 10 and day 28 in the studies. The day-10 study measured overall bad mood, not this feeling alone.")
  await expect(page.getByTestId("card-restless")).toContainText("Gone between day 10 and day 28 in the studies.")
  await expect(page.getByTestId("card-restless")).not.toContainText("overall bad mood")
  await expect(page.getByTestId("phase-irritable")).toHaveText("You are on day 12. That is inside the range where studies saw it gone.")
  // sleep says what the diary study saw
  await expect(page.getByTestId("card-sleep")).toContainText("A diary study saw no clear change.")
  await expect(page.getByTestId("card-sleep")).toContainText("Gone between day 14 and day 28 in a review.")
  // cue craving: open-ended band, no peak, no end
  const cue = page.getByTestId("card-cue-craving")
  await expect(cue.getByTestId("band-open-cue-craving")).toBeVisible()
  await expect(cue.getByTestId("band-peak-cue-craving")).toHaveCount(0)
  await expect(cue).toContainText("Cravings set off by cues")
  await expect(cue).toContainText("Tested up to day 35. Stronger then than at day 7 or 14 on some measures. Not tested later, so no end known.")
  await expect(cue.getByTestId("band-tested-cue-craving")).toBeVisible()
  await expect(page.getByTestId("course-note")).toContainText("almost all of cigarette smokers")

  // sources on tap
  await irritable.getByRole("button", { name: "Source" }).click()
  await expect(irritable).toContainText("Hughes JR (2007)")
  await expect(irritable).toContainText("Shiffman S")
  await shot(page, "day-12-sources-open")

  // six-week strip: week 1 shaded, his day marked
  const strip = page.getByTestId("strip")
  await strip.scrollIntoViewIfNeeded()
  await expect(strip.locator("[data-peak=true]")).toHaveCount(7)
  await expect(strip.locator("[data-today=true]")).toHaveCount(1)
  await expect(page.getByTestId("strip-day-12")).toHaveAttribute("aria-current", "date")
  await expect(page.getByTestId("strip-day-3")).toHaveAttribute("data-peak", "true")
  await expect(page.getByTestId("strip-day-8")).toHaveAttribute("data-peak", "false")
  await shot(page, "day-12-strip")

  // body recovery: one line, no unsourced items
  await expect(page.getByTestId("recovery-coming")).toHaveText("content coming: checked body-recovery timings")
  const text = await page.locator("body").innerText()
  expect(text).not.toMatch(/\d\s?%/)
  expect(text).not.toContain("!")
  await page.getByTestId("recovery-coming").scrollIntoViewIfNeeded()
  await shot(page, "day-12-recovery")
  expect(errors).toEqual([])

  // the date survives a reload
  await page.reload()
  await expect(page.getByTestId("best-day")).toHaveText("12")
})

test("day 3 sits inside every peak window; before the quit date there is no marker", async ({ page }) => {
  await openAt(page, 2)
  await expect(page.getByTestId("best-day")).toHaveText("3")
  await expect(page.getByTestId("best-count")).toHaveAttribute("data-past", "0")
  for (const s of ["irritable", "anxious", "low-mood", "brain-fog", "restless", "sleep"]) {
    await expect(page.getByTestId(`band-${s}`)).toHaveAttribute("data-phase", "peak")
  }
  await expect(page.getByTestId("band-cue-craving")).toHaveAttribute("data-phase", "open-within")
  await shot(page, "day-3-top")
  await page.getByTestId("strip").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("strip-day-3")).toHaveAttribute("data-today", "true")
  await shot(page, "day-3-strip")

  await page.getByTestId("start-over").click()
  await page.getByTestId("setup-own-btn").click()
  await page.getByTestId("setup-startMs").fill(dateKey(-4))
  await page.getByTestId("setup-save").click()
  await expect(page.getByTestId("best-ahead")).toHaveText("Your quit date is 4 days ahead.")
  await expect(page.getByTestId("marker-irritable")).toHaveCount(0)
  await shot(page, "before-quit-date")
})

test("day 40: six of six past their range, cue craving past the last tested day, marker at the edge", async ({ page }) => {
  await openAt(page, 39)
  await expect(page.getByTestId("best-day")).toHaveText("40")
  await expect(page.getByTestId("best-count")).toContainText("6 of 6 symptoms are past the end")
  for (const s of ["irritable", "sleep"]) await expect(page.getByTestId(`band-${s}`)).toHaveAttribute("data-phase", "past-end")
  await expect(page.getByTestId("band-cue-craving")).toHaveAttribute("data-phase", "open-past")
  await expect(page.getByTestId("phase-cue-craving")).toContainText("That is past the last day tested.")
  await shot(page, "day-40-top")
  await page.getByTestId("strip").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("strip-day-40")).toHaveAttribute("data-today", "true")
  await shot(page, "day-40-strip")
})

test("example data and day 12 on a desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(URL)
  await page.getByTestId("setup-seed").click()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  await expect(page.getByTestId("best-day")).toHaveText(/^2[45]$/) // seed = now - 23d 4h 23m: calendar day 24, or 25 between local 00:00 and 04:23
  await shot(page, "desktop-example", 1280)
})

test("switching to weed, porn and alcohol shows content coming and does not crash", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await openAt(page, 11)
  for (const a of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${a}`).click()
    await expect(page.getByTestId("content-coming")).toHaveText("content coming")
    await expect(page.getByTestId("best-header")).toHaveCount(0)
    await shot(page, `switch-${a}`)
  }
  await page.getByTestId("switch-nicotine").click()
  await expect(page.getByTestId("best-day")).toHaveText("12")
  expect(errors).toEqual([])
})
