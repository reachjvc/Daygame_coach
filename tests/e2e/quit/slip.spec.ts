/**
 * QUIT TOOL 4, SLIPPED? RESTART TODAY (/quit/nicotine/slip), acceptance 1 to 11 of Plans/quit-finish.md.
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00) so every day count is exact. State lives in the browser
 * (`quit-v1`, `vice-blackbox-v1`); the signed-in test reaches the worker's own test-backend account.
 * Expected texts come from the data files. With QUIT_SHOTS_DIR set it saves a screenshot of each screen.
 */

import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"
import liveToolsJson from "../../../src/quit/data/liveTools.json"

const data = nicotineJson as unknown as {
  beliefs: { id: string; short: string; need: string; limiting: string; counterpart: string; proof: string }[]
  momentSwaps: { momentId: string; cards: string[] }[]
  needs: { id: string; name: string; swaps: { id: string; text: string }[] }[]
}
const t = tooltextJson.slip
const liveTools = liveToolsJson as string[]
const URL = quitUrl("/quit/nicotine/slip")
const NOW = new Date("2026-11-19T10:00:00")
const JUST_ONE = data.beliefs.find((b) => b.short === "Just one won't hurt")!
const CALMS = data.beliefs.find((b) => b.short === "It calms me down")!
const DRIVING = data.momentSwaps.find((m) => m.momentId === "driving")!.cards

const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(NOW.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function words(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MON[m - 1]}`
}

interface Attempt {
  id: string
  viceId: string
  label: string
  startedOn: string
  startedBy: string
  structure: string[]
  endedOn: string | null
  endedByReportId: string | null
  updatedAt: string
  deletedAt: string | null
}
function attempt(startOff: number, endOff: number | null = null, endedBy: string | null = null): Attempt {
  return { id: randomUUID(), viceId: "nicotine", label: "Smoking or vaping", startedOn: day(startOff), startedBy: "", structure: [], endedOn: endOff === null ? null : day(endOff), endedByReportId: endedBy, updatedAt: new Date().toISOString(), deletedAt: null }
}
function report(attemptId: string, off: number, o: { wentThrough?: boolean; where?: string; thought?: string } = {}) {
  return {
    id: randomUUID(),
    attemptId,
    at: `${day(off)}T12:00:00`,
    wentThrough: o.wentThrough ?? true,
    thought: o.thought ?? "",
    ending: "other",
    closeness: null,
    withWhom: "",
    where: o.where ?? "",
    factors: [] as string[],
    didInstead: "",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  }
}
const box = (attempts: Attempt[], reports: ReturnType<typeof report>[] = []) => ({ version: 1, attempts, reports })

interface Seed {
  box?: object
  /** The shared record: quit date and goal. */
  record?: { quitDate: string | null; goal: string | null }
  /** The quit date tool's own answers. */
  date?: object
}

/** Writes the browser state from a page that has no Black Box open, so nothing writes the old copy back. */
async function seed(page: Page, s: Seed = {}) {
  await page.goto(quitUrl("/quit/nicotine/symptoms"))
  await page.evaluate((x) => {
    localStorage.removeItem("quit-v1")
    localStorage.removeItem("vice-blackbox-sent-v1")
    if (x.box) localStorage.setItem("vice-blackbox-v1", JSON.stringify(x.box))
    else localStorage.removeItem("vice-blackbox-v1")
    const q: Record<string, Record<string, unknown>> = { nicotine: {} }
    if (x.record) q.nicotine.record = { ...x.record, breakEnd: null, unit: null }
    if (x.date) q.nicotine.date = x.date
    localStorage.setItem("quit-v1", JSON.stringify(q))
  }, s)
}
async function open(page: Page, s: Seed = {}, url = URL) {
  await page.clock.install({ time: NOW })
  await seed(page, s)
  await page.goto(url)
}
/** Clicks, then moves the page clock past the double-tap guard, so the next click is a new tap. */
async function tap(page: Page, id: string) {
  await page.getByTestId(id).click()
  await page.clock.runFor(300)
}
const step = (page: Page) => page.getByTestId("question")
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

interface Box {
  attempts: Attempt[]
  reports: { id: string; attemptId: string; at: string; wentThrough: boolean; thought: string; ending: string; where: string; deletedAt: string | null }[]
}
const readBox = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("vice-blackbox-v1") ?? '{"attempts":[],"reports":[]}') as never) as Promise<Box>
const liveRuns = async (page: Page) => (await readBox(page)).attempts.filter((a) => !a.deletedAt)
const liveReports = async (page: Page) => (await readBox(page)).reports.filter((r) => !r.deletedAt)
const quitDate = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine?.record?.quitDate ?? null) as Promise<string | null>

/** Yesterday, any place and any voice, a skipped answer each: the shortest way to the result. */
async function toResult(page: Page, o: { when?: string | null; where?: string | null; told?: string | null } = {}) {
  const when = o.when === undefined ? "yesterday" : o.when
  if (when) {
    await tap(page, `chip-${when}`)
    await tap(page, "slip-continue")
  }
  if (o.where) {
    await tap(page, `chip-${o.where}`)
    await tap(page, "slip-continue")
  } else await tap(page, "slip-skip")
  if (o.told) {
    await tap(page, `chip-${o.told}`)
    await tap(page, "slip-continue")
  } else await tap(page, "slip-skip")
  await expect(page.getByTestId("result")).toBeVisible()
}

const RUN20 = () => {
  const run = attempt(-20)
  return { box: box([run]), record: { quitDate: day(-20), goal: "stop" }, date: { goal: "stop", start: day(-20), done: 4 } }
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe("slipped, signed out @phone", () => {
  test.use({ storageState: SIGNED_OUT })

  test("1 a run 20 days old: Yesterday, In the car, Just one: days card, the lie, the driving cards, the slip in the Black Box", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page, RUN20())
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "3")
    await expect(page.getByTestId("screen-back")).toHaveCount(0)
    await expect(page.getByTestId("chip-today")).toBeVisible()
    await expect(page.getByTestId("chip-yesterday")).toBeVisible()
    await expect(page.getByTestId("chip-another")).toBeVisible()
    await expect(page.getByTestId("chip-week")).toHaveCount(0)
    await expect(page.getByTestId("slip-continue")).toBeDisabled()
    await noSideways(page)
    await shot(page, "p-1-when")
    await tap(page, "chip-yesterday")
    await tap(page, "slip-continue")
    await expect(step(page)).toHaveAttribute("data-step", "2")
    await expect(page.getByText(t.wentQuestion)).toBeVisible()
    await expect(page.locator('[data-testid^="chip-"]')).toHaveCount(data.momentSwaps.length + 1)
    await shot(page, "p-2-where")
    await tap(page, "chip-driving")
    await tap(page, "slip-continue")
    await expect(step(page)).toHaveAttribute("data-step", "3")
    await expect(page.getByText(t.toldQuestion)).toBeVisible()
    await expect(page.locator('[data-testid^="chip-"]')).toHaveCount(data.beliefs.length + 1)
    await tap(page, "chip-other")
    await expect(page.getByTestId("slip-own")).toBeVisible()
    await expect(page.getByLabel(t.ownWords)).toBeVisible()
    await shot(page, "p-3-voice-other")
    await tap(page, `chip-${JUST_ONE.id}`)
    await expect(page.getByTestId("slip-own")).toHaveCount(0)
    await tap(page, "slip-continue")

    const result = page.getByTestId("result")
    await expect(result).toBeVisible()
    await expect(result.getByRole("heading", { level: 2 })).toHaveText(t.resultHeading)
    await expect(page.getByTestId("days-line")).toHaveText(`Your run: ${words(day(-20))} to ${words(day(-1))}, 20 days. It stays in your record.`)
    await expect(page.getByTestId("days-basis")).toHaveText(t.daysBasis)
    await expect(page.getByTestId("days-all")).toHaveCount(0)
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.savedLocal)
    expect(await result.innerText()).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/)
    await expect(page.getByTestId("lie-counterpart")).toHaveText(JUST_ONE.counterpart)
    await expect(page.getByTestId("lie-card")).toContainText(JUST_ONE.limiting)
    await expect(page.getByTestId("lie-proof")).toHaveText(JUST_ONE.proof)
    await expect(page.getByTestId("lie-card")).toContainText("Counted:")
    await expect(page.getByTestId("lie-card").getByRole("button", { name: "Source" })).toBeVisible()
    await expect(page.getByTestId("swaps-place").getByTestId("swap-card")).toHaveText(DRIVING)
    await expect(page.getByTestId("day1-today")).toBeVisible()
    await expect(page.getByTestId("day1-tomorrow")).toBeVisible()
    await expect(page.getByTestId("day1-line")).toHaveCount(0)
    await expect(result).not.toContainText("Every day you keep")
    await expect(result.getByRole("link", { name: "Start the new run in your Black Box" })).toHaveCount(0)
    await expect(page.getByTestId("clear-answers")).toHaveCount(0)
    await expect(page.getByTestId("to-menu")).toHaveAttribute("href", /\/quit\/nicotine/)
    await noSideways(page)
    await shot(page, "p-4-result-lie-and-place")

    const reports = await liveReports(page)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ where: "driving", thought: JUST_ONE.short, ending: "justone", wentThrough: true })
    expect(reports[0].at.slice(0, 10)).toBe(day(-1))
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([[day(-20), day(-1)]])
    expect(errors).toEqual([])
  })

  test("2 a new day 1: Today starts a living run the date tool counts; Tomorrow takes it back out and sets the quit date", async ({ page }) => {
    await open(page, RUN20())
    await toResult(page)
    await tap(page, "day1-today")
    await expect(page.getByTestId("day1-line")).toHaveText(`Day 1: ${words(day(0))}`)
    await expect(page.getByTestId("day1-note")).toHaveText(t.startedToday)
    await expect(page.getByTestId("day1-today")).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("days-all")).toHaveText(`All your runs together: 21 days.`)
    await shot(page, "p-5-result-day1-today")
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([
      [day(-20), day(-1)],
      [day(0), null],
    ])
    expect(await quitDate(page)).toBe(day(0))
    // the date tool counts from the new run and does not try to restart one
    await page.goto(quitUrl("/quit/nicotine/date"))
    await expect(page.getByTestId("result-days")).toHaveText("Today is day 1.")
    await expect(page.getByTestId("run-refused")).toHaveCount(0)
    expect((await liveRuns(page)).filter((a) => a.endedOn === null)).toHaveLength(1)
    // back in the slip tool the result is still there: the living run is the one this visit started
    await page.goto(URL)
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("day1-today")).toHaveAttribute("aria-checked", "true")
    await tap(page, "day1-tomorrow")
    await expect(page.getByTestId("day1-line")).toHaveText(`Day 1: ${words(day(1))}`)
    await expect(page.getByTestId("day1-note")).toContainText(t.startsPre.trim())
    await expect(page.getByTestId("day1-note")).toContainText(t.startsLink)
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([[day(-20), day(-1)]])
    expect(await quitDate(page)).toBe(day(1))
    await shot(page, "p-6-result-day1-tomorrow")
  })

  test("3 Undo takes the slip out, the old run lives again, the new run is gone, the quit date is back", async ({ page }) => {
    await open(page, RUN20())
    await toResult(page, { where: "coffee", told: CALMS.id })
    await tap(page, "day1-today")
    await expect(page.getByTestId("slip-undo")).toBeVisible()
    await tap(page, "slip-undo")
    await expect(page.getByTestId("slip-undone")).toHaveText(tooltextJson.blackbox.undone)
    expect(await liveReports(page)).toHaveLength(0)
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([[day(-20), null]])
    expect(await quitDate(page)).toBe(day(-20))
    await shot(page, "p-7-undone")
    // a new visit begins at screen 1 with empty answers
    await page.goto(URL)
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByTestId("result")).toHaveCount(0)
  })

  test("4 after Tool 2 Yes the slip is already there: one question, no second filing", async ({ page }) => {
    await open(page, { box: box([attempt(-14)]) }, quitUrl("/quit/nicotine/sos"))
    await tap(page, "tile-voice")
    await tap(page, `chip-${JUST_ONE.id}`)
    await page.goBack()
    await tap(page, "finish")
    await tap(page, "ask-yes")
    await expect(page.getByTestId("result-yes")).toBeVisible()
    expect(await liveReports(page)).toHaveLength(1)
    await page.goto(URL)
    await expect(page.getByTestId("slip-in-record")).toHaveText(`Your slip on ${words(day(0))} is in your record.`)
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "1")
    await expect(page.getByText(t.wentQuestion)).toBeVisible()
    await expect(page.getByText(t.toldQuestion)).toHaveCount(0)
    await expect(page.getByText(t.whenQuestion)).toHaveCount(0)
    await shot(page, "p-8-case-b-where")
    await tap(page, "chip-coffee")
    await tap(page, "slip-continue")
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("slip-in-record")).toBeVisible()
    await expect(page.getByTestId("days-line")).toHaveText(`Your run: ${words(day(-14))} to ${words(day(0))}, 15 days. It stays in your record.`)
    await expect(page.getByTestId("lie-counterpart")).toHaveText(JUST_ONE.counterpart)
    await expect(page.getByTestId("swaps-place")).toContainText("With a coffee")
    await expect(page.getByTestId("slip-undo")).toHaveCount(0)
    await shot(page, "p-9-result-case-b")
    const reports = await liveReports(page)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ where: "coffee", thought: JUST_ONE.short, wentThrough: true })
    // opening the tool again files nothing new
    await page.goto(URL)
    await expect(page.getByTestId("result")).toBeVisible()
    expect(await liveReports(page)).toHaveLength(1)
  })

  test("4b a slip with nothing missing goes straight to the result", async ({ page }) => {
    const run = attempt(-14, -1)
    const slip = report(run.id, -1, { where: "driving", thought: JUST_ONE.short })
    run.endedByReportId = slip.id
    await open(page, { box: box([run], [slip]) })
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("slip-in-record")).toHaveText(`Your slip on ${words(day(-1))} is in your record.`)
    await expect(page.getByTestId("swaps-place")).toContainText("In the car")
    await expect(page.getByTestId("day1-today")).toBeVisible()
  })

  test("5 a run started today skips the date screen and the result offers Tomorrow only", async ({ page }) => {
    await open(page, { box: box([attempt(0)]), record: { quitDate: day(0), goal: "stop" } })
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "2")
    await expect(page.getByText(t.wentQuestion)).toBeVisible()
    await tap(page, "chip-stress")
    await tap(page, "slip-continue")
    await tap(page, "slip-skip")
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("days-line")).toHaveText(`Your run: ${words(day(0))} to ${words(day(0))}, 1 day. It stays in your record.`)
    await expect(page.getByTestId("day1-today")).toHaveCount(0)
    await tap(page, "day1-tomorrow")
    await expect(page.getByTestId("day1-line")).toHaveText(`Day 1: ${words(day(1))}`)
    await expect(page.getByTestId("swaps-place")).toContainText("When I’m stressed")
    const reports = await liveReports(page)
    expect(reports).toHaveLength(1)
    expect(reports[0].thought).toBe("")
    expect(reports[0].at.slice(0, 10)).toBe(day(0))
  })

  test("6 Another day: the date field refuses a day before the run's start; a run from yesterday offers no Another day", async ({ page }) => {
    await open(page, { box: box([attempt(-10)]) })
    await tap(page, "chip-another")
    const input = page.getByTestId("slip-date")
    await expect(input).toHaveAttribute("min", day(-10))
    await expect(input).toHaveAttribute("max", day(0))
    await expect(page.getByText(t.dateLabel)).toBeVisible()
    await expect(page.getByText(t.dateHelp.replace("{min}", words(day(-10))))).toBeVisible()
    await input.fill(day(-11))
    await expect(page.getByTestId("slip-date-error")).toHaveText(t.dateOut.replace("{min}", words(day(-10))))
    await expect(page.getByTestId("slip-continue")).toBeDisabled()
    await input.fill(day(1))
    await expect(page.getByTestId("slip-continue")).toBeDisabled()
    await input.fill(day(-10))
    await expect(page.getByTestId("slip-date-error")).toHaveCount(0)
    await expect(page.getByTestId("slip-continue")).toBeEnabled()
    await input.fill(day(-6))
    await shot(page, "p-10-another-day")
    await tap(page, "slip-continue")
    await toResult(page, { when: null })
    await expect(page.getByTestId("days-line")).toContainText(`to ${words(day(-6))}, 5 days`)
    // a run from yesterday: only today and yesterday
    await seed(page, { box: box([attempt(-1)]) })
    await page.goto(URL)
    await expect(page.getByTestId("chip-today")).toBeVisible()
    await expect(page.getByTestId("chip-yesterday")).toBeVisible()
    await expect(page.getByTestId("chip-another")).toHaveCount(0)
    // a close call filed yesterday keeps the same floor: nothing earlier is offered
    const run = attempt(-10)
    await seed(page, { box: box([run], [report(run.id, -2, { wentThrough: false })]) })
    await page.goto(URL)
    await tap(page, "chip-another")
    await expect(page.getByTestId("slip-date")).toHaveAttribute("min", day(-2))
  })

  test("7 no run and no quit date: where and voice, nothing saved, Tomorrow sets the date", async ({ page }) => {
    await open(page)
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "2")
    await expect(page.getByText(t.wentQuestion)).toBeVisible()
    await tap(page, "chip-stress")
    await tap(page, "slip-continue")
    await tap(page, `chip-${CALMS.id}`)
    await tap(page, "slip-continue")
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("no-run")).toHaveText(t.noRun)
    await expect(page.getByTestId("days-card")).toHaveCount(0)
    await expect(page.getByTestId("slip-undo")).toHaveCount(0)
    await expect(page.getByTestId("lie-counterpart")).toHaveText(CALMS.counterpart)
    await expect(page.getByTestId("swaps-place")).toBeVisible()
    await shot(page, "p-11-result-case-c")
    expect((await readBox(page)).attempts).toHaveLength(0)
    await tap(page, "day1-tomorrow")
    await expect(page.getByTestId("day1-line")).toHaveText(`Day 1: ${words(day(1))}`)
    expect(await quitDate(page)).toBe(day(1))
    expect((await readBox(page)).attempts).toHaveLength(0)
    // the finished result stays on a reload
    await page.reload()
    await expect(page.getByTestId("no-run")).toBeVisible()
    await expect(page.getByTestId("day1-tomorrow")).toHaveAttribute("aria-checked", "true")
  })

  test("7b a quit date in the past with no run starts the run on it, then asks the questions", async ({ page }) => {
    await open(page, { record: { quitDate: day(-5), goal: "stop" } })
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "3")
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([[day(-5), null]])
    await toResult(page, { when: "today" })
    await expect(page.getByTestId("days-line")).toContainText(`${words(day(-5))} to ${words(day(0))}, 6 days`)
  })

  test("8 a double tap on the last Continue files one slip; reload resumes on each screen; browser Back steps back", async ({ page }) => {
    await open(page, RUN20())
    await page.reload()
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await tap(page, "chip-yesterday")
    await tap(page, "slip-continue")
    await page.reload()
    await expect(step(page)).toHaveAttribute("data-step", "2")
    await tap(page, "chip-coffee")
    await tap(page, "slip-continue")
    await page.reload()
    await expect(step(page)).toHaveAttribute("data-step", "3")
    await page.goBack()
    await expect(step(page)).toHaveAttribute("data-step", "2")
    await expect(page.getByTestId("chip-coffee")).toHaveAttribute("aria-checked", "true")
    await page.goForward()
    await expect(step(page)).toHaveAttribute("data-step", "3")
    await tap(page, "screen-back")
    await expect(step(page)).toHaveAttribute("data-step", "2")
    await tap(page, "slip-continue")
    await tap(page, `chip-${CALMS.id}`)
    await page.getByTestId("slip-continue").dblclick()
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(step(page)).toHaveCount(0)
    expect(await liveReports(page)).toHaveLength(1)
    // reload on the result and a back step from it
    await page.reload()
    await expect(page.getByTestId("result")).toBeVisible()
    expect(await liveReports(page)).toHaveLength(1)
    await page.goBack()
    await expect(step(page)).toHaveAttribute("data-step", "3")
    await tap(page, `chip-${JUST_ONE.id}`)
    await tap(page, "slip-continue")
    // answering again changes the slip that is there; it never files a second one
    const reports = await liveReports(page)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ where: "coffee", thought: JUST_ONE.short })
  })

  test("9 after Tomorrow the next day starts the new run by itself and shows screen 1", async ({ page }) => {
    await open(page, RUN20())
    await toResult(page)
    await tap(page, "day1-tomorrow")
    expect(await quitDate(page)).toBe(day(1))
    await page.clock.setSystemTime(new Date(`${day(1)}T10:00:00`))
    await page.goto(URL)
    await expect(step(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByTestId("result")).toHaveCount(0)
    expect((await liveRuns(page)).map((a) => [a.startedOn, a.endedOn])).toEqual([
      [day(-20), day(-1)],
      [day(1), null],
    ])
    // the new run starts today, so the date screen is skipped
    await expect(page.getByText(t.wentQuestion)).toBeVisible()
  })

  test("11 no console error, no sideways scroll, every tap target 44 px, the menu row opens the tool", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    const small = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main button, main a, main input, main summary")]
          .filter((e) => e.offsetParent !== null)
          .map((e) => ({ t: e.getAttribute("data-testid") ?? e.textContent?.slice(0, 24), h: e.getBoundingClientRect().height }))
          .filter((x) => x.h < 43.5),
      )
    await open(page, RUN20())
    expect(await small()).toEqual([])
    await tap(page, "chip-another")
    expect(await small()).toEqual([])
    await tap(page, "chip-yesterday")
    await tap(page, "slip-continue")
    expect(await small()).toEqual([])
    await tap(page, "chip-driving")
    await tap(page, "slip-continue")
    await tap(page, "chip-other")
    expect(await small()).toEqual([])
    await tap(page, `chip-${JUST_ONE.id}`)
    await tap(page, "slip-continue")
    await tap(page, "day1-today")
    expect(await small()).toEqual([])
    await noSideways(page)
    await expect(page.getByTestId("result")).toBeVisible()
    await page.goto(quitUrl("/quit/nicotine"))
    await expect(page.getByTestId("row-slip")).toContainText("Slipped? Restart today")
    await expect(page.getByTestId("row-slip")).toContainText("Save the slip, keep your days, pick a new day 1.")
    // the row is a link once `slip` is in liveTools.json (the owner's shipping step); until then it is greyed "Soon"
    if (liveTools.includes("slip")) {
      await page.getByTestId("row-slip").click()
      await expect(page.getByTestId("slip")).toBeVisible()
    } else await expect(page.getByTestId("row-slip")).toHaveAttribute("data-soon", "true")
    expect(errors).toEqual([])
  })
})

test.describe("slipped, desktop", () => {
  test.use({ storageState: SIGNED_OUT, viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false })

  test("the same screens in the page column, flush with the heading", async ({ page }) => {
    await open(page, { ...RUN20(), date: undefined })
    const box1 = (await page.getByTestId("slip").boundingBox())!
    expect(box1.width).toBeLessThanOrEqual(640)
    expect(box1.x).toBeGreaterThan(300)
    const h = (await page.locator("h1").first().boundingBox())!
    expect(Math.abs(h.x - box1.x)).toBeLessThanOrEqual(2)
    await noSideways(page)
    await shot(page, "d-1-when")
    await tap(page, "chip-another")
    await shot(page, "d-1-when-another")
    await tap(page, "chip-yesterday")
    await tap(page, "slip-continue")
    await shot(page, "d-2-where")
    await tap(page, "chip-driving")
    await tap(page, "slip-continue")
    await tap(page, "chip-other")
    await shot(page, "d-3-voice-other")
    await tap(page, `chip-${JUST_ONE.id}`)
    await tap(page, "slip-continue")
    await expect(page.getByTestId("result")).toBeVisible()
    expect((await page.getByTestId("result").boundingBox())!.width).toBeLessThanOrEqual(640)
    await noSideways(page)
    await shot(page, "d-4-result")
    await tap(page, "day1-today")
    await shot(page, "d-5-result-day1")
    await tap(page, "slip-undo")
    await shot(page, "d-6-undone")
    // case B and case C look the same in the column
    await seed(page)
    await page.goto(URL)
    await toResult(page, { when: null, where: "coffee" })
    await shot(page, "d-7-result-case-c")
    await noSideways(page)
  })
})

test.describe("slipped, signed in @phone", () => {
  async function serverRows(page: Page) {
    const res = await page.request.get("/api/black-box")
    expect(res.ok()).toBe(true)
    return (await res.json()).rows as {
      attempts: { id: string; started_on: string; ended_on: string | null; deleted_at: string | null }[]
      reports: { id: string; went_through: boolean; thought: string; where_at: string; ending: string; deleted_at: string | null }[]
    }
  }

  test("10 the slip reaches /api/black-box, the status turns to Saved to your account, Undo takes it out", async ({ page }) => {
    await page.clock.install({ time: NOW })
    await page.goto(quitUrl("/quit/nicotine/symptoms"))
    const rows = await serverRows(page)
    const buried = new Date(Date.now() + 5000).toISOString()
    const bury = <T extends object>(r: T) => ({ ...r, updated_at: buried, deleted_at: buried })
    if (rows.attempts.length || rows.reports.length) {
      expect((await page.request.put("/api/black-box", { data: { rows: { attempts: rows.attempts.map(bury), reports: rows.reports.map(bury) } } })).ok()).toBe(true)
    }
    await page.evaluate((r) => {
      localStorage.removeItem("quit-v1")
      localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
      localStorage.removeItem("vice-blackbox-sent-v1")
    }, box([attempt(-20)]))
    await page.goto(URL)
    await expect(step(page)).toBeVisible({ timeout: 20000 })
    await toResult(page, { where: "driving", told: JUST_ONE.id })
    await expect(page.getByTestId("slip-saved-text")).toHaveText(t.savedAccount, { timeout: 20000 })
    await shot(page, "p-12-signed-in-saved")
    await expect
      .poll(async () => (await serverRows(page)).reports.filter((r) => !r.deleted_at && r.went_through).length, { timeout: 20000 })
      .toBe(1)
    const server = await serverRows(page)
    expect(server.reports.find((r) => !r.deleted_at)).toMatchObject({ thought: JUST_ONE.short, where_at: "driving", ending: "justone" })
    expect(server.attempts.find((a) => !a.deleted_at)!.ended_on).toBe(day(-1))
    await tap(page, "slip-undo")
    await expect(page.getByTestId("slip-undone")).toBeVisible()
    await expect.poll(async () => (await serverRows(page)).attempts.find((a) => !a.deleted_at)?.ended_on ?? "alive", { timeout: 20000 }).toBe("alive")
    expect((await serverRows(page)).reports.filter((r) => !r.deleted_at)).toHaveLength(0)
  })
})
