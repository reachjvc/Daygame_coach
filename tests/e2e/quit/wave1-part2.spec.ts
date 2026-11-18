/**
 * QUIT TOOLS, WAVE 1 PART 2: CRAVING NOW, SYMPTOM GUIDE, SLIPPED.
 *
 * Signed out: a craving run to "Did it pass?" with a fake clock, a reload four
 * minutes into the wait, the symptom list and one symptom, a slip run. Signed
 * in (the worker's own test-backend account, never the owner's): a close call
 * and a lapse are filed in the Black Box and Undo takes them out again.
 * Every expected text is read from the data files at run time.
 * With QUIT_SHOTS_DIR set it also saves a screenshot of each screen.
 */

import { randomUUID } from "node:crypto"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import type { Page } from "@playwright/test"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as {
  beliefs: { id: string; short: string; need: string; counterpart: string; blackBoxEnding?: string }[]
  needs: { id: string; name: string; swaps: { id: string; text: string }[] }[]
  endings: { id: string; label: string }[]
  tapeForward: string[]
  symptomCourse: { symptom: string; peak: string | null; lasts: string; text: string }[]
  symptomHelp: { symptom: string; text: string }[]
  symptomWords: Record<string, string>
  symptomCourseNote: string
}
const t = tooltextJson
const A = "/quit/nicotine"
const BELIEF = data.beliefs[3] // "Just one won't hurt", need: substance
const NEED = data.needs.find((n) => n.id === BELIEF.need)!

test.use({ viewport: { width: 390, height: 844 } })

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

/** sos screens 1 to 3 for BELIEF, ending on the craving screen. */
async function sosToScreen3(page: Page) {
  await page.goto(quitUrl(`${A}/sos`))
  await expect(page.getByTestId("chip-other")).toBeVisible()
  for (const b of data.beliefs) await expect(page.getByTestId(`chip-${b.id}`)).toHaveText(b.short)
  await noSideways(page)
  await shot(page, "sos-1-voice")
  await page.getByTestId(`chip-${BELIEF.id}`).click()
  await page.getByTestId("sos-continue").click()
  // screen 2: the need is preselected from the belief
  await expect(page.getByTestId(`chip-${BELIEF.need}`)).toHaveAttribute("aria-checked", "true")
  await noSideways(page)
  await shot(page, "sos-2-need")
  await page.getByTestId("sos-continue").click()
  await expect(page.getByTestId("sos-counterpart")).toContainText(BELIEF.counterpart)
}

test.describe("quit wave 1 part 2, signed out @phone", () => {
  test.use({ storageState: SIGNED_OUT })

  test("craving run: voice, need, answer, swap, tape, wait, did it pass", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-18T10:00:00") })
    await page.clock.pauseAt(new Date("2026-11-18T10:00:01"))
    await sosToScreen3(page)

    await expect(page.getByTestId("sos-swap")).toContainText(NEED.swaps[0].text)
    await page.getByTestId("sos-another").click()
    await expect(page.getByTestId("sos-swap")).toContainText(NEED.swaps[1].text)
    await page.getByTestId("sos-another").click()
    await page.getByTestId("sos-another").click()
    await expect(page.getByTestId("sos-swap")).toContainText(NEED.swaps[0].text)
    await expect(page.getByText(t.sos.move5)).toBeVisible()
    for (const line of data.tapeForward) await expect(page.getByText(line)).toBeVisible()
    await shot(page, "sos-3-answer")

    await page.getByTestId("wait-start").click()
    await expect(page.getByTestId("wait-clock")).toHaveText("10:00")
    await page.clock.runFor(60_000)
    await expect(page.getByTestId("wait-clock")).toHaveText("09:00")
    await noSideways(page)
    await shot(page, "sos-3-waiting")
    await page.getByTestId("wait-stop").click()
    await expect(page.getByTestId("wait-start")).toBeVisible()
    await page.getByTestId("wait-start").click()
    await page.clock.runFor(10 * 60_000)
    await expect(page.getByTestId("wait-over")).toHaveText(t.sos.waitDone)

    await page.getByTestId("sos-to-question").click()
    await expect(page.getByText(t.sos.toQuestion)).toBeVisible()
    await shot(page, "sos-4-did-it-pass")
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("sos-next-time")).toHaveText(t.sos.nextTime)
    await expect(page.getByTestId("sos-saved")).toHaveCount(0)
    await noSideways(page)
    await shot(page, "sos-5-result-yes")
    // the footer carries no "Craving now?" link on this tool
    await expect(page.locator("footer a[href$='/sos']")).toHaveCount(0)
  })

  test("the wait keeps its time over a reload four minutes in, and shows no promise", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-18T10:00:00") })
    await page.clock.pauseAt(new Date("2026-11-18T10:00:01"))
    await sosToScreen3(page)
    await page.getByTestId("wait-start").click()
    await page.clock.runFor(4 * 60_000)
    await expect(page.getByTestId("wait-clock")).toHaveText("06:00")
    // the saved start time survives a reload; the page clock is set 4 minutes after it
    const startedAt = await page.evaluate(() => {
      const q = JSON.parse(window.localStorage.getItem("quit-v1") ?? "{}")
      return q.nicotine?.sos?.waitStartedAt as number
    })
    expect(typeof startedAt).toBe("number")
    await page.reload()
    await page.clock.setFixedTime(startedAt + 4 * 60_000)
    await page.reload()
    await expect(page.getByTestId("wait-clock")).toHaveText("06:00")
    // no sentence anywhere says how long a craving lasts
    const body = await page.locator("body").innerText()
    expect(body).not.toMatch(/lasts?|will pass|passes in|\d+ minutes to pass|go(es)? away in/i)
  })

  test("not passed leads to the slip tool", async ({ page }) => {
    await sosToScreen3(page)
    await page.getByTestId("sos-to-question").click()
    await page.getByTestId("sos-no").click()
    await expect(page.getByTestId("sos-slip-link")).toBeVisible()
    await shot(page, "sos-5-result-no")
    await page.getByTestId("sos-slip-link").click()
    await expect(page).toHaveURL(/\/quit\/nicotine\/slip/)
  })

  test("symptom guide: list, one symptom, sleep rules, no forum share", async ({ page }) => {
    await page.goto(quitUrl(`${A}/symptoms`))
    const list = page.getByTestId("symptom-list")
    await expect(list.locator("button")).toHaveCount(data.symptomCourse.length)
    await expect(page.getByTestId("symptom-tired")).toHaveCount(0)
    await noSideways(page)
    await shot(page, "symptoms-list")
    const sleep = data.symptomCourse.find((s) => s.symptom === "sleep")!
    await page.getByTestId("symptom-sleep").click()
    await expect(page.getByTestId("symptom-worst")).toHaveText(`Worst: ${sleep.peak}`)
    await expect(page.getByTestId("symptom-eases")).toHaveText(`Usually eases: ${sleep.lasts}`)
    await expect(page.getByTestId("symptom-detail")).not.toContainText(sleep.text)
    // the four rules below answer sleep, so its single help row is hidden
    await expect(page.getByTestId("symptom-help")).toHaveCount(0)
    await expect(page.getByTestId("sleep-rules").locator("li")).toHaveCount(4)
    await expect(page.getByTestId("symptom-detail")).toContainText(data.symptomCourseNote)
    await expect(page.getByTestId("symptom-detail")).toContainText(t.evidence.weak)
    await noSideways(page)
    await shot(page, "symptoms-detail-sleep")
    expect(await page.locator("body").innerText()).not.toMatch(/in 100 posts|posts mention|of posts/i)
    // browser Back returns to the list
    await page.goBack()
    await expect(page.getByTestId("symptom-list")).toBeVisible()
    await page.getByTestId("symptom-irritable").click()
    await expect(page.getByTestId("sleep-rules")).toHaveCount(0)
    await shot(page, "symptoms-detail-irritable")
    await page.getByTestId("symptom-back").click()
    await expect(page.getByTestId("symptom-list")).toBeVisible()
  })

  test("slip run: three taps, steps 1 to 3, a new day 1", async ({ page }) => {
    await page.goto(quitUrl(`${A}/slip`))
    await expect(page.getByTestId(`chip-${"today"}`)).toHaveText(t.slip.when.today)
    await shot(page, "slip-1-when")
    await page.getByTestId("chip-yesterday").click()
    await page.getByTestId("slip-continue").click()
    await expect(page.getByTestId(`chip-${data.endings[0].id}`)).toBeVisible()
    await shot(page, "slip-2-went-on")
    await page.getByTestId(`chip-${data.endings[0].id}`).click()
    await page.getByTestId("slip-continue").click()
    await page.getByTestId("chip-other").click()
    await page.getByTestId("slip-own").fill("x".repeat(120))
    expect((await page.getByTestId("slip-own").inputValue()).length).toBe(80)
    await shot(page, "slip-3-told")
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("result")).toBeVisible()
    // signed out: no Black Box line, links to take the tests
    await expect(page.getByTestId("slip-saved")).toHaveCount(0)
    await expect(page.getByTestId("slip-step1")).toContainText(t.slip.step1None)
    await expect(page.getByTestId("slip-step2")).toContainText(t.slip.step2None)
    await page.getByTestId("chip-tomorrow").click()
    await expect(page.getByTestId("slip-day1")).toContainText("Day 1:")
    await expect(page.getByTestId("slip-keep")).toHaveText("Every day you keep that promise to yourself is a complete success.")
    expect(await page.locator("body").innerText()).not.toMatch(/\breset\b|back to zero|start over|failed|blew it/i)
    await noSideways(page)
    await shot(page, "slip-4-result")
    // the day 1 choice survives a reload
    await page.reload()
    await expect(page.getByTestId("slip-day1")).toBeVisible()
  })

  test("slip result lists his top lies and swaps when he took those tools", async ({ page }) => {
    await page.goto(quitUrl(`${A}/slip`))
    await page.evaluate(
      ({ top, swap }) => {
        window.localStorage.setItem(
          "quit-v1",
          JSON.stringify({
            nicotine: {
              beliefs: { ratings: { [top]: 5 }, facts: {} },
              gives: { done: 1, picked: [], tried: { [swap]: { swapId: swap, triedOn: "2026-11-18" } }, rated: {} },
              slip: { done: 3, when: "today", ending: null, told: "other", ownWords: "", newDay1: null, reportId: null },
            },
          }),
        )
      },
      { top: data.beliefs[0].id, swap: data.needs[0].swaps[0].id },
    )
    await page.reload()
    await expect(page.getByTestId("slip-step1")).toContainText(data.beliefs[0].counterpart)
    await expect(page.getByTestId("slip-step2")).toContainText(data.needs[0].swaps[0].text)
  })
})

/** A record with one nicotine run still going, started two weeks ago, written the way the Black Box keeps it. */
function liveRun() {
  const started = new Date(Date.now() - 14 * 86400000)
  const p = (n: number) => String(n).padStart(2, "0")
  const day = `${started.getFullYear()}-${p(started.getMonth() + 1)}-${p(started.getDate())}`
  const stamp = new Date().toISOString()
  return {
    version: 1,
    attempts: [
      {
        id: randomUUID(),
        viceId: "nicotine",
        label: "Smoking or vaping",
        startedOn: day,
        startedBy: "",
        structure: [],
        endedOn: null,
        endedByReportId: null,
        updatedAt: stamp,
        deletedAt: null,
      },
    ],
    reports: [],
  }
}

interface Rows {
  attempts: { id: string; ended_on: string | null; deleted_at: string | null }[]
  reports: { id: string; went_through: boolean; thought: string; ending: string; did_instead: string; deleted_at: string | null }[]
}

async function serverRows(page: Page): Promise<Rows> {
  const res = await page.request.get("/api/black-box")
  expect(res.ok()).toBe(true)
  return (await res.json()).rows as Rows
}

/** Tombstones whatever the worker's account holds, so each test starts from an empty Black Box. */
async function emptyAccount(page: Page) {
  const rows = await serverRows(page)
  const buried = new Date(Date.now() + 5000).toISOString()
  const bury = <T extends object>(r: T) => ({ ...r, updated_at: buried, deleted_at: buried })
  if (rows.attempts.length === 0 && rows.reports.length === 0) return
  const res = await page.request.put("/api/black-box", {
    data: { rows: { attempts: rows.attempts.map(bury), reports: rows.reports.map(bury) } },
  })
  expect(res.ok()).toBe(true)
}

async function seedRun(page: Page) {
  await page.goto(quitUrl(`${A}/symptoms`))
  await emptyAccount(page)
  await page.evaluate((r) => {
    window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
    window.localStorage.removeItem("vice-blackbox-sent-v1")
  }, liveRun())
}

test.describe("quit wave 1 part 2, signed in with a living run @phone", () => {
  test("craving that passed is filed as a close call, and Undo takes it out", async ({ page }) => {
    await seedRun(page)
    await sosToScreen3(page)
    await page.getByTestId("sos-to-question").click()
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("sos-saved")).toContainText(t.sos.savedClose)
    await expect(page.getByTestId("sos-next-time")).toHaveCount(0)
    await shot(page, "sos-5-result-signed-in")
    await expect
      .poll(async () => (await serverRows(page)).reports.filter((r) => !r.deleted_at).length, { timeout: 20000 })
      .toBe(1)
    const rows = await serverRows(page)
    const report = rows.reports.find((r) => !r.deleted_at)!
    expect(report.went_through).toBe(false)
    expect(report.thought).toBe(BELIEF.short)
    expect(report.ending).toBe(BELIEF.blackBoxEnding)
    expect(report.did_instead).toBe(NEED.swaps[0].text)
    expect(rows.attempts.find((a) => !a.deleted_at)!.ended_on).toBeNull()

    await expect(page).toHaveURL(/s=5/)
    // the Black Box page itself holds the close call in its own record
    await page.goto("/plan/quit-vice")
    await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
    const local = await page.evaluate(() => (JSON.parse(window.localStorage.getItem("vice-blackbox-v1") ?? "{}").reports as { deletedAt: string | null }[]).filter((r) => !r.deletedAt).length)
    expect(local).toBe(1)

    await page.goto(quitUrl(`${A}/sos`))
    await expect(page.getByTestId("sos-saved")).toBeVisible()
    await page.getByTestId("sos-undo").click()
    await expect(page.getByTestId("sos-undone")).toHaveText(t.blackbox.undone)
    await expect
      .poll(async () => (await serverRows(page)).reports.filter((r) => !r.deleted_at).length, { timeout: 20000 })
      .toBe(0)
  })

  test("a slip ends the run in the Black Box, and Undo brings it back", async ({ page }) => {
    await seedRun(page)
    await page.goto(quitUrl(`${A}/slip`))
    await page.getByTestId("chip-today").click()
    await page.getByTestId("slip-continue").click()
    await page.getByTestId(`chip-${data.endings[0].id}`).click()
    await page.getByTestId("slip-continue").click()
    await page.getByTestId(`chip-${data.beliefs[2].id}`).click()
    await page.getByTestId("slip-finish").click()
    await expect(page.getByTestId("slip-saved")).toContainText(t.slip.saved)
    await expect(page.getByTestId("slip-new-run")).toHaveAttribute("href", "/plan/quit-vice")
    await shot(page, "slip-4-result-signed-in")
    await expect
      .poll(async () => (await serverRows(page)).reports.filter((r) => !r.deleted_at && r.went_through).length, { timeout: 20000 })
      .toBe(1)
    let rows = await serverRows(page)
    expect(rows.reports.find((r) => !r.deleted_at)!.thought).toBe(data.beliefs[2].short)
    expect(rows.attempts.find((a) => !a.deleted_at)!.ended_on).not.toBeNull()

    await page.getByTestId("slip-undo").click()
    await expect(page.getByTestId("slip-undone")).toBeVisible()
    await expect
      .poll(async () => (await serverRows(page)).attempts.find((a) => !a.deleted_at)?.ended_on ?? "alive", { timeout: 20000 })
      .toBe("alive")
    rows = await serverRows(page)
    expect(rows.reports.filter((r) => !r.deleted_at)).toHaveLength(0)
  })

  test("signed in without a run: a link to keep a record, nothing filed", async ({ page }) => {
    await page.goto(quitUrl(`${A}/symptoms`))
    await emptyAccount(page)
    await page.evaluate(() => window.localStorage.removeItem("vice-blackbox-v1"))
    await sosToScreen3(page)
    await page.getByTestId("sos-to-question").click()
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("sos-keep-record")).toHaveText(t.blackbox.keepRecord)
    await expect(page.getByTestId("sos-saved")).toHaveCount(0)
  })
})
