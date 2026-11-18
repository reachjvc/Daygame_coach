/**
 * THE IMPROVED DAILY LESSONS (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: Today with the day -3 lesson, read, the exercise unlocks, a note, Done and the
 * plain saved line naming tomorrow's title, the day list with the done mark, a past day, sources on tap,
 * the belief card, thumbs, the reminder time, the lab "set day" control, and the addiction switcher.
 * State lives in the browser (`quit-lab-v1`); nothing is written to the database. Shots go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import nicotine from "@/src/quit/data/nicotine.json"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/lessons/shots-ours/best")
const URL = "/quit/lab/lessons/best?preview=1"
const lessons = nicotine.lessons as { day: number; title: string; beliefId: string }[]
const byDay = (d: number) => lessons.find((l) => l.day === d)!

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

async function tapsBigEnough(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, input, textarea, summary, [role=radio]")]
      .filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.height < 43.5
      })
      .map((el) => el.getAttribute("data-testid") ?? el.textContent),
  )
  expect(small).toEqual([])
}

test("the day -3 lesson: read, exercise, note, done, day list, past day", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  expect((await page.goto(URL))?.status()).toBe(200)
  await expect(page.getByTestId("lessons-best")).toBeVisible()

  // Today: the first lesson, its read time, locked exercise
  await expect(page.getByTestId("place")).toHaveText("You are on Day −3.")
  await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-3")
  await expect(page.getByTestId("lesson").getByRole("heading", { name: byDay(-3).title })).toBeVisible()
  await expect(page.getByTestId("read-time")).toHaveText(/^about \d+ min read$/)
  await expect(page.getByTestId("exercise-locked")).toBeVisible()
  await expect(page.getByTestId("note")).toBeDisabled()
  await expect(page.getByTestId("done-btn")).toBeDisabled()
  await expect(page.getByText("You can read any day again.").first()).toBeVisible()
  await tapsBigEnough(page)
  await shot(page, "today-locked")

  // read -> exercise unlocks -> note -> done
  await page.getByTestId("read-btn").click()
  await expect(page.getByTestId("exercise-locked")).toHaveCount(0)
  await expect(page.getByTestId("note")).toBeEnabled()
  await page.getByTestId("note").fill("Friday the 20th")
  await shot(page, "today-exercise-open")
  await page.getByTestId("done-btn").click()
  await expect(page.getByTestId("saved-line")).toHaveText(`Saved. Tomorrow: ${byDay(-2).title}.`)
  await expect(page.getByTestId("saved-note")).toHaveText("Friday the 20th")
  await shot(page, "today-saved")

  // thumbs
  await page.getByTestId("thumb-more").click()
  await expect(page.getByTestId("thumb-more")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("thumb-less").click()
  await expect(page.getByTestId("thumb-more")).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("thumb-less")).toHaveAttribute("aria-pressed", "true")

  // reminder time
  await page.getByTestId("reminder-time").fill("08:30")
  await expect(page.getByTestId("reminder-time")).toHaveValue("08:30")

  // state survives a reload
  await page.reload()
  await expect(page.getByTestId("reminder-time")).toHaveValue("08:30")
  await expect(page.getByTestId("thumb-less")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "today-after-reload")

  // day list with the done mark
  await page.getByRole("tab", { name: "All days" }).click()
  await expect(page.getByTestId("day-list").getByRole("button")).toHaveCount(lessons.length)
  await expect(page.getByTestId("day-row--3")).toHaveAttribute("data-done", "true")
  await expect(page.getByTestId("day-row--3").getByTestId("done-mark")).toBeVisible()
  await expect(page.getByTestId("day-row-1")).toHaveAttribute("data-done", "false")
  await tapsBigEnough(page)
  await shot(page, "day-list")

  // open a past (other) day, sources on tap, belief card, back
  await page.getByTestId("day-row-1").click()
  await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "1")
  await expect(page.getByTestId("exercise-locked")).toBeVisible()
  await expect(page.getByRole("link", { name: /source/i })).toHaveCount(0)
  await page.getByRole("button", { name: "Source", exact: true }).click()
  await expect(page.getByRole("link", { name: /source/i }).first()).toBeVisible()
  await shot(page, "lesson-sources")
  await page.getByTestId("belief-link").click()
  await expect(page.getByTestId("belief-card")).toHaveAttribute("data-belief", byDay(1).beliefId)
  await shot(page, "belief-card")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "1")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("day-list")).toBeVisible()

  // the done day can be opened again and shows its note
  await page.getByTestId("day-row--3").click()
  await expect(page.getByTestId("saved-note")).toHaveText("Friday the 20th")
  expect(errors).toEqual([])
})

test("set day 10 from the lab control; days past the last lesson; no crash", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(URL)
  await expect(page.getByTestId("lab-tag")).toHaveText("lab only")
  await page.getByTestId("set-day-input").fill("10")
  await expect(page.getByTestId("place")).toHaveText("You are on Day 10.")
  await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "10")
  await page.getByTestId("read-btn").click()
  await page.getByTestId("done-btn").click()
  await expect(page.getByTestId("saved-line")).toHaveText(`Saved. Tomorrow: ${byDay(11).title}.`)
  await shot(page, "day-10")

  await page.getByTestId("set-day-input").fill("40")
  await expect(page.getByTestId("place")).toHaveText("You are on Day 40.")
  await expect(page.getByTestId("no-lesson")).toHaveText("No new lesson today.")
  await shot(page, "after-last-lesson")

  await page.getByTestId("set-day-input").fill("0")
  await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-1")

  // switcher: other addictions say "content coming" and do not crash
  for (const x of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${x}`).click()
    await expect(page.getByTestId("content-coming")).toHaveText("content coming")
    await expect(page.getByTestId("lesson")).toHaveCount(0)
  }
  await shot(page, "content-coming")
  await page.getByTestId("switch-nicotine").click()
  await expect(page.getByTestId("lesson")).toBeVisible()

  // wide screen
  await page.setViewportSize({ width: 1280, height: 900 })
  await shot(page, "wide", 1280)
  expect(errors).toEqual([])
})
