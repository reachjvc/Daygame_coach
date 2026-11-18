/**
 * QUIT TOOLS, PHASE 7 FIXES, SIGNED IN (Black Box links).
 *
 * Adapted from the signed-in audit of 2026-11-18 (finding ids B-1 to B-4 in
 * the titles). Each test failed before its fix. The worker's own account is
 * emptied before each test, then given one living nicotine run.
 */

import { randomUUID } from "node:crypto"
import { test, expect } from "../fixtures/test"
import type { Page } from "@playwright/test"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as { beliefs: { id: string }[]; endings: { id: string }[] }
const t = tooltextJson
const A = "/quit/nicotine"
test.use({ viewport: { width: 390, height: 844 } })

const p2 = (n: number) => String(n).padStart(2, "0")
function dayOffset(off: number) {
  const d = new Date(Date.now() + off * 86400000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
function record(startOffset: number) {
  return {
    version: 1,
    attempts: [{ id: randomUUID(), viceId: "nicotine", label: "nicotine", startedOn: dayOffset(startOffset), startedBy: "", structure: [], endedOn: null, endedByReportId: null, updatedAt: new Date().toISOString(), deletedAt: null }],
    reports: [],
  }
}
interface Rows {
  attempts: { id: string; started_on: string; ended_on: string | null; deleted_at: string | null }[]
  reports: { id: string; attempt_id: string; at: string; went_through: boolean; deleted_at: string | null }[]
}
async function rows(page: Page): Promise<Rows> {
  const res = await page.request.get("/api/black-box")
  expect(res.ok()).toBe(true)
  return (await res.json()).rows
}
const liveReports = (r: Rows) => r.reports.filter((x) => !x.deleted_at)

async function seed(page: Page, startOffset: number) {
  await page.goto(`${A}/symptoms`)
  const r = await rows(page)
  if (r.attempts.length || r.reports.length) {
    const buried = new Date(Date.now() + 5000).toISOString()
    const bury = <T extends object>(x: T) => ({ ...x, updated_at: buried, deleted_at: buried })
    const res = await page.request.put("/api/black-box", { data: { rows: { attempts: r.attempts.map(bury), reports: r.reports.map(bury) } } })
    expect(res.ok()).toBe(true)
  }
  await page.evaluate((rec) => {
    localStorage.setItem("vice-blackbox-v1", JSON.stringify(rec))
    localStorage.removeItem("vice-blackbox-sent-v1")
  }, record(startOffset))
  await expect.poll(async () => (await rows(page)).attempts.filter((a) => !a.deleted_at).length, { timeout: 20000 }).toBeLessThanOrEqual(1)
}
async function sosToQuestion(page: Page) {
  await page.goto(`${A}/sos`)
  await page.getByTestId("chip-b4").click()
  await page.getByTestId("sos-continue").click()
  await page.getByTestId("sos-continue").click()
  await page.getByTestId("sos-to-question").click()
}
async function slipTo(page: Page, when: string) {
  await page.goto(`${A}/slip`)
  await page.getByTestId(`chip-${when}`).click()
  await page.getByTestId("slip-continue").click()
  await page.getByTestId(`chip-${data.endings[0].id}`).click()
  await page.getByTestId("slip-continue").click()
  await page.getByTestId("chip-b3").click()
}

test.describe("quit phase 7 fixes, signed in @phone", () => {
  test("B-1 a double tap on Yes files one close call", async ({ page }) => {
    await seed(page, -14)
    await sosToQuestion(page)
    await page.getByTestId("sos-yes").evaluate((el: HTMLElement) => {
      el.click()
      el.click()
    })
    await expect(page.getByTestId("sos-saved-text")).toHaveText(t.sos.savedClose, { timeout: 20000 })
    expect(liveReports(await rows(page))).toHaveLength(1)
  })

  test("B-1 a real double click files one, and Undo takes all of it", async ({ page }) => {
    await seed(page, -14)
    await sosToQuestion(page)
    await page.getByTestId("sos-yes").dblclick()
    await expect(page.getByTestId("sos-saved-text")).toHaveText(t.sos.savedClose, { timeout: 20000 })
    await page.getByTestId("sos-undo").click()
    await expect(page.getByTestId("sos-undone")).toBeVisible()
    await expect.poll(async () => liveReports(await rows(page)).length, { timeout: 20000 }).toBe(0)
  })

  test("B-1 a double tap on the slip Continue files one lapse", async ({ page }) => {
    await seed(page, -14)
    await slipTo(page, "today")
    await page.getByTestId("slip-finish").evaluate((el: HTMLElement) => {
      el.click()
      el.click()
    })
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.slip.saved, { timeout: 20000 })
    expect(liveReports(await rows(page))).toHaveLength(1)
  })

  test("a Yes waiting for a slow sign-in answer is cancelled by Back and No", async ({ page }) => {
    await seed(page, -14)
    await page.route("**/api/whoami", async (route) => {
      await new Promise((r) => setTimeout(r, 2500))
      await route.continue()
    })
    await sosToQuestion(page)
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("result")).toBeVisible()
    await page.goBack()
    await page.getByTestId("sos-no").click()
    await expect(page.getByTestId("sos-slip-link")).toBeVisible()
    await page.waitForResponse((r) => r.url().includes("/api/whoami"))
    // let the Black Box load and the filing effect run, then look: nothing was filed
    await page.waitForResponse((r) => r.url().includes("/api/black-box") && r.request().method() === "GET")
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)))
    expect(liveReports(await rows(page))).toHaveLength(0)
  })

  test("a Yes waiting for a slow sign-in answer is cancelled by Clear my answers", async ({ page }) => {
    await seed(page, -14)
    await page.route("**/api/whoami", async (route) => {
      await new Promise((r) => setTimeout(r, 2500))
      await route.continue()
    })
    await sosToQuestion(page)
    await page.getByTestId("sos-yes").click()
    await page.getByTestId("clear-answers").click()
    await page.waitForResponse((r) => r.url().includes("/api/whoami"))
    await page.waitForResponse((r) => r.url().includes("/api/black-box") && r.request().method() === "GET")
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)))
    expect(liveReports(await rows(page))).toHaveLength(0)
  })

  test("a lapse filed on an old run does not stop a new lapse on the new run", async ({ page }) => {
    await seed(page, -14)
    await slipTo(page, "today")
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.slip.saved, { timeout: 20000 })
    // a new run starts (as the "start the new run" link would make it)
    const newRun = randomUUID()
    await page.evaluate(
      ([id, today]) => {
        const rec = JSON.parse(localStorage.getItem("vice-blackbox-v1")!)
        rec.attempts.push({ id, viceId: "nicotine", label: "nicotine", startedOn: today, startedBy: "", structure: [], endedOn: null, endedByReportId: null, updatedAt: new Date().toISOString(), deletedAt: null })
        localStorage.setItem("vice-blackbox-v1", JSON.stringify(rec))
      },
      [newRun, dayOffset(0)],
    )
    await page.goto(`${A}/slip?s=3`)
    await page.getByTestId("slip-finish").click()
    await expect.poll(async () => liveReports(await rows(page)).filter((x) => x.attempt_id === newRun).length, { timeout: 25000 }).toBe(1)
  })

  test("B-3 a close call filed after the session is gone says it is on this phone only", async ({ page, context }) => {
    await seed(page, -14)
    await sosToQuestion(page)
    await context.clearCookies()
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("sos-saved-text")).toHaveText(t.blackbox.localOnly, { timeout: 20000 })
    await expect(page.getByText(t.sos.savedClose)).toHaveCount(0)
  })

  test("B-3 a lapse filed after the session is gone says it is on this phone only", async ({ page, context }) => {
    await seed(page, -14)
    await slipTo(page, "today")
    await context.clearCookies()
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.blackbox.localOnly, { timeout: 20000 })
    await expect(page.getByText(t.slip.saved, { exact: true })).toHaveCount(0)
  })

  test("B-4 a lapse dated before the run started says it was dated today", async ({ page }) => {
    await seed(page, 0)
    await slipTo(page, "yesterday")
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("slip-dated-today")).toHaveText(t.slip.datedToday)
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.slip.saved, { timeout: 20000 })
  })

  test("a lapse dated today after a run that started earlier carries no dated-today line", async ({ page }) => {
    await seed(page, -14)
    await slipTo(page, "today")
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.slip.saved, { timeout: 20000 })
    await expect(page.getByTestId("slip-dated-today")).toHaveCount(0)
  })
})
