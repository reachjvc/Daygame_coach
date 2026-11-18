/**
 * THE IMPROVED PROGRESS HOME (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844: setup with the price prefilled from the data file and its source, the home
 * (total, current run, best run, tiles), a logged slip with a note (total unchanged, run restarts,
 * best kept, stretch listed), the money page (tabs, formula, edit), a target, milestones, the
 * calendar, and the addiction switcher. State lives in the browser (`quit-lab-v1`).
 * Phone screenshots of every screen are saved outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/progress/shots-ours/best")

function shooter(page: Page, width: number) {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  let n = 0
  return async (name: string) => {
    n++
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true, style: "nextjs-portal { display: none !important }" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
}

const open = (page: Page) => page.goto("/quit/lab/progress/best?preview=1")
const num = async (page: Page, id: string) => Number(await page.getByTestId(id).innerText())

test("improved progress: setup, home, slip, money, target, milestones, calendar, switcher", async ({ page }) => {
  const shot = shooter(page, 390)
  await open(page)

  // setup: own numbers, price prefilled from the data file, source visible on tap
  await expect(page.getByTestId("setup-choice")).toBeVisible()
  await shot("setup-choice")
  await page.getByTestId("setup-own-btn").click()
  await expect(page.getByTestId("setup-price")).toHaveValue("0.52")
  await page.getByTestId("setup-price-source").getByRole("button").click()
  await expect(page.getByTestId("setup-price-source").getByRole("link").first()).toBeVisible()
  await expect(page.getByTestId("setup-perday")).toHaveValue("")
  await shot("setup-form")
  // a start date 12 days ago, 10 a day typed
  const d = new Date()
  d.setDate(d.getDate() - 12)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  await page.getByTestId("setup-start").fill(key)
  await page.getByTestId("setup-perday").fill("10")
  await page.getByTestId("setup-save").click()

  // home: total, current, best, tiles
  await expect(page.getByTestId("home")).toBeVisible()
  expect(await num(page, "total-days")).toBe(12)
  expect(await num(page, "current-run")).toBe(12)
  expect(await num(page, "best-run")).toBe(12)
  await expect(page.getByTestId("tile-money")).toContainText("$62.40")
  await expect(page.getByTestId("tile-units")).toContainText("120")
  await expect(page.getByTestId("tile-units")).toContainText("Cigarettes not used")
  await expect(page.getByTestId("tile-price")).toContainText("Price per cigarette")
  await expect(page.getByTestId("tile-price")).toContainText("$0.52")
  await page.getByTestId("tile-money").click()
  await expect(page.getByTestId("formula-money")).toContainText("$5.20 a day × 12 clear days")
  await page.getByTestId("total-card").click()
  await expect(page.getByTestId("formula-total")).toBeVisible()
  await shot("home")

  // a slip with a note: total unchanged, run restarts, best kept, stretch listed
  await page.getByTestId("slip-open").click()
  await page.getByTestId("slip-note").fill("Stressful evening")
  await shot("slip-form")
  await page.getByTestId("slip-save").click()
  await expect(page.getByTestId("slip-done")).toBeVisible()
  expect(await num(page, "total-days")).toBe(12)
  expect(await num(page, "current-run")).toBe(0)
  expect(await num(page, "best-run")).toBe(12)
  await expect(page.getByTestId("stretch")).toHaveCount(1)
  await expect(page.getByTestId("stretch-note")).toHaveText("Stressful evening")
  await expect(page.getByTestId("stretch-running")).toBeVisible()
  await shot("home-after-slip")

  // money page: tabs, formula, edit pencil, projections
  await page.getByTestId("nav-1").click()
  await expect(page.getByTestId("money-total")).toHaveText("$62.40")
  await expect(page.getByTestId("money-formula")).toContainText("$5.20 a day × 12 clear days − $0.00 spent = $62.40")
  await expect(page.getByTestId("per-day")).toContainText("10 cigarettes × $0.52")
  await expect(page.getByTestId("proj-year")).toHaveText("$1,898.00")
  await page.getByTestId("period-2").click()
  await expect(page.getByTestId("money-formula")).toContainText("clear days")
  await page.getByTestId("period-0").click()
  await page.getByTestId("per-day-edit").click()
  await page.getByTestId("edit-perday").fill("20")
  await page.getByTestId("edit-save").click()
  await expect(page.getByTestId("money-total")).toHaveText("$124.80")
  await page.getByTestId("spend-amount").fill("24.8")
  await page.getByTestId("spend-add").click()
  await expect(page.getByTestId("money-total")).toHaveText("$100.00")
  await shot("money")

  // a named target filled from the money kept
  await page.getByTestId("target-name").fill("Headphones")
  await page.getByTestId("target-price").fill("250")
  await page.getByTestId("target-add").click()
  await expect(page.getByTestId("target-row")).toHaveCount(1)
  await expect(page.getByTestId("target-row")).toContainText("$100.00 of $250.00")
  await page.getByTestId("target-togo").click()
  await expect(page.getByTestId("target-formula")).toContainText("$150.00 still missing")
  await shot("targets")

  // milestones: reached ones carry a date, others say what is to go
  await page.getByTestId("nav-2").click()
  const reached = page.locator('[data-testid="day-step"][data-reached="1"]')
  await expect(reached).toHaveCount(3)
  await expect(reached.first()).toContainText("Reached")
  await expect(page.locator('[data-testid="day-step"][data-reached="0"]').first()).toContainText("to go")
  await expect(page.locator('[data-testid="money-step"][data-reached="1"]').first()).toContainText("Reached")
  await shot("milestones")

  // calendar: clear days and the slip day, without alarm colours
  await page.getByTestId("nav-3").click()
  const today = new Date()
  const tk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  await expect(page.getByTestId(`day-${tk}`)).toHaveAttribute("data-state", "slip")
  await page.getByTestId(`day-${tk}`).click()
  await expect(page.getByTestId("day-detail")).toContainText("Stressful evening")
  await shot("calendar")

  // survives a reload
  await page.reload()
  await page.getByTestId("nav-0").click()
  expect(await num(page, "total-days")).toBe(12)

  // switcher: weed, porn, alcohol work without unit data
  for (const id of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId("setup-choice")).toBeVisible()
  }
  await page.getByTestId("switch-weed").click()
  await shot("switch-weed-setup")
  await page.getByTestId("setup-own-btn").click()
  await expect(page.getByTestId("setup-money")).toHaveValue("")
  await expect(page.getByTestId("setup-price")).toHaveCount(0)
  await expect(page.getByTestId("setup-perday")).toHaveCount(0)
  const w = new Date()
  w.setDate(w.getDate() - 5)
  await page.getByTestId("setup-start").fill(`${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`)
  await page.getByTestId("setup-money").fill("15")
  await page.getByTestId("setup-save").click()
  expect(await num(page, "total-days")).toBe(5)
  expect(await num(page, "current-run")).toBe(5)
  expect(await num(page, "best-run")).toBe(5)
  await expect(page.getByTestId("tile-money")).toContainText("$75.00")
  await expect(page.getByTestId("tile-units")).toHaveCount(0)
  await expect(page.getByTestId("tile-price")).toHaveCount(0)
  await expect(page.getByTestId("tiles-coming")).toHaveText("content coming: unit counts and typical prices")
  await shot("weed-home")
  await page.getByTestId("slip-open").click()
  await page.getByTestId("slip-note").fill("Party")
  await page.getByTestId("slip-save").click()
  expect(await num(page, "total-days")).toBe(5)
  expect(await num(page, "current-run")).toBe(0)
  await expect(page.getByTestId("stretch")).toHaveCount(1)
  await expect(page.getByTestId("stretch-note")).toHaveText("Party")
  await shot("weed-slip")
  await page.getByTestId("nav-1").click()
  await expect(page.getByTestId("money-total")).toHaveText("$75.00")
  await page.getByTestId("nav-0").click()
  // porn and alcohol seed with example data and show typed-money mode too
  await page.getByTestId("switch-porn").click()
  await page.getByTestId("setup-seed").click()
  expect(await num(page, "total-days")).toBe(22)
  await expect(page.getByTestId("tile-units")).toHaveCount(0)
  await shot("porn-example")
  await page.getByTestId("switch-nicotine").click()
  expect(await num(page, "total-days")).toBe(12)
})

test("improved progress: example data and the wide layout", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await open(page)
  await page.getByTestId("setup-seed").click()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  expect(await num(page, "total-days")).toBe(22)
  expect(await num(page, "current-run")).toBe(8)
  expect(await num(page, "best-run")).toBe(14)
  await expect(page.getByTestId("stretch")).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: path.join(DIR, "99-wide.png"), style: "nextjs-portal { display: none !important }" })
  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("setup-choice")).toBeVisible()
})
