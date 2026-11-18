/**
 * THE PAST ATTEMPTS COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (a, b) walks every seen screen of its spec in order.
 * Each screen is shot into ~/.cache/daygame-research/quit-copy/past/shots-ours/<letter>/.
 * Everything lives in this browser's storage, so nothing is written to the live database.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/past/shots-ours")

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
  const res = await page.goto(`/quit/lab/past/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId(`past-${letter}`)).toBeVisible()
  return errors
}

const screen = (page: Page, letter: string) => page.getByTestId(`past-${letter}`)

test("copy A: the history questions in order, the mirror, context screens, gate placeholders", async ({ page }) => {
  const errors = await open(page, "a")
  const root = screen(page, "a")
  const cont = page.getByTestId("a-continue")
  const next = async (name: string, id: string) => {
    await expect(root).toHaveAttribute("data-screen", id)
    await shot(page, "a", name)
    await cont.click()
  }
  const pickAndNext = async (name: string, id: string, i: number) => {
    await expect(root).toHaveAttribute("data-screen", id)
    await expect(cont).toBeDisabled()
    await page.getByTestId(`a-opt-${i}`).click()
    await expect(page.getByTestId(`a-opt-${i}`)).toHaveAttribute("aria-checked", "true")
    await expect(cont).toBeEnabled()
    await shot(page, "a", name)
    await cont.click()
  }

  await expect(page.getByTestId("a-bar")).toBeVisible()
  await expect(page.locator("[data-testid^=a-opt-]")).toHaveCount(4)
  await pickAndNext("how-long", "howlong", 1)
  await next("review-one", "review1")

  // frequency: empty, then typed; the unit list shows its one seen option and a dashed tile
  await expect(root).toHaveAttribute("data-screen", "freq")
  await expect(page.getByTestId("a-freq-number")).toHaveValue("")
  await expect(cont).toBeDisabled()
  await page.getByTestId("a-freq-unit").click()
  await expect(page.getByTestId("a-freq-list").getByTestId("placeholder")).toBeVisible()
  await shot(page, "a", "frequency-unit-list")
  await page.getByTestId("a-freq-unit").click()
  await page.getByTestId("a-freq-number").fill("36")
  await expect(cont).toBeEnabled()
  await shot(page, "a", "frequency")
  await cont.click()

  // the mirror shows his own number and no unsourced percentage
  await expect(root).toHaveAttribute("data-screen", "mirror")
  await expect(page.getByTestId("a-mirror-value")).toHaveText("36 per week")
  await expect(page.getByTestId("not-sourced")).toBeVisible()
  await shot(page, "a", "mirror")
  await cont.click()

  // last relapse: the date starts at today, Today resets it
  await expect(root).toHaveAttribute("data-screen", "last")
  await expect(cont).toBeEnabled()
  const today = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  await expect(page.getByTestId("a-date")).toHaveValue(today)
  await page.getByTestId("a-date").fill("2026-01-05")
  await expect(page.getByTestId("a-date")).toHaveValue("2026-01-05")
  await page.getByTestId("a-today").click()
  await expect(page.getByTestId("a-date")).toHaveValue(today)
  await shot(page, "a", "last-relapse")
  await cont.click()

  await expect(root).toHaveAttribute("data-screen", "longest")
  await expect(cont).toBeDisabled()
  await expect(page.getByTestId("a-longest-unit")).toContainText("weeks")
  await page.getByTestId("a-longest-number").fill("6")
  await shot(page, "a", "longest-run")
  await cont.click()

  await next("review-two", "review2")
  await expect(root).toHaveAttribute("data-screen", "pain")
  await expect(page.getByTestId("a-iceberg")).toBeVisible()
  await expect(page.getByText("Learn why earlier attempts")).toBeVisible()
  await expect(page.getByTestId("a-video")).toBeVisible()
  await shot(page, "a", "pain-reframe")
  await cont.click()

  await pickAndNext("therapist", "therapist", 2)
  await pickAndNext("told-anyone", "told", 0)
  await expect(page.locator("[data-testid^=a-opt-]")).toHaveCount(6)
  await pickAndNext("who-told", "who", 1)
  await pickAndNext("openness", "open", 1)
  await pickAndNext("accountability", "acct", 2)
  await expect(root).toHaveAttribute("data-screen", "reflect")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await expect(page.getByTestId("placeholder")).toHaveCount(2)
  await shot(page, "a", "reflect-back")
  await cont.click()
  await pickAndNext("group", "group", 0)
  await pickAndNext("time", "time", 2)
  await pickAndNext("live-meetings", "zoom", 1)
  await expect(page.locator("[data-testid^=a-opt-]")).toHaveCount(6)
  await pickAndNext("status", "status", 0)
  await pickAndNext("age", "age", 1)

  await expect(root).toHaveAttribute("data-screen", "name")
  await expect(cont).toBeDisabled()
  await expect(page.getByTestId("a-name-input")).toHaveValue("")
  await shot(page, "a", "name-empty")
  await page.getByTestId("a-anonymous").click()
  await expect(page.getByTestId("a-name-input")).not.toHaveValue("")
  await expect(cont).toBeEnabled()
  await page.getByTestId("a-pledge").click()
  await expect(page.getByTestId("placeholder")).toBeVisible()
  await shot(page, "a", "name")
  await cont.click()

  await expect(root).toHaveAttribute("data-screen", "gate")
  await expect(page.getByTestId("a-gate-signup")).toHaveText("not copied: sign-up gate")
  await expect(page.getByTestId("a-gate-payment")).toHaveText("not copied: payment")
  await shot(page, "a", "gate")
  await page.getByTestId("a-back").click()
  await expect(root).toHaveAttribute("data-screen", "name")

  // answering No to "told anyone" shows the inferred screen instead of the list
  await page.reload()
  await expect(root).toHaveAttribute("data-screen", "name")
  for (let i = 0; i < 10; i++) await page.getByTestId("a-back").click()
  await expect(root).toHaveAttribute("data-screen", "told")
  await page.getByTestId("a-opt-1").click()
  await cont.click()
  await expect(root).toHaveAttribute("data-screen", "consider")
  await expect(page.getByTestId("inferred-tag")).toBeVisible()
  await shot(page, "a", "told-no-branch")
  expect(errors).toEqual([])
})

test("copy B: last time, slip entry with relapse and spend, periods chart, progress, savings, reasons", async ({ page }) => {
  const errors = await open(page, "b")
  const root = screen(page, "b")
  await expect(root).toHaveAttribute("data-screen", "last")
  await expect(page.getByTestId("b-last")).not.toHaveValue("")
  await shot(page, "b", "last-time")
  const back20 = await page.evaluate(() => {
    const d = new Date(Date.now() - 20 * 86_400_000)
    const p = (x: number) => String(x).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
  })
  await page.getByTestId("b-last").fill(back20)
  await page.getByTestId("b-last-save").click()
  await expect(root).toHaveAttribute("data-screen", "loading")
  await shot(page, "b", "loading")
  await expect(root).toHaveAttribute("data-screen", "paywall", { timeout: 6000 })
  await expect(page.getByTestId("not-copied")).toHaveText("not copied: payment")
  await shot(page, "b", "payment")
  await page.getByTestId("b-paywall-continue").click()

  // progress: example data, ring at the example share, calendar
  await expect(root).toHaveAttribute("data-screen", "progress")
  await expect(page.getByTestId("example-bar")).toBeVisible()
  await expect(page.getByTestId("b-ring")).toHaveAttribute("data-value", /^0\.2[12]/)
  await expect(page.getByTestId("b-clean-time")).toContainText("19 days")
  const t0 = await page.getByTestId("b-tab-0").boundingBox()
  const t3 = await page.getByTestId("b-tab-3").boundingBox()
  expect(t0!.y).toBe(t3!.y)
  expect(t3!.x + t3!.width).toBeLessThanOrEqual(390)
  expect(t0!.x).toBeGreaterThanOrEqual(0)
  await expect(page.getByTestId("b-habit")).toBeVisible()
  await expect(page.locator("[data-testid=b-cal-line]").first()).toBeAttached()
  await page.getByTestId("b-share").click()
  await expect(page.getByTestId("placeholder")).toBeVisible()
  await page.getByTestId("b-more").click()
  await shot(page, "b", "progress")
  await page.getByTestId("b-goal-row").click()
  await expect(root).toHaveAttribute("data-screen", "goal")
  await shot(page, "b", "goal-placeholder")
  await page.getByTestId("screen-back").click()

  // periods: 9 bars, last is current, tapping a bar changes the rows
  await page.getByTestId("b-tab-1").click()
  await expect(page.getByTestId("b-chart")).toHaveAttribute("data-count", "9")
  await expect(page.getByTestId("b-bar-8")).toHaveAttribute("data-current", "1")
  await expect(page.getByTestId("b-duration")).toContainText("19 days, 18 hr")
  await expect(page.getByTestId("b-avg")).toContainText("Avg:")
  await expect(page.getByTestId("b-avg-line")).toBeAttached()
  await expect(page.getByTestId("b-habit")).toBeVisible()
  await page.getByTestId("b-periods-more").click()
  await expect(page.getByTestId("placeholder").first()).toBeVisible()
  await shot(page, "b", "periods")
  await page.getByTestId("b-bar-0").click()
  await expect(page.getByTestId("b-duration")).toContainText("6 days")
  await expect(page.getByTestId("b-bar-0")).toHaveAttribute("data-selected", "1")
  await shot(page, "b", "periods-selected")

  // savings: balance, purchase card
  await page.getByTestId("b-tab-2").click()
  const balance = Number(await page.getByTestId("b-balance").getAttribute("data-value"))
  await expect(page.getByTestId("b-purchase")).toBeVisible()
  await shot(page, "b", "savings")
  await page.getByTestId("b-sav-time").click()
  await expect(page.getByTestId("not-sourced").first()).toBeVisible()
  await shot(page, "b", "savings-time")
  await page.getByTestId("b-sav-money").click()
  await page.getByTestId("b-potential").click()
  await expect(root).toHaveAttribute("data-screen", "potential")
  await page.getByTestId("screen-back").click()
  await page.getByTestId("b-tab-2").click()
  await page.getByTestId("b-buy").click()
  expect(Number(await page.getByTestId("b-balance").getAttribute("data-value"))).toBeCloseTo(balance - 30, 0)

  // reasons
  await page.getByTestId("b-tab-3").click()
  await expect(page.locator("[data-testid=b-reasons] li")).toHaveCount(4)
  await shot(page, "b", "reasons")
  await page.getByTestId("b-page-1").click()
  await expect(page.getByTestId("placeholder")).toBeVisible()
  await page.getByTestId("b-page-0").click()
  await page.getByTestId("b-reason-input").fill("My own reason")
  await page.getByTestId("b-reason-add").click()
  await expect(page.locator("[data-testid=b-reasons] li")).toHaveCount(5)

  // new entry: plain note, then a relapse with spend; the example is replaced by his own data
  await page.getByTestId("b-add").click()
  await expect(root).toHaveAttribute("data-screen", "entry")
  await expect(page.getByTestId("b-spend")).toHaveCount(0)
  await shot(page, "b", "entry-note")
  await page.getByTestId("b-entry-relapse").click()
  await expect(page.getByTestId("b-spend")).toBeVisible()
  await expect(page.getByTestId("b-amount")).toHaveValue("$0")
  await shot(page, "b", "entry-relapse-empty")
  await page.getByTestId("b-chip-100").click()
  await expect(page.getByTestId("b-amount")).toHaveValue("$100")
  await page.getByTestId("b-amount").fill("75")
  await page.getByTestId("b-unit-time").click()
  await expect(page.getByTestId("placeholder")).toBeVisible()
  await page.getByTestId("b-unit-money").click()
  await shot(page, "b", "entry-relapse")
  await page.getByTestId("b-entry-save").click()
  await expect(page.getByTestId("example-bar")).toHaveCount(0)
  await page.getByTestId("b-tab-1").click()
  await expect(page.getByTestId("b-chart")).toHaveAttribute("data-count", "2")
  await expect(page.getByTestId("not-sourced").first()).toBeVisible()
  await shot(page, "b", "own-data")
  await page.getByTestId("b-tab-0").click()
  await expect(page.getByTestId("b-cal-relapse")).toHaveCount(1)
  await expect(page.getByTestId("b-ring")).toBeVisible()
  await expect(page.getByTestId("b-ring").getByTestId("not-sourced")).toBeVisible()
  await shot(page, "b", "own-progress")
  expect(errors).toEqual([])
})
