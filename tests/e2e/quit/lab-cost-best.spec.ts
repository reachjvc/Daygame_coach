/**
 * THE IMPROVED COST AND SAVINGS (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: setup (price prefilled from the data file with its source on tap, count
 * empty), home tiles with their basis lines, a spend row that lowers the net money, two goals that fill
 * in order, a purchase that moves the equation line, name-only suggestions, and the other addictions
 * (weed with money per day typed directly). State lives in the browser (`quit-lab-v1`).
 * Phone screenshots of every screen are saved outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/cost/shots-ours/best")

function shooter(page: Page, width: number) {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  let n = 0
  return async (name: string) => {
    n++
    await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
}

const key = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const money = async (page: Page, id: string) => Number((await page.getByTestId(id).innerText()).replace(/[$,]/g, "").replace("−", "-"))

test("improved cost: setup, tiles, spend, goals, equation, suggestions, switcher", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const shot = shooter(page, 390)
  await page.goto("/quit/lab/cost/best?preview=1")
  await expect(page.getByTestId("cost-best")).toBeVisible()

  // setup: price prefilled with its source on tap; count empty
  await expect(page.getByTestId("setup-form")).toBeVisible()
  await expect(page.getByTestId("setup-price-value")).toHaveText("$0.52")
  await expect(page.getByTestId("setup-perday")).toHaveValue("")
  await expect(page.getByTestId("setup-save")).toBeDisabled()
  await page.getByTestId("setup-price-source").getByRole("button").click()
  await expect(page.getByTestId("setup-price-source").getByRole("link").first()).toBeVisible()
  await shot("setup")
  await page.getByTestId("setup-start").fill(key(10))
  await page.getByTestId("setup-perday").fill("10")
  await page.getByTestId("setup-save").click()

  // home: net money with basis, tiles with basis
  await expect(page.getByTestId("hero")).toBeVisible()
  await expect(page.getByTestId("basis-hero")).toContainText("based on: 10 cigarettes a day × $0.52 each, since")
  const kept = await money(page, "net-money")
  expect(kept).toBeGreaterThanOrEqual(52)
  expect(kept).toBeLessThan(58)
  await expect(page.getByTestId("tile-0-value")).toHaveText("$5.20")
  await expect(page.getByTestId("tile-1-value")).toHaveText("$36.40")
  await expect(page.getByTestId("tile-3-value")).toHaveText("$1,898.00")
  await expect(page.getByTestId("tile-4-value")).toHaveText("$18,980.00")
  for (let i = 0; i < 5; i++) await expect(page.getByTestId(`tile-${i}-basis`)).toContainText("based on: 10 cigarettes a day × $0.52 each")
  await page.getByTestId("tile-2").click()
  await expect(page.getByTestId("tile-2-formula")).toContainText("× 365 ÷ 12")
  await page.getByTestId("hero-card").click()
  await expect(page.getByTestId("formula-hero")).toContainText("spent")
  await shot("home")

  // typed yearly rise changes only the year-based figures
  await page.getByTestId("rise").fill("5")
  await expect(page.getByTestId("tile-4-value")).not.toHaveText("$18,980.00")
  await expect(page.getByTestId("tile-4-basis")).toContainText("rising 5% a year")
  await expect(page.getByTestId("tile-0-value")).toHaveText("$5.20")
  await page.getByTestId("rise").fill("")
  await expect(page.getByTestId("tile-4-value")).toHaveText("$18,980.00")

  // a spend row lowers the net money
  await page.getByTestId("spend-amount").fill("20")
  await page.getByTestId("spend-note").fill("replacement gum")
  await page.getByTestId("spend-add").click()
  await expect(page.getByTestId("spend-row")).toHaveCount(1)
  const after = await money(page, "net-money")
  expect(after).toBeCloseTo(kept - 20, 0)
  await expect(page.getByTestId("basis-hero")).toContainText("minus $20.00 spent")
  await shot("spend-added")

  // goals: suggestion fills only the name
  await expect(page.getByTestId("equation")).toContainText("kept − $0.00 bought")
  await page.getByTestId("suggestion").first().click()
  await expect(page.getByTestId("goal-name-input")).not.toHaveValue("")
  await expect(page.getByTestId("goal-price-input")).toHaveValue("")
  await expect(page.getByTestId("goal-add")).toBeDisabled()
  await page.getByTestId("goal-name-input").fill("Boots")
  await page.getByTestId("goal-price-input").fill("20")
  await page.getByTestId("goal-add").click()
  await page.getByTestId("goal-name-input").fill("Bike")
  await page.getByTestId("goal-price-input").fill("500")
  await page.getByTestId("goal-add").click()
  await expect(page.getByTestId("goal-row")).toHaveCount(2)
  // fill in order: first full, second takes the rest
  await expect(page.getByTestId("goal-funded").first()).toContainText("(100%)")
  await expect(page.getByTestId("goal-funded").nth(1)).not.toContainText("(100%)")
  await expect(page.getByTestId("goal-reach")).toBeVisible()
  const eq1 = await page.getByTestId("equation").innerText()
  await shot("goals")

  // buy the first: equation updates, bought list shows
  await page.getByTestId("goal-buy").click()
  await expect(page.getByTestId("bought-row")).toHaveCount(1)
  await expect(page.getByTestId("equation")).not.toHaveText(eq1)
  await expect(page.getByTestId("equation")).toContainText("$20.00 bought")
  await expect(page.getByTestId("goal-row")).toHaveCount(1)
  await shot("bought")

  // edit setup returns to the form with values
  await page.getByTestId("edit-setup").click()
  await expect(page.getByTestId("setup-perday")).toHaveValue("10")
  await page.getByTestId("setup-save").click()
  await expect(page.getByTestId("hero")).toBeVisible()

  // other addictions: weed types money per day directly
  await page.getByTestId("switch-weed").click()
  await expect(page.getByTestId("setup-money")).toBeVisible()
  await expect(page.getByTestId("setup-perday")).toHaveCount(0)
  await shot("weed-setup")
  await page.getByTestId("setup-start").fill(key(4))
  await page.getByTestId("setup-money").fill("12")
  await page.getByTestId("setup-save").click()
  await expect(page.getByTestId("basis-hero")).toContainText("based on: $12.00 a day, typed by you, since")
  await expect(page.getByTestId("tile-0-value")).toHaveText("$12.00")
  await expect(page.getByTestId("suggestion")).toHaveCount(0)
  await shot("weed-home")
  for (const a of ["porn", "alcohol"]) {
    await page.getByTestId(`switch-${a}`).click()
    await expect(page.getByTestId("setup-form")).toBeVisible()
    await shot(`${a}-setup`)
  }
  // nicotine is still set up
  await page.getByTestId("switch-nicotine").click()
  await expect(page.getByTestId("hero")).toBeVisible()
  expect(errors).toEqual([])
})

test("improved cost at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/quit/lab/cost/best?preview=1")
  await expect(page.getByTestId("setup-form")).toBeVisible()
  await page.getByTestId("setup-perday").fill("5")
  await page.getByTestId("setup-save").click()
  await expect(page.getByTestId("tile-4-value")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})
