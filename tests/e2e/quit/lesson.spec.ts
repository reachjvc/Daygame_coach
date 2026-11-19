/**
 * QUIT TOOL 11, "TODAY'S LESSON", WALKED ON A PHONE AND A COMPUTER (acceptance 1 to 9 of Plans/quit-finish.md).
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00) so every day count is exact. Signed out: the shared record
 * (`quit-v1`) and the Black Box (`vice-blackbox-v1`) are seeded in the browser before the page loads.
 */

import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"

const PATH = "/quit/nicotine/lesson"
const URL = quitUrl(PATH)
const NOW = new Date("2026-11-19T10:00:00")

const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(NOW.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

interface Seed {
  quitDate?: string
  goal?: "stop" | "break" | "later"
  runStart?: string
  /** A run that ended with a slip on this day (started 10 days before). */
  slipOn?: string
}

function box(s: Seed) {
  const stamp = new Date().toISOString()
  const attempts: unknown[] = []
  const reports: unknown[] = []
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
  if (s.slipOn) {
    const rid = randomUUID()
    const start = new Date(new Date(`${s.slipOn}T12:00:00`).getTime() - 10 * 86_400_000)
    const a = attempt(`${start.getFullYear()}-${p2(start.getMonth() + 1)}-${p2(start.getDate())}`, s.slipOn, rid) as { id: string }
    attempts.push(a)
    reports.push({ id: rid, attemptId: a.id, at: `${s.slipOn}T12:00:00`, wentThrough: true, thought: "", ending: "other", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: stamp, deletedAt: null })
  }
  if (s.runStart) attempts.push(attempt(s.runStart, null, null))
  return { version: 1, attempts, reports }
}

/** Seeds once per test (a session marker), so a reload keeps what the page itself saved. */
async function open(page: Page, s: Seed = {}, url = URL) {
  await page.clock.install({ time: NOW })
  const record = s.quitDate ? { quitDate: s.quitDate, goal: s.goal ?? "stop", breakEnd: null, unit: null } : null
  await page.addInitScript(
    ({ record, bb }) => {
      if (sessionStorage.getItem("lesson-seeded")) return
      sessionStorage.setItem("lesson-seeded", "1")
      localStorage.clear()
      if (record) localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { record } }))
      localStorage.setItem("vice-blackbox-v1", JSON.stringify(bb))
    },
    { record, bb: box(s) },
  )
  await page.goto(url)
  await expect(page.getByTestId("lesson-tool")).toBeVisible()
}

const noSideways = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))

async function smallTargets(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main button, main a, main textarea"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el: el.dataset.testid ?? el.textContent?.slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 44),
  )
}

test.describe("today's lesson, signed out, phone", () => {
  test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test("1 no date: the first lesson, the line that says why, a link to the date tool", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-3")
    await expect(page.getByTestId("nodate-line")).toContainText("The lessons follow your quit date")
    await expect(page.getByTestId("link-date")).toHaveAttribute("href", /\/quit\/nicotine\/date/)
    await expect(page.getByTestId("lesson-counted")).toContainText("1,848")
    await noSideways(page)
    expect(await smallTargets(page)).toEqual([])
    expect(errors).toEqual([])
  })

  test("2 a living run from 4 days ago: day 5, ringed on the strip, date shown", async ({ page }) => {
    await open(page, { quitDate: day(-4), runStart: day(-4) })
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "5")
    await expect(page.getByTestId("place")).toHaveText("Day 5 of 14")
    await expect(page.getByTestId("lesson-meta")).toHaveText("Thu, Nov 19")
    await expect(page.getByTestId("lesson-title")).toHaveText("The empty hour")
    await expect(page.locator('[data-testid="strip"] [data-now="true"]')).toHaveAttribute("data-day", "5")
    await expect(page.getByTestId("tomorrow")).toHaveText("Tomorrow: The break")
    await page.getByTestId("tomorrow").click()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "6")
  })

  test("3 a future date counts down; far ahead it waits, then opens the first lesson", async ({ page }) => {
    await open(page, { quitDate: day(2) })
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-2")
    await expect(page.getByTestId("place")).toHaveText("2 days before day 1")
  })

  test("3b ten days ahead: the start card and Read the first lesson now", async ({ page }) => {
    await open(page, { quitDate: day(10) })
    await expect(page.getByTestId("early")).toContainText("Your lessons start on Thu, Nov 26")
    await expect(page.getByTestId("early")).toContainText("Your quit date is in 10 days.")
    await page.getByTestId("read-first").click()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-3")
    await page.goBack()
    await expect(page.getByTestId("early")).toBeVisible()
  })

  test("4 the note saves as he types; done and not done keep it", async ({ page }) => {
    await open(page, { quitDate: day(0), runStart: day(0) })
    await page.getByTestId("note").fill("Five-minute walk after lunch")
    await expect(page.getByTestId("note-status")).toHaveText("Saved on this phone.")
    await page.reload()
    await expect(page.getByTestId("note")).toHaveValue("Five-minute walk after lunch")
    // a double tap marks done once and leaves it done
    await page.getByTestId("done-btn").dblclick()
    await expect(page.getByTestId("done-line")).toBeVisible()
    await expect(page.locator('[data-testid="strip"] [data-day="1"]')).toHaveAttribute("data-done", "true")
    await page.getByTestId("tab-all").click()
    await expect(page.getByTestId("day-row-1")).toHaveAttribute("data-done", "true")
    await page.getByTestId("day-row-1").click()
    await page.getByTestId("not-done").click()
    await expect(page.getByTestId("done-btn")).toBeVisible()
    await expect(page.getByTestId("note")).toHaveValue("Five-minute walk after lunch")
  })

  test("5 All days, a lesson, browser Back, reload stays", async ({ page }) => {
    await open(page, { quitDate: day(-4), runStart: day(-4) })
    await page.getByTestId("tab-all").click()
    await expect(page).toHaveURL(/tab=all/)
    await expect(page.getByTestId("day-list")).toContainText("Before day 1")
    await page.getByTestId("day-row-7").click()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "7")
    await page.reload()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "7")
    await page.getByTestId("next-lesson").click()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "8")
    await page.goBack()
    await expect(page.getByTestId("day-list")).toBeVisible()
    await page.reload()
    await expect(page.getByTestId("day-list")).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId("today")).toBeVisible()
  })

  test("6 past day 14: the end card with the exercise count", async ({ page }) => {
    await open(page, { quitDate: day(-20), runStart: day(-20) })
    await expect(page.getByTestId("end")).toContainText("That was the last lesson, on day 14.")
    // nothing marked done: no count that reads like a telling-off
    await expect(page.getByTestId("end-count")).toHaveCount(0)
    await expect(page.getByText("No new lesson today")).toHaveCount(0)
  })

  test("7 a slip after the quit date and no new day 1: back to the first lesson", async ({ page }) => {
    await open(page, { quitDate: day(-12), slipOn: day(-2) })
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "-3")
    await expect(page.getByTestId("slip-line")).toContainText("Your last run ended on Tue, Nov 17.")
  })

  test("8 every lesson shows a counted line and a source; the belief fold opens", async ({ page }) => {
    await open(page, { quitDate: day(-4), runStart: day(-4) })
    await page.getByTestId("tab-all").click()
    await page.getByTestId("day-row--3").click()
    for (let i = 0; i < 17; i++) {
      await expect(page.getByTestId("lesson-counted")).toBeVisible()
      const d = await page.getByTestId("lesson").getAttribute("data-day")
      if (d === "4") await expect(page.getByTestId("lesson")).not.toContainText("veterans")
      if (d === "11") await expect(page.getByTestId("lesson-body")).toContainText("3,609")
      if (i < 16) await page.getByTestId("next-lesson").click()
    }
    await page.getByTestId("belief-toggle").click()
    await expect(page.getByTestId("belief-detail")).toBeVisible()
    await noSideways(page)
  })

  test("9 the menu row opens the tool", async ({ page }) => {
    await page.clock.install({ time: NOW })
    await page.goto(quitUrl("/quit/nicotine"))
    await page.getByRole("link", { name: /Today's lesson/ }).click()
    await expect(page).toHaveURL(new RegExp(PATH))
    await expect(page.getByTestId("lesson-tool")).toBeVisible()
  })
})

test.describe("today's lesson, signed out, computer", () => {
  test.use({ storageState: SIGNED_OUT, viewport: { width: 1280, height: 800 } })

  test("the lesson in the page column, no sideways scroll, no console error", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await open(page, { quitDate: day(-4), runStart: day(-4) })
    const box = await page.getByTestId("lesson-tool").boundingBox()
    expect(box!.width).toBeLessThanOrEqual(640)
    await page.getByTestId("tab-all").click()
    await page.getByTestId("day-row-4").click()
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-day", "4")
    await noSideways(page)
    expect(errors).toEqual([])
  })
})
