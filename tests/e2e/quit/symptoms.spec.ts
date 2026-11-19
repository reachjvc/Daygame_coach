/**
 * QUIT TOOL 6, "WHAT YOU'LL FEEL, AND WHEN" (/quit/nicotine/symptoms): acceptance 1 to 9 of Plans/quit-finish.md.
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00). State is seeded in the browser (`quit-v1`, `vice-blackbox-v1`);
 * signed out, so nothing reaches an account. With QUIT_SHOTS_DIR set it saves screenshots (top and full page).
 */

import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"

const URL = quitUrl("/quit/nicotine/symptoms")
const NOW = new Date("2026-11-19T10:00:00")
const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(NOW.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

const CARDS = ["craving", "cue", "mood", "sleep", "hunger"] as const

interface Seed {
  /** A living run that started this many days from today (negative = past). */
  run?: number
  /** A run that ended in a slip this many days from today; no run living. */
  slip?: number
  /** The shared record's date, in days from today, with its goal. */
  record?: { off: number; goal: "stop" | "break" | "later" }
}

function box(seed: Seed) {
  const stamp = new Date().toISOString()
  const attempt = (startedOn: string, endedOn: string | null, endedByReportId: string | null) => ({
    id: randomUUID(),
    viceId: "nicotine",
    label: "Smoking or vaping",
    startedOn,
    startedBy: "",
    structure: [],
    endedOn,
    endedByReportId,
    updatedAt: stamp,
    deletedAt: null,
  })
  if (seed.run !== undefined) return { version: 1, attempts: [attempt(day(seed.run), null, null)], reports: [] }
  if (seed.slip !== undefined) {
    const a = attempt(day(seed.slip - 10), day(seed.slip), null)
    const r = { id: randomUUID(), attemptId: a.id, at: `${day(seed.slip)}T21:00:00`, wentThrough: true, thought: "x", ending: "stress", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: stamp, deletedAt: null }
    a.endedByReportId = r.id
    return { version: 1, attempts: [a], reports: [r] }
  }
  return null
}

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (!dir) return
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${dir}/${name}-top.png` })
  await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true })
}

/** Opens the tool with a fixed clock and the given browser state. */
async function open(page: Page, seed: Seed = {}, at = NOW) {
  await page.clock.install({ time: at })
  await page.goto(URL)
  await expect(page.getByTestId("day-card")).toBeVisible()
  const bb = box(seed)
  await page.evaluate(
    ({ bb, record }) => {
      if (bb) {
        localStorage.setItem("vice-blackbox-v1", JSON.stringify(bb))
        localStorage.removeItem("vice-blackbox-sent-v1")
      }
      if (record) {
        const q = JSON.parse(localStorage.getItem("quit-v1") ?? "{}")
        q.nicotine = { ...(q.nicotine ?? {}), record }
        localStorage.setItem("quit-v1", JSON.stringify(q))
      }
    },
    { bb, record: seed.record ? { quitDate: day(seed.record.off), goal: seed.record.goal, breakEnd: null, unit: null } : null },
  )
  await page.reload()
  await expect(page.getByTestId("day-card")).toBeVisible()
}

/** Opens every fold, outer ones first (a fold inside a closed one cannot be clicked). */
async function openFolds(page: Page) {
  for (let pass = 0; pass < 3; pass++) {
    const closed = page.locator("details:not([open]) > summary")
    for (let i = await closed.count(); i > 0; i--) await closed.first().click()
  }
}

const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))

test.describe("what you'll feel, and when @phone", () => {
  test("1 no date: Pick your day 1 with a link, five cards, no marker, no Now pill", async ({ page }) => {
    await open(page)
    await expect(page.getByTestId("day-none")).toHaveText("Pick your day 1 to see where you are.")
    await expect(page.getByTestId("date-link")).toHaveAttribute("href", /\/quit\/nicotine\/date/)
    for (const c of CARDS) await expect(page.getByTestId(`card-${c}`)).toBeVisible()
    for (const id of ["cue", "mood", "sleep"]) await expect(page.getByTestId(`band-${id}`)).toBeVisible()
    await expect(page.locator('[data-testid^="marker-"]')).toHaveCount(0)
    await expect(page.locator('[data-testid^="now-"]')).toHaveCount(0)
    await expect(page.getByTestId("right-now")).toHaveCount(0)
    await shot(page, "phone-no-date")
  })

  test("2 record date 3 days ahead: 3 days to go, no marker", async ({ page }) => {
    await open(page, { record: { off: 3, goal: "stop" } })
    await expect(page.getByTestId("day-ahead")).toHaveText("3 days to go. Day 1 is Sun, Nov 22.")
    await expect(page.getByTestId("day-card")).toContainText("Here is what most people feel in the first weeks.")
    await expect(page.locator('[data-testid^="marker-"]')).toHaveCount(0)
    await expect(page.locator('[data-testid^="now-"]')).toHaveCount(0)
  })

  test("3 living run from 4 days ago: Day 5, first-week line, markers, Now pills, cue not tested", async ({ page }) => {
    await open(page, { run: -4 })
    await expect(page.getByTestId("day-number")).toHaveText("Day 5")
    await expect(page.getByTestId("day-from")).toHaveText("Counted from Sun, Nov 15, your day 1.")
    await expect(page.getByTestId("right-now")).toContainText("The hardest week for most.")
    for (const id of ["cue", "mood", "sleep", "craving"]) await expect(page.getByTestId(`marker-${id}`)).toHaveAttribute("data-day", "5")
    await expect(page.getByTestId("now-mood")).toBeVisible()
    await expect(page.getByTestId("now-sleep")).toBeVisible()
    await expect(page.getByTestId("now-cue")).toHaveCount(0)
    await expect(page.getByTestId("phase-cue")).toHaveText("You are on day 5. Not tested before day 7.")
    // help starts folded, with how many ideas it holds
    await expect(page.getByTestId("help-mood")).not.toHaveAttribute("open", "")
    await expect(page.getByTestId("help-mood").locator("summary").first()).toContainText("What helps · 3 ideas")
    await shot(page, "phone-day5")
  })

  test("4 record date 20 days ago, no run: Day 21, the 8 to 28 line", async ({ page }) => {
    await open(page, { record: { off: -20, goal: "stop" } })
    await expect(page.getByTestId("day-number")).toHaveText("Day 21")
    await expect(page.getByTestId("right-now")).toContainText("settle somewhere between day 10 and week 4")
    await shot(page, "phone-day21")
  })

  test("5 day 36 and day 400", async ({ page }) => {
    await open(page, { run: -35 })
    await expect(page.getByTestId("day-number")).toHaveText("Day 36")
    await expect(page.getByTestId("phase-cue")).toContainText("Past the last day tested")
    await expect(page.getByTestId("right-now")).toContainText("past the 4 weeks")
    await shot(page, "phone-day36")
    await open(page, { run: -399 })
    await expect(page.getByTestId("day-number")).toHaveText("Day 400")
    await expect(page.getByTestId("right-now")).toContainText("Everyday urges keep fading over months")
    await expect(page.getByTestId("marker-craving")).toHaveAttribute("data-day", "400")
    await expect(page.getByTestId("craving-mark-3")).toHaveAttribute("data-reached", "true")
    await expect(page.getByTestId("phase-craving")).toContainText("Past month 12")
  })

  test("6 a slip, no later date: no run going, no marker", async ({ page }) => {
    await open(page, { slip: -21 })
    await expect(page.getByTestId("day-slip")).toHaveText("No run going since your slip on Thu 29 Oct.")
    await expect(page.getByTestId("slip-link")).toBeVisible()
    await expect(page.locator('[data-testid^="marker-"]')).toHaveCount(0)
    await expect(page.getByTestId("day-number")).toHaveCount(0)
  })

  test("7 every fold opens, every source link has an href, no placeholder text", async ({ page }) => {
    await open(page, { run: -4 })
    // open every fold, then every source tap (opening one can reveal more)
    await openFolds(page)
    const taps = page.getByRole("button", { name: /^Source$/ })
    for (let i = await taps.count(); i > 0; i--) await taps.first().click()
    await openFolds(page)
    await expect(page.locator("details:not([open])")).toHaveCount(0)
    const links = page.locator('a[href^="https://pubmed.ncbi.nlm.nih.gov/"]')
    expect(await links.count()).toBeGreaterThan(20)
    for (const a of await page.locator("a").all()) expect(await a.getAttribute("href")).toBeTruthy()
    for (const id of ["help-craving", "help-mood", "help-sleep", "help-hunger", "basis-craving", "basis-cue", "basis-mood", "basis-sleep", "basis-hunger"]) {
      await expect(page.getByTestId(id)).toHaveAttribute("open", "")
    }
    // the basis box lists who, how many, study, where, when and the caveat
    const dl = page.getByTestId("basis-craving").locator("dt")
    await expect(dl).toHaveText(["Who", "How many", "Study", "Where", "When", "Caveat"])
    const text = await page.locator("body").innerText()
    for (const bad of ["TODO", "undefined", "content coming", "NaN"]) expect(text).not.toContain(bad)
    await shot(page, "phone-day5-all-open")
  })

  test("8 storage is unchanged after a full visit", async ({ page }) => {
    await open(page, { run: -4, record: { off: -4, goal: "stop" } })
    const read = () => page.evaluate(() => ({ q: localStorage.getItem("quit-v1"), b: localStorage.getItem("vice-blackbox-v1"), s: localStorage.getItem("vice-blackbox-sent-v1") }))
    const before = await read()
    await openFolds(page)
    await page.clock.runFor(130_000)
    await page.reload()
    await expect(page.getByTestId("day-number")).toHaveText("Day 5")
    await page.clock.runFor(130_000)
    expect(await read()).toEqual(before)
  })

  test("9 no console error, no sideways scroll, tap targets, the menu row opens it", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page, { run: -4 })
    await noSideways(page)
    await openFolds(page)
    await noSideways(page)
    const small = await page.evaluate(() => {
      const out: string[] = []
      const els = Array.from(document.querySelectorAll("main a, main button, main summary")) as HTMLElement[]
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.height < 43.5) out.push(`${el.tagName} ${(el.textContent ?? "").trim().slice(0, 40)} ${Math.round(r.height)}`)
      }
      return out
    })
    expect(small).toEqual([])
    // the menu row opens it
    await page.goto(quitUrl("/quit/nicotine"))
    await page.getByRole("link", { name: /What you'll feel, and when/ }).click()
    await expect(page).toHaveURL(/\/quit\/nicotine\/symptoms/)
    await expect(page.getByTestId("day-card")).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false })
  test("1280 wide: no sideways scroll, the five cards show", async ({ page }) => {
    await open(page, { run: -20 })
    await expect(page.getByTestId("day-number")).toHaveText("Day 21")
    for (const c of CARDS) await expect(page.getByTestId(`card-${c}`)).toBeVisible()
    await noSideways(page)
    await shot(page, "desktop-day21")
  })
})
