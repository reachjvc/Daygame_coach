/**
 * THE IMPROVED CRAVING AND SLIP DIARY (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: log in two taps, the tip card, a log with every optional part, a past craving
 * with a time, the history day rows, edit and delete, patterns (the line below 5 entries, counts below 10,
 * example data with every bar list), and the addiction switcher. State lives in the browser (`quit-lab-v1`);
 * nothing is written to the database. Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/diary/shots-ours/best")
const URL = "/quit/lab/diary/best?preview=1"

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
  await expect(page.getByTestId("diary-best")).toBeVisible()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  if (own) {
    await page.getByTestId("example-clear").click()
    await expect(page.getByTestId("example-bar")).toHaveCount(0)
  }
}

/** Every tap target in view is at least 44px tall. */
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

/** Strength, situation, save: the quick log. */
async function quick(page: Page, strength: number, situation: string) {
  await page.getByTestId("log-now").click()
  await page.getByTestId(`strength-${strength}`).click()
  await page.getByTestId(`situation-${situation}`).click()
  await page.getByTestId("save-entry").click()
  await expect(page.getByTestId("diary-saved")).toBeVisible()
}

test("log, tip, optional parts, past craving, history, edit, delete on a phone", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page, true)
  await shot(page, "history-empty")
  await tapsBigEnough(page)
  await expect(page.getByTestId("history-empty")).toBeVisible()
  await expect(page.getByTestId("diary-best")).not.toContainText(/streak|points|rank|!/i)

  // two taps, then save
  await page.getByTestId("log-now").click()
  await expect(page.getByTestId("save-entry")).toBeDisabled()
  await page.getByTestId("strength-6").click()
  await page.getByTestId("situation-stress").click()
  await expect(page.getByTestId("save-entry")).toBeEnabled()
  await shot(page, "form-quick")
  await tapsBigEnough(page)
  await page.getByTestId("save-entry").click()

  // the tip card for that situation, then the next idea
  await expect(page.getByTestId("tip-card")).toBeVisible()
  const first = await page.getByTestId("tip-text").innerText()
  expect(first.length).toBeGreaterThan(5)
  await shot(page, "tip")
  await tapsBigEnough(page)
  await page.getByTestId("tip-next").click()
  expect(await page.getByTestId("tip-text").innerText()).not.toBe(first)
  await page.getByTestId("saved-done").click()

  // every optional part
  await page.getByTestId("log-now").click()
  await page.getByTestId("strength-8").click()
  await page.getByTestId("situation-coffee").click()
  await page.getByTestId("more").locator("summary").click()
  await page.getByTestId("feeling-craving").click()
  await page.getByTestId("feeling-anxious").click()
  await page.getByTestId("move-water").click()
  await page.getByTestId("used-no").click()
  await expect(page.getByTestId("used-no")).toHaveAttribute("aria-checked", "true")
  await shot(page, "form-all-parts")
  await tapsBigEnough(page)
  await page.getByTestId("save-entry").click()
  await expect(page.getByTestId("diary-saved")).toBeVisible()
  await page.getByTestId("saved-done").click()

  // a past craving with a time, marked as a slip
  await page.getByTestId("log-past").click()
  await expect(page.getByTestId("past-date")).toBeVisible()
  await page.getByTestId("past-date").fill(dateKey(-1))
  await page.getByTestId("past-time").fill("08:30")
  await page.getByTestId("strength-4").click()
  await page.getByTestId("situation-bored").click()
  await page.getByTestId("more").locator("summary").click()
  await page.getByTestId("used-yes").click()
  await shot(page, "form-past")
  await page.getByTestId("save-entry").click()
  await page.getByTestId("saved-done").click()

  // a time that has not happened yet cannot be saved
  await page.getByTestId("log-past").click()
  await page.getByTestId("past-date").fill(dateKey(0))
  await page.getByTestId("past-time").fill("23:59")
  await page.getByTestId("strength-2").click()
  await page.getByTestId("situation-bored").click()
  const nowH = new Date().getHours() * 60 + new Date().getMinutes()
  if (nowH < 23 * 60 + 59) {
    await expect(page.getByTestId("future-line")).toBeVisible()
    await expect(page.getByTestId("save-entry")).toBeDisabled()
  }
  await page.getByTestId("cancel-entry").click()

  // history: one row for today (2 entries, 6 and 8 mean 7.0) and one for yesterday with the slip marked
  const today = page.locator(`[data-testid=day-row][data-date="${dateKey(0)}"]`)
  const yest = page.locator(`[data-testid=day-row][data-date="${dateKey(-1)}"]`)
  await expect(today).toHaveAttribute("data-count", "2")
  await expect(today.getByTestId("day-count")).toHaveText("2 cravings")
  await expect(today.getByTestId("day-mean")).toHaveText("mean strength 7.0")
  await expect(today.getByTestId("day-slip")).toHaveCount(0)
  await expect(yest).toHaveAttribute("data-slips", "1")
  await expect(yest.getByTestId("day-slip")).toHaveText("Smoked")
  await shot(page, "history")
  await tapsBigEnough(page)
  await today.getByTestId("day-toggle").click()
  await expect(today.getByTestId("entry-row")).toHaveCount(2)
  await expect(today).toContainText("Cravings, Anxiety")
  await shot(page, "history-open-day")
  await tapsBigEnough(page)

  // edit the past entry
  await yest.getByTestId("day-toggle").click()
  await yest.getByTestId("entry-edit").click()
  await expect(page.getByTestId("strength-4")).toHaveAttribute("aria-checked", "true")
  await page.getByTestId("strength-9").click()
  await shot(page, "form-edit")
  await page.getByTestId("save-entry").click()
  await expect(page.getByTestId("diary-form")).toHaveCount(0)
  await yest.getByTestId("day-toggle").click()
  await expect(yest.getByTestId("day-mean")).toHaveText("mean strength 9.0")

  // delete it, with a second tap to confirm
  await yest.getByTestId("entry-delete").click()
  await shot(page, "delete-confirm")
  await yest.getByTestId("entry-delete-sure").click()
  await expect(yest).toHaveCount(0)

  // fewer than 5 entries: only the line
  await page.getByTestId("dy-tab-1").click()
  await expect(page.getByTestId("patterns-wait")).toHaveText("Patterns show from 5 entries. You have 2.")
  await expect(page.getByTestId("by-time")).toHaveCount(0)
  await shot(page, "patterns-below-5")

  // saved on the phone
  await page.reload()
  await expect(page.getByTestId("diary-best")).toBeVisible()
  await expect(page.locator(`[data-testid=day-row][data-date="${dateKey(0)}"]`)).toHaveAttribute("data-count", "2")
  expect(errors).toEqual([])
})

test("5 to 9 entries show counts only", async ({ page }) => {
  await open(page, true)
  for (let i = 0; i < 5; i++) await quick(page, 3 + i, i < 3 ? "stress" : "bored").then(() => page.getByTestId("saved-done").click())
  await page.getByTestId("dy-tab-1").click()
  await expect(page.getByTestId("patterns")).toHaveAttribute("data-mode", "counts")
  await expect(page.getByTestId("counts-only")).toBeVisible()
  await expect(page.getByTestId("patterns")).not.toContainText("%")
  await expect(page.locator("[data-testid=by-situation-row]").first()).toHaveAttribute("data-count", "3")
  await shot(page, "patterns-counts")
})

test("example data fills every pattern list", async ({ page }) => {
  await open(page, false)
  await expect(page.getByTestId("day-row").first()).toBeVisible()
  await shot(page, "history-example")
  await page.getByTestId("dy-tab-1").click()
  await expect(page.getByTestId("patterns")).toHaveAttribute("data-mode", "percent")
  await expect(page.getByTestId("patterns-basis")).toHaveText("From your 20 entries on this phone. It is your own log, not a study.")
  const sum = async (id: string) => {
    const counts = await page.locator(`[data-testid=${id}-row]`).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-count"))))
    return counts.reduce((a, b) => a + b, 0)
  }
  expect(await sum("by-situation")).toBe(20)
  expect(await sum("by-time")).toBe(20)
  expect(await sum("by-weekday")).toBe(20)
  await expect(page.locator("[data-testid=by-time-row]")).toHaveCount(4)
  await expect(page.getByTestId("by-time")).toContainText("Night 22:00–04:59")
  await expect(page.locator("[data-testid=by-weekday-row]")).toHaveCount(7)
  await expect(page.getByTestId("by-situation")).toContainText("%")
  expect(await page.locator("[data-testid=by-move-row]").count()).toBeGreaterThan(0)
  await expect(page.getByTestId("by-move").locator("li").first()).toContainText(/used \d+ times?, got through \d+ times?/)
  await shot(page, "patterns-example")
  await tapsBigEnough(page)
})

test("the other addictions show content coming only for the missing pieces", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page, false)
  for (const id of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId("diary-best")).toBeVisible()
    await page.getByTestId("log-now").click()
    await expect(page.getByTestId("content-coming").first()).toBeVisible()
    await page.getByTestId("strength-5").click()
    await page.getByTestId("more").locator("summary").click()
    await expect(page.locator("[data-testid^=feeling-]").first()).toBeVisible()
    await shot(page, `form-${id}`)
    await page.getByTestId("save-entry").click()
    await expect(page.getByTestId("diary-saved")).toBeVisible()
    await expect(page.getByTestId("content-coming")).toBeVisible()
    await page.getByTestId("saved-done").click()
    await page.getByTestId("dy-tab-1").click()
    await expect(page.getByTestId("diary-best")).toBeVisible()
    await shot(page, `patterns-${id}`)
  }
  await page.getByTestId("switch-nicotine").click()
  await page.getByTestId("log-now").click()
  await expect(page.getByTestId("content-coming")).toHaveCount(0)
  expect(errors).toEqual([])
})

test("the page fits 1280 wide", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, false)
  await page.getByTestId("dy-tab-1").click()
  await shot(page, "patterns-desktop", 1280)
})
