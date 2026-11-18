/**
 * THE IF-THEN COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (a, b, c) walks every seen screen of its spec in order.
 * Each screen is shot into ~/.cache/daygame-research/quit-copy/ifthen/shots-ours/<letter>/.
 * Everything lives in this browser's storage, so nothing is written to the live database.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/ifthen/shots-ours")

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
  const res = await page.goto(`/quit/lab/ifthen/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId(`ifthen-${letter}`)).toBeVisible()
  return errors
}

test("copy A: builder with the each-group rule, results, plan view, app", async ({ page }) => {
  const errors = await open(page, "a")
  await shot(page, "a", "landing")
  await page.getByTestId("e-type-cig").click()
  await page.getByTestId("e-date-pick").click()
  await page.getByTestId("e-date-input").fill("2030-01-15")
  await expect(page.getByTestId("e-cigs")).toHaveValue("")
  await page.getByTestId("e-cigs").fill("10")
  await page.getByTestId("e-price").fill("8")
  await page.getByTestId("e-reason-0").click()
  await shot(page, "a", "steps-1-3")

  // step 4: all boxes empty at the start, then two ticks
  await expect(page.getByTestId("e-trig-0-0")).toHaveAttribute("aria-checked", "false")
  await page.getByTestId("e-trig-2-2").click()
  await page.getByTestId("e-trig-3-2").click()
  await page.getByTestId("e-step-4").scrollIntoViewIfNeeded()
  await shot(page, "a", "step-4-triggers")

  // step 5: the final button with an empty group shows the red box and stays here
  await page.getByTestId("e-sup-0").click()
  await page.getByTestId("e-letsgo").click()
  await expect(page.getByTestId("e-need-one")).toBeVisible()
  await expect(page.getByTestId("e-results")).toHaveCount(0)
  await shot(page, "a", "step-5-validation")
  await page.getByTestId("e-exp-0").click()
  await page.getByTestId("e-dis-0").click()
  await shot(page, "a", "step-5-ready")
  await page.getByTestId("e-letsgo").click()

  await expect(page.getByTestId("e-results")).toBeVisible()
  await expect(page.getByTestId("e-trigger-card")).toContainText("Routine situations")
  await shot(page, "a", "results-top")
  await page.getByTestId("e-next").click()
  await expect(page.getByTestId("e-trigger-card")).toContainText("My emotions")
  await shot(page, "a", "results-carousel")
  await page.getByTestId("e-view-plan").click()
  await expect(page.getByTestId("e-print-page")).toContainText("Drinking a glass of water")
  await shot(page, "a", "plan-view")
  await page.getByTestId("e-print-back").click()
  await expect(page.getByTestId("e-download")).toBeVisible()

  // the app: home, kit, explore, profile
  await page.reload()
  await page.getByTestId("a-view-1").click()
  await expect(page.getByTestId("a-home")).toBeVisible()
  await shot(page, "a", "app-home")
  await page.getByTestId("a-home-btn-0").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await page.getByTestId("screen-back").click()
  await page.getByTestId("a-nav-0").click()
  await expect(page.locator("[data-testid^=a-fav-]")).toHaveCount(3)
  await shot(page, "a", "app-kit")
  await page.getByTestId("a-nav-1").click()
  await page.getByTestId("a-explore-tab-1").click()
  await page.getByTestId("a-add-kit").click()
  await shot(page, "a", "app-explore")
  await page.getByTestId("a-nav-4").click()
  await expect(page.getByTestId("a-prof-2")).toContainText("2")
  await shot(page, "a", "app-profile")
  expect(errors).toEqual([])
})

test("copy B: three circles, boundaries survey, feeling chips", async ({ page }) => {
  const errors = await open(page, "b")
  await expect(page.locator("[data-testid^=b-card-]")).toHaveCount(3)
  await shot(page, "b", "circles")

  await page.getByTestId("b-screen-1").click()
  await expect(page.getByTestId("b-q-0-3")).toHaveAttribute("aria-checked", "false")
  await page.getByTestId("b-q-0-3").click()
  await page.getByTestId("b-q-1-5").click()
  await page.getByTestId("b-q-2-2").click()
  await expect(page.getByTestId("b-q-0-3")).toHaveAttribute("aria-checked", "true")
  await page.getByTestId("b-q-0-4").click()
  await expect(page.getByTestId("b-q-0-3")).toHaveAttribute("aria-checked", "false")
  await shot(page, "b", "survey")
  await page.getByTestId("b-back").click()
  await expect(page.getByTestId("b-circles")).toBeVisible()

  await page.getByTestId("b-screen-2").click()
  await expect(page.getByTestId("b-chip-0")).toHaveAttribute("aria-checked", "false")
  await page.getByTestId("b-chip-0").click()
  await page.getByTestId("b-chip-5").click()
  await page.getByTestId("b-chip-6").click()
  await page.getByTestId("b-chip-add").click()
  await page.getByTestId("b-chip-input").fill("Restless")
  await page.getByTestId("b-chip-input-add").click()
  await expect(page.getByTestId("b-chip-7")).toHaveAttribute("aria-checked", "true")
  await shot(page, "b", "analyze")
  await page.getByTestId("b-slider").fill("80")
  await expect(page.getByTestId("b-resilience-word")).toContainText("Not seen")
  await page.getByTestId("b-an-close").click()
  await expect(page.getByTestId("b-circles")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy C: toolkit list, the worksheet field by field, saved plan, urges", async ({ page }) => {
  const errors = await open(page, "c")
  await expect(page.getByTestId("c-card-plan")).toBeVisible()
  await shot(page, "c", "toolkit")
  await page.getByTestId("c-learn-plan").click()
  for (const id of ["c-changes", "c-importance", "c-confidence", "c-reasons", "c-steps", "c-person-0", "c-help-0", "c-working", "c-interfere"]) {
    await expect(page.getByTestId(id)).toHaveValue("")
  }
  await expect(page.getByTestId("c-date")).toHaveValue("")
  await expect(page.getByTestId("c-checkin")).toHaveValue("")
  await shot(page, "c", "form-empty")

  await page.getByTestId("c-date").fill("2030-02-01")
  await page.getByTestId("c-changes").fill("my typed change")
  await page.getByTestId("c-importance").fill("11")
  await expect(page.getByTestId("c-importance")).toHaveValue("")
  await page.getByTestId("c-importance").fill("8")
  await page.getByTestId("c-confidence").fill("5")
  await page.getByTestId("c-reasons").fill("my typed reason")
  await page.getByTestId("c-steps").fill("my typed step")
  await page.getByTestId("c-person-0").fill("my typed person")
  await page.getByTestId("c-help-0").fill("my typed help")
  await page.getByTestId("c-add-row").click()
  await expect(page.getByTestId("c-person-1")).toHaveValue("")
  await page.getByTestId("c-working").fill("my typed sign")
  await page.getByTestId("c-interfere").fill("my typed obstacle")
  await page.getByTestId("c-checkin").fill("2030-03-01")
  await shot(page, "c", "form-filled")
  await page.getByTestId("c-note").scrollIntoViewIfNeeded()
  await shot(page, "c", "form-bottom")
  await page.getByTestId("c-save").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "c", "saved-plan")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("c-changes")).toHaveValue("my typed change")

  await page.getByTestId("c-tab-1").click()
  await expect(page.getByTestId("c-urges")).toBeVisible()
  await shot(page, "c", "urges")
  await page.getByTestId("c-urge-btn").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "c", "urge-flow")
  expect(errors).toEqual([])
})
