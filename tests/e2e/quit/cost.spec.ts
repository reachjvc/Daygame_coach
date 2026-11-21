/**
 * QUIT TOOL 9, "WHAT IT COSTS YOU", WALKED ON A PHONE AND A COMPUTER (acceptance 1 to 10 of Plans/quit-finish.md).
 *
 * Signed out. The shared record is read and written through `localStorage["quit-v1"].nicotine.record`.
 * Screenshots go to COST_SHOTS_DIR when it is set, else test-results/cost-shots.
 */

import { mkdirSync } from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"

const URL = quitUrl("/quit/nicotine/cost")
const SHOTS = process.env.COST_SHOTS_DIR ?? "test-results/cost-shots"
mkdirSync(SHOTS, { recursive: true })

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(Date.now() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

type Seed = { record?: Record<string, unknown>; cost?: Record<string, unknown> }
/** Puts answers in the browser store once per tab (a reload keeps what the page wrote). */
async function seed(page: Page, s: Seed) {
  await page.addInitScript((v) => {
    if (sessionStorage.getItem("seeded")) return
    sessionStorage.setItem("seeded", "1")
    localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { ...(v.record ? { record: v.record } : {}), ...(v.cost ? { cost: v.cost } : {}) } }))
  }, s)
}
const recordOf = (quitDate: string | null, goal: string | null, unit: Record<string, unknown> | null) => ({ quitDate, goal, breakEnd: null, unit })
const VAPE = { id: "vape", perDay: 0.5, priceUsd: 14.07, priceBasis: "default" }

/** The record is written when a box is left (or Done is tapped, or the page is left), never while a number is half typed. */
const commit = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
const unitInRecord = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine?.record?.unit ?? null)
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
const errorsOf = (page: Page) => {
  const errors: string[] = []
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  page.on("pageerror", (e) => errors.push(e.message))
  return errors
}
const lines = async (page: Page) => (await page.locator('[data-testid^="cost-line-"]').allTextContents()).map((l) => l.trim())

test.describe("what it costs you, phone", () => {
  test("1 fresh: the form is open; cigarettes, 10 a day, pack prefilled, the numbers, the record", async ({ page }) => {
    const errors = errorsOf(page)
    await page.goto(URL)
    await expect(page.getByTestId("cost-summary")).toHaveCount(0)
    await expect(page.getByTestId("cost-result")).toHaveCount(0)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await shot(page, "01-fresh-form")
    await page.getByTestId("chip-cigarettes").click()
    await expect(page.getByTestId("cost-price")).toHaveValue("10.40")
    await expect(page.getByTestId("cost-size")).toHaveValue("20")
    await expect(page.getByTestId("cost-count")).toHaveValue("")
    await expect(page.getByTestId("cost-nocount")).toHaveText("Type how many you use to see what it costs.")
    await expect(page.getByTestId("cost-basis")).toContainText("Starts at $10.40 a pack of 20: the plain average of US state prices")
    await expect(page.getByTestId("cost-subtitle")).toHaveText("What you spend on it a day, a year and over 10 years.")
    await expect(page.getByTestId("cost-dateline")).toHaveCount(0)
    await expect(page.getByTestId("cost-basis")).toContainText("Counted by packs sold, the average is $9.95")
    await expect(page.getByTestId("cost-basis")).toContainText("state and federal tax are included, city taxes")
    await expect(page.getByTestId("cost-basis")).not.toContainText("Not weighted")
    await page.getByTestId("cost-count").fill("10")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
    await expect(page.getByTestId("cost-year")).toHaveAttribute("data-value", "1898.00")
    await expect(page.getByTestId("cost-day")).toHaveText("$5.20")
    await expect(page.getByTestId("cost-month")).toHaveText("$158.17")
    await expect(page.getByTestId("cost-ten")).toHaveText("$18,980.00")
    await expect(page.getByTestId("cost-units")).toHaveText("3,650 cigarettes a year")
    expect(await lines(page)).toEqual([
      "$10.40 a pack ÷ 20 = $0.52 a cigarette.",
      "10 a day × $0.52 × 365 days = $1,898.00 a year.",
      "$1,898.00 ÷ 365 = $5.20 a day.",
      "$1,898.00 ÷ 12 = $158.17 a month.",
      "$1,898.00 × 10 = $18,980.00 in 10 years.",
    ])
    await expect(page.getByTestId("cost-working")).toContainText("A year is 365 days. No price rise is counted")
    expect(await unitInRecord(page)).toBeNull() // nothing is written while the box still has the cursor
    await commit(page)
    await expect(page.getByTestId("cost-saved")).toHaveText("Saved on this device.")
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" })
    await expect(page.locator("details#sources")).toHaveCount(1)
    await expect(page.locator("details")).toHaveCount(2)
    await expect(page.getByTestId("cost-basis-fold")).toHaveCount(1)
    await noSideways(page)
    await shot(page, "02-result-pack-mode")
    expect(errors).toEqual([])
  })

  test("2 pack 9,00 is 0.45 a cigarette, typed; the year shows with no tap; the lines add up", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("cost-price").fill("9,00")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,642.50")
    await commit(page)
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 10, priceUsd: 0.45, priceBasis: "typed" })
    await expect(page.getByTestId("cost-basis")).toHaveText("Your own price.")
    expect((await lines(page))[0]).toBe("$9.00 a pack ÷ 20 = $0.45 a cigarette.")
    // a pack of 25: the pack price stays, the price of one changes
    await page.getByTestId("cost-size").fill("25")
    await commit(page)
    expect((await unitInRecord(page)).priceUsd).toBeCloseTo(0.36, 9)
    await page.getByTestId("cost-size").fill("20")
    // one cigarette
    await page.getByTestId("cost-price-mode-one").click()
    await expect(page.getByTestId("cost-price")).toHaveValue("0.45")
    await expect(page.getByTestId("cost-size")).toHaveCount(0)
    await page.getByTestId("cost-price").fill("0,5")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,825.00")
    expect((await lines(page))[0]).toBe("10 a day × $0.50 × 365 days = $1,825.00 a year.")
    await shot(page, "03-one-cigarette-mode")
  })

  test("3 a record as Tool 1 leaves it opens on the summary, shown a week for a vape; Change, the day switch, Done", async ({ page }) => {
    await seed(page, { record: recordOf(null, null, VAPE) })
    await page.goto(URL)
    await expect(page.getByTestId("cost-summary")).toHaveText("3.5 disposable vapes a week at $14.07 each")
    await expect(page.locator('[data-testid^="chip-"]')).toHaveCount(0)
    await expect(page.getByTestId("cost-count")).toHaveCount(0)
    await expect(page.getByTestId("cost-numbers")).toContainText("Your quit date and Your record use these same numbers.")
    await expect(page.getByTestId("cost-year")).toHaveText("$2,567.78")
    await shot(page, "04-summary-line")
    await page.getByTestId("cost-change").click()
    await expect(page.getByTestId("cost-count-mode-week")).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("cost-count")).toHaveValue("3.5")
    await expect(page.getByTestId("chip-vape")).toHaveAttribute("aria-checked", "true")
    await page.getByTestId("cost-count-mode-day").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("0.5")
    await shot(page, "05-day-mode")
    expect((await lines(page))[0]).toBe("0.5 a day × $14.07 × 365 days = $2,567.78 a year.")
    await page.getByTestId("cost-done").click()
    await expect(page.getByTestId("cost-summary")).toHaveText("0.5 disposable vapes a day at $14.07 each")
    await expect(page.getByTestId("cost-count")).toHaveCount(0)
  })

  test("3b a week of one is said in the singular", async ({ page }) => {
    await seed(page, { record: recordOf(null, null, { id: "pouches", perDay: 1 / 7, priceUsd: 5.64, priceBasis: "default" }), cost: { v: 2, priceMode: "one", packSize: 20, countMode: "week", lastByUnit: {} } })
    await page.goto(URL)
    await expect(page.getByTestId("cost-summary")).toHaveText("1 can of pouches a week at $5.64 each")
    await expect(page.getByTestId("cost-units")).toHaveText("52 cans of pouches a year")
  })

  test("4 vape, 2 a week at $14.07: perDay 2/7 in the record, $4.02 a day, $1,467.30 a year", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-vape").click()
    await expect(page.getByTestId("cost-count-mode-week")).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("cost-price")).toHaveValue("14.07")
    await page.getByTestId("cost-count").fill("2")
    await expect(page.getByTestId("cost-day")).toHaveText("$4.02")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,467.30")
    await commit(page)
    const u = await unitInRecord(page)
    expect(u.perDay).toBeCloseTo(2 / 7, 12)
    expect(u.priceBasis).toBe("default")
    await expect(page.getByTestId("cost-basis")).toContainText("4 weeks to 3 Sep 2022")
    await expect(page.getByTestId("cost-units")).toHaveText("104 disposable vapes a year")
    expect((await lines(page))[0]).toBe("2 a week × $14.07 × 365 ÷ 7 = $1,467.30 a year.")
  })

  test("5 junk is refused with a message and the record keeps its last good numbers", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count").fill("10")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
    await commit(page)
    for (const bad of ["abc", "501", "-3", "1,000"]) {
      await page.getByTestId("cost-count").fill(bad)
      await expect(page.getByTestId("cost-count-error")).toHaveText("Type a number from 0 to 500")
      await expect(page.getByTestId("cost-fix")).toHaveText("Fix the number above to see the cost.")
      await expect(page.getByTestId("cost-year")).toHaveCount(0)
      await expect(page.getByTestId("cost-count-error")).toHaveAttribute("role", "alert")
      expect((await unitInRecord(page)).perDay).toBe(10)
    }
    await expect(page.getByTestId("cost-done")).toBeDisabled()
    await page.getByTestId("cost-count").fill("10")
    await commit(page)
    await page.getByTestId("cost-price").fill("abc")
    await expect(page.getByTestId("cost-price-error")).toHaveText("Type a price up to $1,000, like 7.50")
    expect((await unitInRecord(page)).priceUsd).toBe(0.52)
    await page.getByTestId("cost-price").fill("10.40")
    await page.getByTestId("cost-size").fill("0")
    await expect(page.getByTestId("cost-size-error")).toHaveText("Type a whole number from 1 to 100")
    await page.getByTestId("cost-size").fill("101")
    await expect(page.getByTestId("cost-size-error")).toBeVisible()
    await page.getByTestId("cost-price").fill("5000")
    await expect(page.getByTestId("cost-price-error")).toBeVisible()
    await page.getByTestId("cost-price").fill("1,000")
    await expect(page.getByTestId("cost-price-error")).toBeVisible()
    expect((await unitInRecord(page)).priceUsd).toBe(0.52)
    await expect(page.getByTestId("cost-fix")).toBeVisible()
    await expect(page.getByTestId("cost-year")).toHaveCount(0)
    await shot(page, "06-errors")
    await page.getByTestId("cost-size").fill("20")
    await page.getByTestId("cost-price").fill("10.40")
    await expect(page.getByTestId("cost-count-error")).toHaveCount(0)
    await expect(page.getByTestId("cost-price-error")).toHaveCount(0)
    await expect(page.getByTestId("cost-size-error")).toHaveCount(0)
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
  })

  test("5b an emptied count box never wipes the record; the unit round trip restores the numbers", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("cost-price").fill("9")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,642.50")
    await commit(page)
    await page.getByTestId("cost-count").fill("")
    await expect(page.getByTestId("cost-nocount")).toHaveText("Type how many you use to see what it costs.")
    await expect(page.getByTestId("cost-live")).toHaveCount(0)
    expect((await unitInRecord(page)).perDay).toBe(10)
    await page.getByTestId("cost-count").fill("12")
    await commit(page)
    expect((await unitInRecord(page)).perDay).toBe(12)
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("chip-vape").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("")
    await expect(page.getByTestId("cost-price")).toHaveValue("14.07")
    expect(await unitInRecord(page)).toMatchObject({ id: "cigarettes", perDay: 10 }) // a tapped unit changes nothing in the record
    await page.getByTestId("chip-cigarettes").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("10")
    await expect(page.getByTestId("cost-price")).toHaveValue("9.00")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,642.50")
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 10, priceUsd: 0.45, priceBasis: "typed" })
  })

  test("5c one a week at $0.52 is $27.11 a year, worked from the unrounded numbers", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count-mode-week").click()
    await page.getByTestId("cost-count").fill("1")
    await page.getByTestId("cost-price-mode-one").click()
    await expect(page.getByTestId("cost-price")).toHaveValue("0.52")
    await expect(page.getByTestId("cost-year")).toHaveText("$27.11")
    await expect(page.getByTestId("cost-day")).toHaveText("$0.07")
    await expect(page.getByTestId("cost-month")).toHaveText("$2.26")
    await expect(page.getByTestId("cost-ten")).toHaveText("$271.10")
    expect((await lines(page))[0]).toBe("1 a week × $0.52 × 365 ÷ 7 = $27.11 a year.")
  })

  test("5d the count-up never shows a figure outside old..new", async ({ page }) => {
    await seed(page, { record: recordOf(null, null, { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" }) })
    await page.goto(URL)
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
    await page.getByTestId("cost-change").click()
    const watch = () =>
      page.evaluate(() => {
        const w = window as unknown as { __vals: number[] }
        w.__vals = []
        const root = document.querySelector('[data-testid="cost-result"]')!
        new MutationObserver(() => {
          const t = document.querySelector('[data-testid="cost-year"]')?.textContent
          if (t) w.__vals.push(Number(t.replace(/[$,]/g, "")))
        }).observe(root, { childList: true, characterData: true, subtree: true })
      })
    const seen = () => page.evaluate(() => (window as unknown as { __vals: number[] }).__vals)
    await watch()
    await page.getByTestId("cost-count").fill("20")
    await expect(page.getByTestId("cost-year")).toHaveText("$3,796.00")
    const up = await seen()
    expect(up.length).toBeGreaterThan(1)
    expect(Math.min(...up)).toBeGreaterThanOrEqual(1898)
    expect(Math.max(...up)).toBeLessThanOrEqual(3796)
    await watch()
    await page.getByTestId("cost-count").fill("5")
    await expect(page.getByTestId("cost-year")).toHaveText("$949.00")
    const down = await seen()
    expect(down.length).toBeGreaterThan(1)
    expect(Math.min(...down)).toBeGreaterThanOrEqual(949)
    expect(Math.max(...down)).toBeLessThanOrEqual(3796)
  })

  test("5e the live year line stays in view while typing", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count").fill("10")
    await expect(page.getByTestId("cost-live")).toHaveText("A year: $1,898.00")
    await expect(page.getByTestId("cost-live")).toBeInViewport({ ratio: 0.99 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.getByTestId("cost-live")).toBeInViewport({ ratio: 0.99 })
    await page.getByTestId("cost-price").fill("9")
    await expect(page.getByTestId("cost-live")).toHaveText("A year: $1,642.50")
    await expect(page.getByTestId("cost-live")).toBeInViewport({ ratio: 0.99 })
    await shot(page, "06b-live-line")
    await page.getByTestId("cost-count").fill("abc")
    await expect(page.getByTestId("cost-live")).toHaveCount(0)
  })

  test("6 cigarettes to pouches: count empty, $5.64 and the suggested-price line", async ({ page }) => {
    await page.goto(URL)
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("chip-pouches").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("")
    await expect(page.getByTestId("cost-price")).toHaveValue("5.69")
    await expect(page.getByTestId("cost-basis")).toContainText("ZYN's maker suggests in the US")
    await expect(page.getByTestId("cost-basis")).not.toContainText("sales tax")
    await expect(page.getByTestId("cost-nocount")).toBeVisible()
    await expect(page.getByTestId("cost-size")).toHaveCount(0)
    await expect(page.locator("label", { hasText: "What does a can cost? (USD)" })).toBeVisible()
    await expect(page.locator("label", { hasText: "How many cans of pouches?" })).toBeVisible()
    await page.getByTestId("cost-count").fill("7")
    await expect(page.getByTestId("cost-units")).toHaveText("365 cans of pouches a year")
    await shot(page, "07-pouches")
    await commit(page)
    expect(await unitInRecord(page)).toMatchObject({ id: "pouches", priceUsd: 5.69, priceBasis: "default" })
  })

  test("7 old wave-1 answers move into the record once; the coaching line reads the record", async ({ page }) => {
    await seed(page, { cost: { unit: "cigarettes", perDay: 20, daysPerWeek: 5, price: "0.60", done: 3, result: { yearUsd: 1, tenYearUsd: 10, hoursYear: null } } })
    await page.goto(URL)
    await expect(page.getByTestId("cost-summary")).toHaveText("100 cigarettes a week at $12.00 a pack of 20")
    const u = await unitInRecord(page)
    expect(u.id).toBe("cigarettes")
    expect(u.perDay).toBeCloseTo(14.2857142857, 8)
    expect(u.priceUsd).toBe(0.6)
    expect(u.priceBasis).toBe("typed")
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine.cost)).toEqual({ v: 2, priceMode: "pack", packSize: 20, countMode: "week", lastByUnit: {}, packPrice: null })
    await page.reload()
    expect((await unitInRecord(page)).priceUsd).toBe(0.6)
    await page.goto(quitUrl("/quit/coaching"))
    await expect(page.getByTestId("coaching-cost")).toHaveText("What it costs you a year: $3,129")
  })

  test("8 the quit date line: future, past, none, later; links only to live tools", async ({ page }) => {
    const cig = { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" }
    const future = day(2)
    await seed(page, { record: recordOf(future, "stop", cig) })
    await page.goto(URL)
    await expect(page.getByTestId("cost-dateline")).toHaveText(`If you stop on ${fmt(future)}, each day without it saves $5.20: $1,898.00 in a year.`)
    await shot(page, "08-quit-date-line-future")
    const past = day(-7)
    await page.evaluate((p) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { record: { quitDate: p, goal: "break", breakEnd: null, unit: { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" } } } })), past)
    await page.reload()
    await expect(page.getByTestId("cost-dateline")).toHaveText(new RegExp(`^Your break started on ${fmt(past)} and has kept you \\$[\\d,.]+ so far\\. The full count is in Your record\\.$`))
    await expect(page.getByTestId("cost-dateline").locator("a")).toHaveCount(1) // Your record is live: the name links to it
    await shot(page, "09-quit-date-line-past")
    await page.evaluate((r) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { record: r } })), { quitDate: past, goal: "stop", breakEnd: null, unit: cig })
    await page.reload()
    await expect(page.getByTestId("cost-dateline")).toHaveText(new RegExp(`^You stopped on ${fmt(past)} and have kept \\$[\\d,.]+ since\\. The full count is in Your record\\.$`))
    await page.evaluate((r) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { record: r } })), { quitDate: future, goal: "break", breakEnd: null, unit: cig })
    await page.reload()
    await expect(page.getByTestId("cost-dateline")).toHaveText(`Your break starts ${fmt(future)}. Each day of it saves $5.20.`)
    for (const rec of [recordOf(null, null, cig), recordOf(future, "later", cig)]) {
      await page.evaluate((r) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { record: r } })), rec)
      await page.reload()
      await expect(page.getByTestId("cost-dateline")).toHaveText("Pick your quit day in Your quit date.")
      await expect(page.getByTestId("cost-dateline").locator("a")).toHaveAttribute("href", /\/quit\/nicotine\/date/)
    }
    await shot(page, "10-quit-date-line-none")
  })

  test("9 a reload keeps everything; Your quit date shows the numbers typed here", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-19T10:00:00") })
    await page.goto(URL)
    await page.getByTestId("chip-vape").click()
    await page.getByTestId("cost-count").fill("3")
    await page.getByTestId("cost-price").fill("12,5")
    await expect(page.getByTestId("cost-day")).toHaveText("$5.36")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,955.36")
    await page.reload() // leaving the page saves the boxes
    await expect(page.getByTestId("cost-summary")).toHaveText("3 disposable vapes a week at $12.50 each")
    await page.getByTestId("cost-change").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("3")
    await expect(page.getByTestId("cost-price")).toHaveValue("12.50")
    await page.goto(quitUrl("/quit/nicotine/date"))
    await page.getByTestId("goal-stop").click()
    await page.clock.runFor(300)
    await page.getByTestId("goal-next").click()
    await page.clock.runFor(300)
    await page.getByTestId("chip-today").click()
    await page.clock.runFor(300)
    await page.getByTestId("date-next").click()
    await page.clock.runFor(300)
    await expect(page.getByTestId("use-price")).toHaveValue("12.5")
    await expect(page.getByTestId("use-perday")).toHaveValue("0.43") // shown to 2 decimals; the record keeps 3 / 7
  })

  test("10 no console error, no sideways scroll at 500 a day x $1,000, tap targets, the menu row opens it", async ({ page }) => {
    const errors = errorsOf(page)
    await page.goto(URL)
    await page.getByTestId("chip-vape").click()
    await page.getByTestId("cost-count").fill("3500")
    await page.getByTestId("cost-price").fill("1000")
    await expect(page.getByTestId("cost-year")).toHaveText("$182,500,000.00")
    await expect(page.getByTestId("cost-ten")).toHaveText("$1,825,000,000.00")
    await noSideways(page)
    await shot(page, "11-largest-numbers")
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-testid="cost-numbers"] button, [data-testid="cost-numbers"] input, [data-testid="cost-dateline"] a, details#sources summary')]
        .map((e) => ({ id: e.getAttribute("data-testid") ?? e.tagName, h: e.getBoundingClientRect().height }))
        .filter((e) => e.h < 43.5),
    )
    expect(small).toEqual([])
    await page.goto(quitUrl("/quit/nicotine"))
    await page.getByRole("link", { name: /What it costs you/ }).click()
    await expect(page).toHaveURL(/\/quit\/nicotine\/cost/)
    await expect(page.getByTestId("cost-numbers")).toBeVisible()
    expect(errors).toEqual([])
  })

  const CIG10 = { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" }

  test("11 a half-typed number is never saved: 501 does not leave 50 in the record", async ({ page }) => {
    await seed(page, { record: recordOf(null, null, CIG10) })
    await page.goto(URL)
    await page.getByTestId("cost-change").click()
    const box = page.getByTestId("cost-count")
    await box.fill("")
    await box.pressSequentially("501")
    await expect(page.getByTestId("cost-count-error")).toBeVisible()
    await commit(page)
    expect(await unitInRecord(page)).toEqual(CIG10)
    await page.reload()
    await expect(page.getByTestId("cost-summary")).toHaveText("10 cigarettes a day at $10.40 a pack of 20")
    // a bad pack price or size writes nothing either, and leaving the page does not save the bad box
    await page.getByTestId("cost-change").click()
    await page.getByTestId("cost-price").fill("1000.01")
    await page.getByTestId("cost-size").fill("101")
    await commit(page)
    expect(await unitInRecord(page)).toEqual(CIG10)
    // a complete, valid set is saved when he leaves the box
    await box.fill("501")
    await page.getByTestId("cost-size").fill("20")
    await page.getByTestId("cost-price").fill("12")
    await commit(page)
    expect(await unitInRecord(page)).toEqual(CIG10) // the bad count holds the whole set back
    await box.fill("15")
    await commit(page)
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 15, priceUsd: 0.6, priceBasis: "typed" })
  })

  test("12 tapping a unit chip does not touch the record until a complete entry for it", async ({ page }) => {
    await seed(page, { record: recordOf(day(-20), "stop", CIG10) })
    await page.goto(URL)
    await page.getByTestId("cost-change").click()
    await page.getByTestId("chip-vape").click()
    expect(await unitInRecord(page)).toEqual(CIG10)
    await expect(page.getByTestId("cost-count")).toHaveValue("")
    await expect(page.getByTestId("cost-nocount")).toBeVisible()
    await expect(page.getByTestId("cost-done")).toHaveCount(0)
    await page.getByTestId("chip-pouches").click()
    expect(await unitInRecord(page)).toEqual(CIG10)
    await page.reload() // leaving with nothing entered keeps the record as it was
    expect(await unitInRecord(page)).toEqual(CIG10)
    await page.goto(quitUrl("/quit/nicotine/record"))
    await expect(page.getByText("Add your numbers to see this.")).toHaveCount(0)
    await page.goto(URL)
    await page.getByTestId("cost-change").click()
    await page.getByTestId("chip-vape").click()
    await page.getByTestId("cost-count").fill("2")
    await commit(page)
    expect(await unitInRecord(page)).toMatchObject({ id: "vape", priceUsd: 14.07 })
    expect((await unitInRecord(page)).perDay).toBeCloseTo(2 / 7, 12)
    await page.getByTestId("chip-cigarettes").click() // the cigarette numbers come back
    await expect(page.getByTestId("cost-count")).toHaveValue("10")
  })

  test("13 Your quit date, Back then Continue, keeps the numbers set in the cost tool", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-19T10:00:00") })
    await page.goto(quitUrl("/quit/nicotine/date"))
    for (const id of ["goal-stop", "goal-next", "chip-in3", "date-next", "chip-cigarettes"]) {
      await page.getByTestId(id).click()
      await page.clock.runFor(300) // past the date tool's double-tap guard
    }
    await page.getByTestId("use-perday").fill("10")
    await page.getByTestId("use-next").click()
    await page.clock.runFor(300)
    await expect(page.getByTestId("plan-step-0")).toBeVisible()
    await page.goto(URL)
    await page.getByTestId("cost-change").click()
    await page.getByTestId("cost-count").fill("20")
    await page.getByTestId("cost-price").fill("7")
    await commit(page)
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 20, priceUsd: 0.35, priceBasis: "typed" })
    await page.goto(quitUrl("/quit/nicotine/date"))
    await page.getByTestId("screen-back").click()
    await page.clock.runFor(300)
    await expect(page.getByTestId("use-perday")).toHaveValue("20")
    await expect(page.getByTestId("use-price")).toHaveValue("0.35")
    await page.getByTestId("use-next").click()
    expect(await unitInRecord(page)).toEqual({ id: "cigarettes", perDay: 20, priceUsd: 0.35, priceBasis: "typed" })
  })

  test("14 a $7 pack of 3 reopens as 7; a count of 0 is the empty line; the working adds up by hand", async ({ page }) => {
    await seed(page, { record: recordOf(null, null, CIG10) })
    await page.goto(URL)
    await page.getByTestId("cost-change").click()
    await page.getByTestId("cost-price").fill("7")
    await page.getByTestId("cost-size").fill("3")
    await commit(page)
    await expect(page.getByTestId("cost-year")).toHaveText("$8,516.55")
    expect((await lines(page))[0]).toBe("$7.00 a pack ÷ 3 = $2.3333 a cigarette.")
    expect((await lines(page))[1]).toBe("10 a day × $2.3333 × 365 days = $8,516.55 a year.")
    await page.getByTestId("cost-done").click()
    await expect(page.getByTestId("cost-summary")).toHaveText("10 cigarettes a day at $7.00 a pack of 3")
    await page.reload()
    await page.getByTestId("cost-change").click()
    await expect(page.getByTestId("cost-price")).toHaveValue("7.00")
    await expect(page.getByTestId("cost-size")).toHaveValue("3")
    // zero a day: no $0.00 figures
    await page.getByTestId("cost-count").fill("0")
    await expect(page.getByTestId("cost-nocount")).toBeVisible()
    await expect(page.getByTestId("cost-year")).toHaveCount(0)
    await expect(page.getByTestId("cost-live")).toHaveCount(0)
    // a week count turned into a day: the line is written in the form that adds up
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("cost-price-mode-one").click()
    await page.getByTestId("cost-count-mode-week").click()
    await page.getByTestId("cost-count").fill("10")
    await page.getByTestId("cost-price").fill("0.52")
    await commit(page)
    await page.getByTestId("cost-count-mode-day").click()
    await expect(page.getByTestId("cost-count")).toHaveValue("1.4286")
    expect((await lines(page))[0]).toBe("10 a week × $0.52 × 365 ÷ 7 = $271.14 a year.")
  })

  test("15 the quit-date line comes with the result and above the working; a past date says what it cost; long numbers keep whole", async ({ page }) => {
    await seed(page, { record: recordOf(day(-9), "stop", { id: "pouches", perDay: 2 / 7, priceUsd: 5.69, priceBasis: "default" }) })
    await page.goto(URL)
    await expect(page.getByRole("heading", { name: "What it would have cost you" })).toBeVisible()
    const dl = await page.getByTestId("cost-dateline").boundingBox()
    const wk = await page.getByTestId("cost-working").boundingBox()
    expect(dl!.y).toBeLessThan(wk!.y)
    await expect(page.getByTestId("cost-year-live")).toHaveAttribute("aria-live", "polite")
    await expect(page.getByTestId("cost-year")).toHaveAttribute("aria-hidden", "true")
    await page.getByTestId("cost-change").click()
    await page.getByTestId("chip-cigarettes").click()
    await page.getByTestId("cost-count-mode-week").click()
    await page.getByTestId("cost-count").fill("3500")
    await page.getByTestId("cost-price-mode-one").click()
    await page.getByTestId("cost-price").fill("1000")
    await expect(page.getByTestId("cost-ten")).toHaveText("$1,825,000,000.00")
    // each figure is on one line: its box is as tall as one line of text
    for (const id of ["cost-year", "cost-day", "cost-month", "cost-ten"]) {
      const h = await page.getByTestId(id).evaluate((e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) }))
      expect(h.h).toBeLessThan(h.lh * 1.5)
    }
    await noSideways(page)
    await shot(page, "14-long-numbers")
  })
})

test.describe("what it costs you, computer", () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false })

  test("the same page in the page column", async ({ page }) => {
    const errors = errorsOf(page)
    await seed(page, { record: recordOf(day(3), "stop", { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" }) })
    await page.goto(URL)
    await expect(page.getByTestId("cost-summary")).toHaveText("10 cigarettes a day at $10.40 a pack of 20")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
    const box = await page.getByTestId("cost-numbers").boundingBox()
    expect(box!.width).toBeLessThan(700)
    expect(box!.x).toBeGreaterThan(200)
    await noSideways(page)
    await shot(page, "12-desktop")
    await page.getByTestId("cost-change").click()
    await shot(page, "13-desktop-form")
    expect(errors).toEqual([])
  })
})

const quitV1 = (page: Page) => page.evaluate(() => localStorage.getItem("quit-v1"))
const CIG = (perDay: number, priceUsd: number, priceBasis = "default") => ({ id: "cigarettes", perDay, priceUsd, priceBasis })

// review round 3: the same walk on a phone (touch) and a computer
for (const vp of [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "computer", width: 1280, height: 800, touch: false },
]) {
  test.describe(`what it costs you, round 3 fixes, ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch })

    for (const price of [0.6667, 0.3333, 0.0001, 0.52, 14.12345]) {
      test(`r3-1 opening the tool and leaving it with no change writes nothing (price ${price})`, async ({ page }) => {
        const rec = recordOf(day(3), "stop", price === 14.12345 ? { id: "vape", perDay: 0.5, priceUsd: price, priceBasis: "typed" } : CIG(10, price, "typed"))
        await seed(page, { record: rec })
        await page.goto(URL)
        await expect(page.getByTestId("cost-summary")).toBeVisible()
        const before = await quitV1(page)
        await page.getByTestId("cost-change").click()
        await page.getByTestId("cost-count").focus()
        await commit(page)
        await page.goto(quitUrl("/quit/nicotine/date"))
        expect(await quitV1(page)).toEqual(before)
      })
    }

    test("r3-1b a pack price edit keeps the pack price; a typed per-unit price keeps every decimal", async ({ page }) => {
      await seed(page, { record: recordOf(day(3), "stop", CIG(10, 0.52)) })
      await page.goto(URL)
      await page.getByTestId("cost-change").click()
      await page.getByTestId("cost-price").fill("13.33")
      await commit(page)
      expect((await unitInRecord(page)).priceUsd).toBe(0.6665)
      await page.getByTestId("cost-price-mode-one").click()
      await page.getByTestId("cost-price").fill("0.6667")
      await commit(page)
      const u = await unitInRecord(page)
      expect(u.priceUsd).toBe(0.6667)
      expect(u.priceBasis).toBe("typed")
      await page.getByTestId("cost-price").fill("0.52")
      await commit(page)
      expect((await unitInRecord(page)).priceBasis).toBe("typed")
      await page.getByTestId("cost-price").fill("0.00012345")
      await commit(page)
      expect((await unitInRecord(page)).priceUsd).toBe(0.00012345)
    })

    test("r3-2 a pack price of 7.995 is shown as typed and the working line adds up", async ({ page }) => {
      await seed(page, { record: recordOf(day(3), "stop", CIG(10, 0.52)) })
      await page.goto(URL)
      await page.getByTestId("cost-change").click()
      await page.getByTestId("cost-price").fill("7.995")
      await commit(page)
      await expect(page.getByTestId("cost-line-0")).toContainText("$7.995 a pack ÷ 20")
    })

    test("r3-3 Saved shows only after a write", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("chip-cigarettes").click()
      await expect(page.getByTestId("cost-saved")).toHaveCount(0)
      await page.getByTestId("cost-count").fill("10")
      await expect(page.getByTestId("cost-saved")).toHaveCount(0)
      await commit(page)
      await expect(page.getByTestId("cost-saved")).toBeVisible()
      await page.getByTestId("cost-price").fill("7")
      await expect(page.getByTestId("cost-saved")).toHaveCount(0)
      await commit(page)
      await expect(page.getByTestId("cost-saved")).toBeVisible()
      await page.getByTestId("cost-count").fill("abc")
      await expect(page.getByTestId("cost-saved")).toHaveCount(0)
    })

    test("r3-4 tapping a prefilled box selects its contents, so typing replaces", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("chip-cigarettes").click()
      const price = page.getByTestId("cost-price")
      if (vp.touch) await price.tap()
      else await price.click()
      expect(await price.evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd, e.value.length])).toEqual([0, 5, 5])
      await page.keyboard.type("7")
      await expect(price).toHaveValue("7")
    })

    test("r3-5 a count of 0 is never written; a running quit keeps its money", async ({ page }) => {
      await seed(page, { record: recordOf(day(-20), "stop", { id: "vape", perDay: 0.5, priceUsd: 14.07, priceBasis: "default" }) })
      await page.goto(URL)
      await page.getByTestId("cost-change").click()
      await page.getByTestId("cost-count").fill("0")
      await expect(page.getByTestId("cost-nocount")).toBeVisible()
      await expect(page.getByTestId("cost-done")).toHaveCount(0)
      await commit(page)
      expect((await unitInRecord(page)).perDay).toBe(0.5)
      await page.goto(quitUrl("/quit/nicotine/record"))
      await expect(page.getByTestId("tile-money-value")).toHaveText(/\$\d/)
    })

    test("r3-6 a tiny spend says under $0.01 a day, and old wave-1 counts over the limit are not set", async ({ page }) => {
      await seed(page, { record: recordOf(day(3), "stop", { id: "pouches", perDay: 1 / 7, priceUsd: 0.01, priceBasis: "typed" }) })
      await page.goto(URL)
      await expect(page.getByTestId("cost-day")).toHaveText("under $0.01")
      await expect(page.getByTestId("cost-dateline")).toContainText("saves under $0.01")
    })

    test("r3-6b old wave-1 counts over the limit are not set", async ({ page }) => {
      await seed(page, { cost: { unit: "cigarettes", perDay: 9999, daysPerWeek: 7, price: "2" } })
      await page.goto(URL)
      await expect(page.getByTestId("cost-nocount")).toBeVisible()
      expect(await unitInRecord(page)).toMatchObject({ id: "cigarettes", perDay: null })
    })

    test("r3-7 past quit date: heading, kept line that matches Your record, no half-cut text round the bar", async ({ page }) => {
      await seed(page, { record: recordOf(day(-9), "stop", { id: "pouches", perDay: 1, priceUsd: 5.69, priceBasis: "default" }) })
      await page.goto(URL)
      await expect(page.getByRole("heading", { name: "What it would have cost you" })).toBeVisible()
      const kept = page.getByTestId("cost-kept")
      await expect(kept).toContainText("have kept $")
      await expect(kept.getByRole("link", { name: "Your record" })).toBeVisible()
      const money = (await kept.textContent())!.match(/\$([\d,.]+)/)![1]
      await kept.getByRole("link", { name: "Your record" }).click()
      await expect(page.getByTestId("tile-money-value")).toBeVisible()
      const rec = (await page.getByTestId("tile-money-value").textContent())!.match(/\$([\d,.]+)/)![1]
      expect(Math.abs(Number(rec.replace(/,/g, "")) - Number(money.replace(/,/g, "")))).toBeLessThan(6)
    })

    test("r3-8 the price explanation is in a fold under the price box; Done sits higher", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("chip-cigarettes").click()
      const fold = page.getByTestId("cost-basis-fold")
      await expect(fold.locator("summary")).toHaveText("Where does $10.40 come from?")
      await expect(page.getByTestId("cost-basis")).toBeHidden()
      await page.getByTestId("cost-count").fill("10")
      const done = await page.getByTestId("cost-done").boundingBox()
      expect(done!.y).toBeLessThan(vp.height + 400)
      await fold.locator("summary").click()
      await expect(page.getByTestId("cost-basis")).toContainText("Type what you pay.")
      await shot(page, `r3-fold-${vp.name}`)
    })

    test("r3-9 pouch line: 15-pouch can, tax, 20-pouch move; sources list the ZYN page once", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("chip-pouches").click()
      await page.getByTestId("cost-basis-fold").locator("summary").click()
      const text = (await page.getByTestId("cost-basis").textContent())!
      expect(text).toContain("$5.69 for a 15-pouch can")
      expect(text).toContain("The page does not say if tax is in it; a few states add a pouch tax on top.")
      expect(text).toContain("20 pouches")
      expect(text).not.toContain("older")
      await shot(page, `r3-pouch-${vp.name}`)
    })

    test("r3-10 sticky year bar has a solid backing", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("chip-cigarettes").click()
      await page.getByTestId("cost-count").fill("15")
      await expect(page.getByTestId("cost-live")).toBeVisible()
      await shot(page, `r3-bar-${vp.name}`)
    })
  })
}
