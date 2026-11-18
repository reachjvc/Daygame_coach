/**
 * /privacy, /quit/coaching and the sign-up privacy link, signed out, 390x844.
 * Read-only. Tagged @phone so it runs on the phone project too.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import type { Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

const SHOTS = process.env.QUIT_SHOTS_DIR
const tag = (page: Page) => (page.context().browser()?.browserType().name() ?? "x")

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}-${tag(page)}.png`, fullPage: true })
}

test("@phone /privacy loads with its five sections and the draft line", async ({ page }) => {
  const res = await page.goto("/privacy")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5)
  await expect(page.getByText("Draft, 2026-11-18. Not legal advice.")).toBeVisible()
  await expect(page.getByRole("link", { name: "30 days with a coach" })).toBeVisible()
  await noSidewaysScroll(page)
  await shot(page, "privacy")
})

test("@phone /quit/coaching has no Stripe link or buy button while the link is null", async ({ page }) => {
  const res = await page.goto(quitUrl("/quit/coaching"))
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { level: 1, name: "30 days with a coach" })).toBeVisible()
  await expect(page.getByTestId("coaching-price")).toContainText("$200")
  await expect(page.getByTestId("coaching-soon")).toHaveText("Booking opens soon.")
  await expect(page.getByTestId("coaching-buy")).toHaveCount(0)
  expect(await page.locator('a[href*="stripe"]').count()).toBe(0)
  await expect(page.getByTestId("coaching-cost")).toHaveCount(0)
  await noSidewaysScroll(page)
  await shot(page, "coaching")
})

test("@phone /quit/coaching shows his yearly cost from the store", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { cost: { result: { yearUsd: 1825, tenYearUsd: 18250, hoursYear: null } } } }))
  })
  await page.goto(quitUrl("/quit/coaching"))
  await expect(page.getByTestId("coaching-cost")).toHaveText("What it costs you a year: $1,825")
  await noSidewaysScroll(page)
  await shot(page, "coaching-cost")
})

test("@phone /quit links to privacy and sign-up shows the privacy link", async ({ page }) => {
  await page.goto(quitUrl("/quit"))
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible()
  await page.goto("/auth/sign-up")
  const link = page.getByTestId("signup-privacy-link")
  await expect(link).toBeVisible()
  await noSidewaysScroll(page)
  await shot(page, "signup")
  await link.click()
  await expect(page).toHaveURL(/\/privacy$/)
})
