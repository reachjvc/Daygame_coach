/**
 * QUIT TOOL 1, "YOUR QUIT DATE", WALKED ON A PHONE (acceptance 1 to 10 of Plans/quit-finish.md).
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00) so every day count is exact. Signed out for most;
 * one test signs in (the worker's own test-stack account) to see the run reach /api/black-box.
 */

import { readFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"

const URL = quitUrl("/quit/nicotine/date")
const NOW = new Date("2026-11-19T10:00:00")
const TODAY = "2026-11-19"

const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(NOW.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function open(page: Page, at = NOW) {
  await page.clock.install({ time: at })
  await page.goto(URL)
}
/** Taps and moves the page clock past the double-tap guard, so the next tap is a new one. */
async function tap(page: Page, id: string) {
  await page.getByTestId(id).click()
  await page.clock.runFor(300)
}
async function toDate(page: Page, goal: "stop" | "break" = "stop") {
  await tap(page, `goal-${goal}`)
  await tap(page, "goal-next")
}
async function throughUse(page: Page, unit = "vape", perDay = "1") {
  await tap(page, `chip-${unit}`)
  if (perDay) await page.getByTestId("use-perday").fill(perDay)
  await tap(page, "use-next")
}
async function toResult(page: Page) {
  await expect(page.getByTestId("plan-step-0")).toBeVisible()
  await tap(page, "plan-next")
  await expect(page.getByTestId("result")).toBeVisible()
}
async function stopOn(page: Page, chipOrDate: string) {
  await toDate(page)
  if (chipOrDate.startsWith("chip-")) await tap(page, chipOrDate)
  else await page.getByTestId("date-input").fill(chipOrDate)
  await tap(page, "date-next")
  await throughUse(page)
  await toResult(page)
}
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
const boxRuns = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("vice-blackbox-v1")
    const rec = raw ? JSON.parse(raw) : { attempts: [] }
    return (rec.attempts as { viceId: string; startedOn: string; endedOn: string | null; deletedAt: string | null }[]).filter((a) => a.viceId === "nicotine" && !a.deletedAt)
  })

test.describe("quit date, signed out", () => {
  test.use({ storageState: SIGNED_OUT })

  test("1 fresh: stop, today, vape, plan, result with calendar and three stretches", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    await expect(page.getByTestId("question")).toBeVisible()
    await expect(page.getByRole("progressbar")).toBeVisible()
    await toDate(page)
    await tap(page, "chip-today")
    await tap(page, "date-next")
    await throughUse(page, "vape", "1")
    // plan: five cards, step 3 shows the date, no tick boxes, no "above"
    await expect(page.locator('[data-testid^="plan-step-"]')).toHaveCount(5)
    await expect(page.getByTestId("plan-date")).toContainText("Thursday, November 19, 2026")
    await expect(page.getByRole("checkbox")).toHaveCount(0)
    await expect(page.locator("body")).not.toContainText(/above/i)
    await toResult(page)
    await expect(page.getByTestId("result-days")).toHaveText("Today is day 1.")
    await expect(page.getByTestId("cal-day-1")).toHaveAttribute("data-date", TODAY)
    await expect(page.getByTestId("cal-day-1")).toHaveAttribute("data-today", "true")
    for (const s of ["hard", "fade", "cue"]) {
      await tap(page, `stretch-${s}-basis-toggle`)
      await expect(page.getByTestId(`stretch-${s}-basis-detail`)).toContainText(/How many/)
    }
    await expect(page.getByTestId("stretch-hard-basis-detail")).toContainText(/single-author review/i)
    await expect(page.getByTestId("run-line")).toContainText("Your run started on Thursday, November 19, 2026")
    await expect(page.getByTestId("plan-change")).toHaveCount(0)
    await noSideways(page)
    expect(errors).toEqual([])
  })

  test("2 in 3 days: 3 days to go, calendar starts then; chips in date order", async ({ page }) => {
    await open(page)
    await toDate(page)
    const dates = await page.locator('[data-testid^="chip-"][data-date]').evaluateAll((els) => els.map((e) => e.getAttribute("data-date")))
    expect(dates).toEqual([...dates].sort())
    await tap(page, "chip-in3")
    await tap(page, "date-next")
    await throughUse(page)
    await toResult(page)
    await expect(page.getByTestId("result-days")).toHaveText("3 days to go.")
    await expect(page.getByTestId("cal-day-1")).toHaveAttribute("data-date", day(3))
    await expect(page.getByTestId("run-line")).toHaveCount(0)
    expect(await boxRuns(page)).toHaveLength(0)
    await expect(page.getByTestId("plan-change")).toBeVisible()
  })

  test("3 a date 30 days ahead shows the information lines, 20 does not, 43 is not allowed", async ({ page }) => {
    await open(page)
    await toDate(page)
    await page.getByTestId("date-input").fill(day(30))
    await expect(page.getByTestId("far-info")).toBeVisible()
    await tap(page, "ev-far-basis-toggle")
    await expect(page.getByTestId("ev-far-basis-detail")).toContainText("1,848")
    await expect(page.getByTestId("far-info")).not.toContainText(/warning/i)
    await page.getByTestId("date-input").fill(day(20))
    await expect(page.getByTestId("far-info")).toHaveCount(0)
    await expect(page.getByTestId("date-next")).toBeEnabled()
    await page.getByTestId("date-input").fill(day(43))
    await expect(page.getByTestId("date-next")).toBeDisabled()
    await page.getByTestId("date-input").fill(day(-365))
    await expect(page.getByTestId("date-next")).toBeEnabled()
    await page.getByTestId("date-input").fill(day(-366))
    await expect(page.getByTestId("date-next")).toBeDisabled()
  })

  test("4 a past date starts a living run in the browser Black Box: Day 21, no Change my date", async ({ page }) => {
    await stopOnPast(page)
    await expect(page.getByTestId("result-days")).toHaveText("Day 21.")
    await expect(page.getByTestId("plan-change")).toHaveCount(0)
    await expect(page.getByTestId("run-line")).toContainText("Your run started on")
    await expect.poll(async () => (await boxRuns(page)).map((r) => [r.startedOn, r.endedOn])).toEqual([[day(-20), null]])
    // a second visit does not start another
    await page.reload()
    await expect(page.getByTestId("result-days")).toHaveText("Day 21.")
    expect(await boxRuns(page)).toHaveLength(1)
  })

  test("5 a break: end date and countdown, then the break has ended", async ({ page }) => {
    await open(page)
    await toDate(page, "break")
    await tap(page, "chip-today")
    await tap(page, "date-next")
    await tap(page, "len-w2")
    await expect(page.getByTestId("end-chosen")).toContainText("December 3, 2026")
    await tap(page, "length-next")
    await throughUse(page)
    await toResult(page)
    await expect(page.getByTestId("break-end")).toContainText("December 3, 2026")
    await expect(page.getByTestId("break-left")).toHaveText("14 days left.")
    await expect(page.getByTestId("break-choices")).toHaveCount(0)
    await page.clock.setSystemTime(new Date("2026-12-04T10:00:00"))
    await page.reload()
    await expect(page.getByTestId("break-done")).toHaveText("The break has ended")
    await expect(page.getByTestId("break-stop")).toBeVisible()
    await expect(page.getByTestId("break-another")).toBeVisible()
    await expect(page.getByTestId("break-notnow")).toBeVisible()
    await tap(page, "break-stop")
    await expect(page.getByTestId("break-done")).toHaveCount(0)
    await expect(page.getByTestId("result-days")).toHaveText("Day 16.")
  })

  test("6 not ready: step 1, and no 'above' text", async ({ page }) => {
    await open(page)
    await tap(page, "goal-later")
    await tap(page, "goal-next")
    await expect(page.getByTestId("later-step")).toContainText("Name what it does for you")
    await expect(page.getByTestId("later-step")).toContainText("the 12 lies test")
    await expect(page.locator("body")).not.toContainText(/above|table above/i)
    await tap(page, "later-pick")
    await expect(page.getByTestId("chip-today")).toBeVisible()
  })

  test("7 price and count: 7,50 saves 7.50, empty count allowed, abc is refused", async ({ page }) => {
    await open(page)
    await toDate(page)
    await tap(page, "chip-today")
    await tap(page, "date-next")
    await tap(page, "chip-vape")
    await expect(page.getByTestId("use-price")).toHaveValue("14.07")
    await expect(page.getByTestId("use-price-basis")).toContainText("2022")
    await page.getByTestId("use-price").fill("abc")
    await expect(page.getByTestId("use-error-price")).toHaveText("Type a number, like 7.50")
    await expect(page.getByTestId("use-next")).toBeDisabled()
    await page.getByTestId("use-perday").fill("abc")
    await expect(page.getByTestId("use-error-perday")).toHaveText("Type a number, like 7.50")
    await page.getByTestId("use-perday").fill("")
    await page.getByTestId("use-price").fill("7,50")
    await expect(page.getByTestId("use-next")).toBeEnabled()
    await tap(page, "use-next")
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine.record)
    expect(rec.unit).toEqual({ id: "vape", perDay: null, priceUsd: 7.5, priceBasis: "typed" })
  })

  test("8 reload resumes on every screen, Back steps back, a double tap moves one screen", async ({ page }) => {
    await open(page)
    await tap(page, "goal-stop")
    // a double tap on Continue moves one screen only
    await page.getByTestId("goal-next").dblclick()
    await expect(page.getByTestId("chip-today")).toBeVisible()
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "2")
    await page.reload()
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "2")
    await tap(page, "chip-tomorrow")
    await tap(page, "date-next")
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "3")
    await page.reload()
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "3")
    await page.goBack()
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "2")
    await page.goForward()
    await tap(page, "screen-back")
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "2")
    await expect(page.getByTestId("chip-tomorrow")).toHaveAttribute("aria-checked", "true")
    await tap(page, "date-next")
    await tap(page, "use-skip")
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", "4")
    await page.reload()
    await expect(page.getByTestId("plan-step-0")).toBeVisible()
    await tap(page, "plan-next")
    await expect(page.getByTestId("result")).toBeVisible()
    await page.reload()
    await expect(page.getByTestId("result-days")).toHaveText("1 day to go.")
  })

  test("9 the .ics parses: one event, one reminder, stamp now, summary Day 1", async ({ page }) => {
    await open(page)
    await stopOn(page, "chip-in3")
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("cal-ics").click()])
    const ics = readFileSync((await download.path())!, "utf8")
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1)
    expect(ics).toContain("SUMMARY:Day 1")
    expect(ics).toContain(`DTSTART;VALUE=DATE:${day(3).replace(/-/g, "")}`)
    expect(ics).toContain("TRIGGER:-PT5H")
    const stamp = /DTSTAMP:(\d{8}T\d{6})Z/.exec(ics)![1]
    const at = Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8), +stamp.slice(9, 11), +stamp.slice(11, 13), +stamp.slice(13, 15))
    expect(Math.abs(at - NOW.getTime())).toBeLessThan(60_000)
    await expect(page.getByTestId("cal-google")).toHaveAttribute("href", /text=Day%201&dates=\d{8}\/\d{8}/)
  })

  test("10 no console error, no sideways scroll, tap targets 44px, desktop column", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    const small = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main button, main a, main input, main summary")]
          .filter((e) => e.offsetParent !== null)
          .map((e) => ({ t: e.getAttribute("data-testid") ?? e.textContent?.slice(0, 20), h: e.getBoundingClientRect().height }))
          .filter((x) => x.h < 43.5),
      )
    expect(await small()).toEqual([])
    await toDate(page)
    expect(await small()).toEqual([])
    await tap(page, "chip-today")
    await tap(page, "date-next")
    await tap(page, "chip-vape")
    expect(await small()).toEqual([])
    await tap(page, "use-next")
    await expect(page.getByTestId("plan-step-0")).toBeVisible()
    await tap(page, "plan-next")
    await expect(page.getByTestId("result")).toBeVisible()
    expect(await small()).toEqual([])
    await noSideways(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    const w = await page.getByTestId("result").evaluate((e) => e.getBoundingClientRect().width)
    expect(w).toBeLessThanOrEqual(640)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
    expect(errors).toEqual([])
    // the menu names the tool; it is a Soon row until it is in finished.json
    await page.goto(quitUrl("/quit/nicotine"))
    await expect(page.getByTestId("row-date")).toContainText("Your quit date")
  })

  test("the date screen is right at 1280 wide too", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await open(page)
    await toDate(page)
    await expect(page.getByTestId("chip-today")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  })
})

async function stopOnPast(page: Page) {
  await open(page)
  await stopOn(page, day(-20))
}

test.describe("quit date, signed in", () => {
  test("4 signed in: the run reaches /api/black-box", async ({ page }) => {
    await page.clock.install({ time: NOW })
    await page.goto(quitUrl("/quit/nicotine/symptoms"))
    // empty the worker's own account first
    const got = await page.request.get("/api/black-box")
    expect(got.ok()).toBe(true)
    const r = (await got.json()).rows as { attempts: { id: string }[]; reports: { id: string }[] }
    const buried = new Date(Date.now() + 5000).toISOString()
    const bury = <T extends object>(x: T) => ({ ...x, updated_at: buried, deleted_at: buried })
    if (r.attempts.length || r.reports.length) {
      expect((await page.request.put("/api/black-box", { data: { rows: { attempts: r.attempts.map(bury), reports: r.reports.map(bury) } } })).ok()).toBe(true)
    }
    await page.evaluate((rec) => {
      localStorage.setItem("vice-blackbox-v1", JSON.stringify(rec))
      localStorage.removeItem("vice-blackbox-sent-v1")
      localStorage.removeItem("quit-v1")
    }, { version: 1, attempts: [], reports: [] })
    await page.goto(URL)
    await stopOn(page, day(-20))
    await expect(page.getByTestId("result-days")).toHaveText("Day 21.")
    await expect
      .poll(
        async () => {
          const rows = (await (await page.request.get("/api/black-box")).json()).rows as { attempts: { started_on: string; ended_on: string | null; deleted_at: string | null; vice_id: string }[] }
          return rows.attempts.filter((a) => !a.deleted_at && a.vice_id === "nicotine").map((a) => [a.started_on, a.ended_on])
        },
        { timeout: 30000 },
      )
      .toEqual([[day(-20), null]])
  })
})
