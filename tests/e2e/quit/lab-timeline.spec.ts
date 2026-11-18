/**
 * THE HEALTH TIMELINE COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (a to e) opens the copy, starts with the example
 * data, and walks every screen of its spec in order. No time point or percentage is shown as a
 * fact: every one reads "number not sourced yet". Each screen is shot into
 * ~/.cache/daygame-research/quit-copy/timeline/shots-ours/<letter>/. Everything lives in this
 * browser's storage, so the test writes nothing to the live database.
 */

import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/timeline/shots-ours")

async function start(page: Page, letter: string) {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const res = await page.goto(`/quit/lab/timeline/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await page.getByTestId("setup-choice").waitFor()
  await page.getByTestId("setup-seed").click()
  await expect(page.getByTestId(`timeline-${letter}`)).toBeVisible()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  return errors
}

let n = 0
async function shot(page: Page, letter: string, name: string) {
  n += 1
  const dir = path.join(SHOTS, letter)
  mkdirSync(dir, { recursive: true })
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

/** No percentage appears as a fact anywhere on the screen. */
async function noPercent(page: Page) {
  expect(await page.locator("body").innerText()).not.toMatch(/\d\s?%/)
}

const back = (page: Page) => page.getByTestId("screen-back").click()
const value = async (page: Page, id: string) => Number(await page.getByTestId(id).getAttribute("data-value"))

test.beforeEach(() => {
  n = 0
})

test("first open offers example data and your own date; a future date shows before-start; clearing starts over", async ({ page }) => {
  await page.goto("/quit/lab/timeline/a?preview=1")
  await expect(page.getByTestId("setup-seed")).toBeVisible()
  await shot(page, "a", "setup")
  await page.getByTestId("setup-own-btn").click()
  await expect(page.getByTestId("setup-own")).toBeVisible()
  await page.getByTestId("setup-startMs").fill("2099-01-01")
  await page.getByTestId("setup-save").click()
  await expect(page.getByTestId("before-start")).toBeVisible()
  await expect(page.getByTestId("example-bar")).toHaveCount(0)
  await expect(page.getByTestId("example-duration-line")).toHaveCount(0)
  await expect(page.getByTestId("a-card-ring-lung")).toHaveAttribute("data-value", "0.000")
  await shot(page, "a", "before-quit-date")
  await page.reload()
  await expect(page.getByTestId("timeline-a")).toBeVisible()
  await expect(page.getByTestId("setup-choice")).toHaveCount(0)
  await page.getByTestId("start-over").click()
  await page.getByTestId("setup-seed").click()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("setup-choice")).toBeVisible()
})

test("copy A: dashboard card of three rings, Explore, health page of rings, detail and share", async ({ page }) => {
  const errors = await start(page, "a")
  await expect(page.getByTestId("a-card-ring-lung")).toBeVisible()
  expect(await value(page, "a-card-ring-lung")).toBeGreaterThan(0.2)
  expect(await value(page, "a-card-ring-lung")).toBeLessThan(0.3)
  await expect(page.getByTestId("example-duration-line")).toContainText("example duration, not a health figure")
  await expect(page.getByTestId("not-sourced").first()).toHaveText("number not sourced yet")
  await noPercent(page)
  await expect(page.getByTestId("a-mission")).toBeVisible()
  await expect(page.getByTestId("a-mission").getByTestId("placeholder")).toBeVisible()
  await shot(page, "a", "dashboard")
  await page.getByTestId("a-nav-3").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await page.getByTestId("a-nav-0").click()
  await expect(page.getByTestId("screen-dash")).toBeVisible()
  await page.getByTestId("a-explore").click()
  await expect(page.getByTestId("screen-health")).toBeVisible()
  expect(await value(page, "a-ring-pulse")).toBe(1)
  expect(await value(page, "a-ring-co")).toBe(1)
  expect(await value(page, "a-ring-disease")).toBeLessThan(1)
  await noPercent(page)
  await shot(page, "a", "health")
  await page.getByTestId("a-share").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "a", "share-inferred")
  await back(page)
  await page.getByTestId("a-block-lung").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "a", "detail-inferred")
  await back(page)
  await back(page)
  await page.getByTestId("a-tile-attack").click()
  await expect(page.getByTestId("screen-health")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy B: rows with bars, detail card, count, home entry", async ({ page }) => {
  const errors = await start(page, "b")
  await expect(page.getByTestId("b-row-heart")).toHaveAttribute("data-state", "done")
  await expect(page.getByTestId("b-row-cancer")).toHaveAttribute("data-state", "progress")
  await expect(page.getByTestId("b-count")).toContainText("2 of 3 reached")
  expect(await value(page, "b-bar-heart")).toBe(1)
  expect(await value(page, "b-bar-cancer")).toBeGreaterThan(0.3)
  await noPercent(page)
  await shot(page, "b", "health")
  await page.getByTestId("b-row-co").click()
  await expect(page.getByTestId("b-detail")).toBeVisible()
  expect(await value(page, "b-detail-ring")).toBe(1)
  await shot(page, "b", "detail")
  await page.getByTestId("b-detail-close").click()
  await expect(page.getByTestId("b-detail")).toHaveCount(0)
  await back(page)
  await expect(page.getByTestId("screen-home")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "b", "home-inferred")
  await page.getByTestId("b-health-tile").click()
  await expect(page.getByTestId("screen-health")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy C: three organ rings, heart card, medal card, view more", async ({ page }) => {
  const errors = await start(page, "c")
  expect(Math.round((await value(page, "c-ring-lungs")) * 100)).toBe(70)
  expect(await value(page, "c-ring-heart")).toBeCloseTo(0.455, 2)
  expect(Math.round((await value(page, "c-ring-brain")) * 100)).toBe(50)
  await expect(page.getByTestId("c-card-heartCard")).toHaveAttribute("data-state", "done")
  await expect(page.getByTestId("not-sourced").first()).toBeVisible()
  await noPercent(page)
  await expect(page.getByTestId("screen-back")).toBeVisible()
  await shot(page, "c", "stats")
  await page.getByTestId("c-more-heartCard").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "c", "view-more-inferred")
  await back(page)
  await expect(page.getByTestId("screen-stats")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy D: health cards under the tab bar; other tabs and buttons are placeholders", async ({ page }) => {
  const errors = await start(page, "d")
  await expect(page.getByTestId("screen-health")).toBeVisible()
  expect(await value(page, "d-bar-lung")).toBe(1)
  expect(Math.round((await value(page, "d-bar-blood")) * 100)).toBe(70)
  expect(Math.round((await value(page, "d-bar-skin")) * 100)).toBe(47)
  await noPercent(page)
  await shot(page, "d", "health")
  await page.getByTestId("d-top-1").click()
  await expect(page.getByTestId("other-tool-screen")).toContainText("Part of another tool, not copied here")
  await expect(page.getByTestId("inferred-tag")).toHaveCount(0)
  await shot(page, "d", "knowledge-other-tool")
  await back(page)
  await page.getByTestId("d-top-2").click()
  await expect(page.getByTestId("other-tool-screen")).toBeVisible()
  await back(page)
  await page.getByTestId("d-nav-0").click()
  await expect(page.getByTestId("other-tool-screen")).toBeVisible()
  await page.getByTestId("d-nav-2").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await page.getByTestId("d-nav-1").click()
  await expect(page.getByTestId("screen-health")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy E: symptom cards with live countdown, menu, settings, info, share", async ({ page }) => {
  const errors = await start(page, "e")
  const card = page.getByTestId("e-countdown-dreams")
  const first = await card.innerText()
  expect(first).toMatch(/^\d+d \d+h \d+m \d+s$/)
  await expect.poll(async () => card.innerText(), { timeout: 5000 }).not.toBe(first)
  expect(await value(page, "e-bar-dreams")).toBeGreaterThan(0.7)
  await expect(page.getByTestId("example-duration-line")).toContainText("example duration, not a health figure")
  await noPercent(page)
  await expect(page.getByTestId("screen-list").locator("h2")).toHaveText("Health stats")
  expect(await page.getByTestId("screen-list").locator("h2").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await shot(page, "e", "list")
  for (const id of ["e-menu", "e-settings", "e-info"]) {
    await page.getByTestId(id).click()
    await expect(page.getByTestId("placeholder-screen")).toBeVisible()
    await expect(page.getByTestId("inferred-tag")).toBeVisible()
    if (id === "e-settings") await shot(page, "e", "settings-inferred")
    if (id === "e-info") await shot(page, "e", "info-inferred")
    await back(page)
  }
  await page.getByTestId("e-share").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "e", "share-inferred")
  await back(page)
  await expect(page.getByTestId("screen-list")).toBeVisible()
  expect(errors).toEqual([])
})
