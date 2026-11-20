import { test, expect as baseExpect } from "../../tests/e2e/fixtures/test"
import type { Page } from "@playwright/test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import * as ns from "@/src/goals/northStarService"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { ROUTES } from "@/src/shared/routes"
import { seedAndCopy, fingerprint } from "../../tests/e2e/helpers/planNewCopy"
import { SEQUENCES, nextScreen, screenRoute, type Sequence } from "@/src/goals/planSteps/planSequences"
import { SEQUENCE_KEY, SORTER_KEY } from "@/src/goals/planSteps/planFacts"
import { sorterOfPlan } from "@/src/goals/planSteps/planSorter"

const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000
const OUT = process.env.FILM_OUT ?? path.join(homedir(), ".cache/daygame-research/plan-steps/p7-film")

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "serial" })

/**
 * HOW THE MINUTES ARE ESTIMATED. The estimate is a model, not a stopwatch: 60 s per long text box (a paragraph), 15 s per
 * short line, 3 s per tap, one tap for each Next. Reading time is not counted. The person is a new user who does what each
 * screen asks, for three areas where a screen asks per area (the other areas are left blank), two goals, and one line per
 * system. Boxes per screen come from the split map's per-screen estimates (spec/split-map.md); each screen's
 * count of boxes the page actually draws is recorded beside them (`dom`) as a cross-check.
 *   L = long text boxes, S = short lines, T = taps (not counting Next).
 */
const SECONDS = { long: 60, short: 15, tap: 3 }
interface Job { L: number; S: number; T: number }
const JOBS: Record<string, Job> = {
  "star.vision": { L: 2, S: 0, T: 1 }, // paragraph, why; the horizon
  "star.self": { L: 4, S: 0, T: 0 }, // who you are, what you hold to, who to become, affirmations
  now: { L: 3, S: 3, T: 9 }, // per area x3: the 10, the snapshot; open, two scores, the focus
  pick: { L: 0, S: 0, T: 1 }, // one door
  systems: { L: 0, S: 3, T: 6 }, // one weekly line per area x3, add and open each
  milestones: { L: 0, S: 3, T: 6 }, // one line per area x3
  "season.one-thing": { L: 0, S: 4, T: 3 }, // the sentence, three lines of what has to happen; a date, save
  "season.why": { L: 2, S: 0, T: 0 },
  "season.who": { L: 1, S: 0, T: 13 }, // who you would have to be; about ten value taps and three areas
  "season.areas": { L: 0, S: 0, T: 3 },
  "season.order": { L: 0, S: 0, T: 3 },
  "values.so-far": { L: 0, S: 0, T: 1 },
  "values.lists": { L: 2, S: 0, T: 5 },
  "values.order": { L: 0, S: 0, T: 20 }, // about twenty pair taps
  "everything.driving-force": { L: 0, S: 0, T: 2 },
  "everything.plan": { L: 0, S: 0, T: 2 },
  "everything.links": { L: 0, S: 0, T: 3 },
  "everything.check": { L: 0, S: 0, T: 3 },
  "everything.commit": { L: 3, S: 0, T: 1 },
  track: { L: 0, S: 0, T: 1 },
  today: { L: 0, S: 0, T: 0 },
  journal: { L: 0, S: 0, T: 0 },
  "review.open": { L: 0, S: 0, T: 1 },
  "review.goals": { L: 0, S: 0, T: 2 },
  "review.write": { L: 3, S: 0, T: 3 },
}
/**
 * WHAT THE SCRIPT TYPES (the same short answers in every version), as boxes: the minutes of the typed set. V1's wheel asks for
 * the 10s, so it writes three; V2 and V3 score the areas (optional) and leave the 10s on Deepen. V3 adds a tap for each card.
 */
const TYPED: Record<string, (v: string) => Job> = {
  "star.vision": (v) => ({ L: 2, S: 0, T: 1 + (v === "v3" ? 1 : 0) }), // paragraph, why; the horizon; V3: the card's Not now
  now: (v) => ({ L: v === "v1" ? 3 : 0, S: 0, T: 9 }), // 3 areas: open, week score, day score; V1 also writes each 10
  "season.areas": (v) => ({ L: 0, S: 0, T: 1 + (v === "v3" ? 1 : 0) }), // one season area; V3: the card's Not now
  pick: () => ({ L: 0, S: 0, T: 1 }), // one door
  "season.one-thing": () => ({ L: 0, S: 1, T: 2 }), // the sentence; save
  systems: () => ({ L: 0, S: 2, T: 4 }), // two lines (one a one-off), open the area, add twice
}
const typedJob = (v: string, id: string): Job => TYPED[id]?.(v) ?? { L: 0, S: 0, T: 0 }
const secondsOf = (j: Job) => j.L * SECONDS.long + j.S * SECONDS.short + j.T * SECONDS.tap

interface ScreenRow {
  n: number
  /** What the script typed here; `job` is everything the screen asks for. */
  typed: Job
  typedSeconds: number
  id: string
  step: string
  deepenAfter?: boolean
  png: string
  job: Job
  seconds: number
  /** What the page draws: visible text areas and one-line inputs (a cross-check, not the estimate). */
  dom: { textareas: number; inputs: number }
  wideOverflow: boolean
}
interface VersionResult {
  version: string
  screensUntilToday: number
  /** Minutes of the typed set up to Today (the same answers in every version). */
  minutesUntilToday: number
  /** Minutes if every box on every screen up to Today is filled (the older model). */
  minutesFillEveryBox: number
  totalScreensOnPath: number
  totalScreens: number
  deepenScreens: number
  minutesWholePath: number
  todayHasItems?: boolean
  screens: ScreenRow[]
  copied?: { ok: boolean; screens: number; pageErrors: string[] }
}

const shot = async (page: Page, dir: string, n: number, id: string) => {
  const file = `${String(n).padStart(2, "0")}-${id}.png`
  await page.screenshot({ path: path.join(dir, file), fullPage: true })
  return file
}

async function domCounts(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("[data-testid^='sequence-']") ?? document.body
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const textareas = [...main.querySelectorAll("textarea")].filter(vis).length
    const inputs = [...main.querySelectorAll("input[type=text], input:not([type])")].filter(vis).length
    return { textareas, inputs }
  })
}

let todayItems = false
const AREAS = ns.emptyNsPlan().areas
const savedNow = (page: Page) => expect(page.getByTestId("save-status").first()).toHaveText(/Saved to your account\.|Saves to your account as you write\./, { timeout: 60_000 })

/** What a new user types on a screen: a short, realistic set of answers. Returns false when nothing is typed here. */
async function typeOn(page: Page, seq: Sequence, screenId: string): Promise<void> {
  const route = (id: string) => `${ROUTES.planNew}/${id}`
  const base = route(screenId)
  switch (screenId) {
    case "star.vision": {
      const box = page.locator("#north-star-paragraph")
      await box.fill("A life where I am fit, funded and free to travel, with a partner I love.")
      await page.locator("#star-star_why").fill("Because I want to respect the man I see in the mirror.")
      await page.locator("#star-star_why").blur()
      if (seq.prompts) await page.getByTestId("deeper-star-not-now").click()
      await savedNow(page)
      break
    }
    case "now": {
      for (const area of AREAS.slice(0, 3)) {
        await page.goto(`${base}?area=${area.id}`, { timeout: NAV })
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible({ timeout: NAV })
        if (seq.id === "v1") await dialog.locator("textarea").first().fill(`A clear picture of ${area.label.toLowerCase()} going well.`)
        // The score: this week's row, then today's.
        for (const row of await dialog.getByRole("button", { name: "6", exact: true }).all()) await row.click().catch(() => {})
        await page.waitForTimeout(500)
        await page.keyboard.press("Escape")
        await expect(dialog).toHaveCount(0)
      }
      await page.goto(base, { timeout: NAV })
      break
    }
    case "season.areas": {
      await page.getByRole("button", { name: new RegExp(`^${AREAS[0].label}\\.`) }).first().click()
      await page.waitForTimeout(600)
      if (seq.prompts) await page.getByRole("button", { name: "Not now" }).first().click()
      await savedNow(page)
      break
    }
    case "season.one-thing": {
      const box = page.getByTestId("sequence-season.one-thing").locator("textarea, input[type=text]").first()
      await box.fill("Run a half marathon by April.")
      await box.blur()
      const save = page.getByRole("button", { name: /^Save/ }).first()
      if (await save.isVisible().catch(() => false)) await save.click()
      await savedNow(page)
      break
    }
    case "systems": {
      await page.goto(`${base}?area=${AREAS[0].id}`, { timeout: NAV })
      const box = page.getByLabel(/^What you will actually do in /)
      await expect(box).toBeVisible({ timeout: NAV })
      for (const line of ["Run three times a week", "Two dates a month"]) {
        await box.fill(line)
        await box.press("Enter")
        await page.waitForTimeout(400)
      }
      await savedNow(page)
      await page.goto(base, { timeout: NAV })
      break
    }
  }
}

/** Walk the sequence's path with Next, typing the short answers and shooting each screen. */
async function walk(page: Page, seq: Sequence, dir: string | null, errors: string[], type = false): Promise<ScreenRow[]> {
  const rows: ScreenRow[] = []
  await page.goto(screenRoute(seq, seq.screens[0]), { timeout: NAV })
  let n = 0
  for (let screen = seq.screens[0]; ; ) {
    n += 1
    await expect(page.getByTestId(`sequence-${screen.id}`)).toBeVisible({ timeout: NAV })
    await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible()
    await page.waitForLoadState("networkidle").catch(() => {})
    if (type) await typeOn(page, seq, screen.id)
    if (type && screen.id === "today") todayItems = await page.getByText("Run three times a week").first().isVisible({ timeout: 20_000 }).catch(() => false)
    await page.waitForTimeout(300)
    const job = JOBS[screen.id] ?? { L: 0, S: 0, T: 0 }
    const typed = type ? typedJob(seq.id, screen.id) : { L: 0, S: 0, T: 0 }
    const next = nextScreen(seq, screen)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    rows.push({
      n,
      id: screen.id,
      step: screen.step,
      png: dir ? await shot(page, dir, n, screen.id) : "",
      typed,
      typedSeconds: secondsOf(typed) + (next ? SECONDS.tap : 0),
      job,
      seconds: secondsOf(job) + (next ? SECONDS.tap : 0),
      dom: await domCounts(page),
      wideOverflow: wide,
    })
    if (!next) break
    await page.getByTestId("next").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(screenRoute(seq, next))
    screen = next
  }
  void errors
  return rows
}

const version = (seq: Sequence, rows: ScreenRow[]): VersionResult => {
  const today = rows.findIndex((r) => r.id === "today")
  const upToToday = rows.slice(0, today + 1)
  return {
    version: seq.id,
    screensUntilToday: today + 1,
    minutesUntilToday: Math.round((upToToday.reduce((s, r) => s + r.typedSeconds, 0) / 60) * 10) / 10,
    minutesFillEveryBox: Math.round((upToToday.reduce((s, r) => s + r.seconds, 0) / 60) * 10) / 10,
    totalScreensOnPath: rows.length,
    totalScreens: rows.length + (seq.deepen?.length ?? 0),
    deepenScreens: seq.deepen?.length ?? 0,
    minutesWholePath: Math.round((rows.reduce((s, r) => s + r.typedSeconds, 0) / 60) * 10) / 10,
    screens: rows,
  }
}

const results: VersionResult[] = []

test.describe("filmstrips: a new user walks each version at 390 px", () => {
  for (const seq of SEQUENCES) {
    test(`${seq.id}: new user, every screen of the path`, async ({ page, account }) => {
      const dir = path.join(OUT, seq.id)
      rmSync(dir, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })
      await seedAndCopy(page, account.id, { ...ns.emptyNsPlan(), answers: { [SEQUENCE_KEY]: seq.id } }, { everyDayStep: false })
      const before = await fingerprint(account.id)
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      const rows = await walk(page, seq, dir, errors, true)
      const result = version(seq, rows)
      result.todayHasItems = todayItems
      results.push(result)
      expect(todayItems, "Today has the typed weekly line to tick").toBe(true)
      expect(errors).toEqual([])
      expect(await fingerprint(account.id)).toEqual(before)
    })
  }

  for (const seq of SEQUENCES) {
    test(`${seq.id}: copied full data, every screen of the path opens`, async ({ page, account }) => {
      const dir = path.join(OUT, `${seq.id}-copied`)
      rmSync(dir, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })
      const full = fullPlan()
      await seedAndCopy(page, account.id, { ...full, answers: { ...full.answers, [SEQUENCE_KEY]: seq.id } })
      const before = await fingerprint(account.id)
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      const rows = await walk(page, seq, dir, errors)
      const mine = results.find((r) => r.version === seq.id)
      if (mine) mine.copied = { ok: errors.length === 0, screens: rows.length, pageErrors: errors }
      expect(errors).toEqual([])
      expect(await fingerprint(account.id)).toEqual(before)
    })
  }
})

test.describe("filmstrips: the sorter on the Systems screen", () => {
  const line = "Two dates a month"
  for (const sorter of ["s1", "s2", "s3"] as const) {
    test(`${sorter}: type a line that reads like a one-off on Systems`, async ({ page, account }) => {
      const dir = path.join(OUT, `sorter-${sorter}`)
      rmSync(dir, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })
      const area = ns.emptyNsPlan().areas[0]
      await seedAndCopy(page, account.id, { ...ns.emptyNsPlan(), answers: { [SORTER_KEY]: sorter } }, { everyDayStep: false })
      expect(sorterOfPlan({ answers: { [SORTER_KEY]: sorter } })).toBe(sorter)
      await page.goto(`${ROUTES.planNew}/systems?area=${area.id}`, { timeout: NAV })
      const box = page.getByLabel(/^What you will actually do in /)
      await expect(box).toBeVisible({ timeout: NAV })
      await shot(page, dir, 1, "before")
      await box.fill(line)
      await shot(page, dir, 2, "typed")
      await box.press("Enter")
      if (sorter === "s3") {
        await expect(page.getByTestId("sorter-ask")).toBeVisible()
        await shot(page, dir, 3, "asks-first")
        await page.getByTestId("sorter-want").click()
        await expect(page.getByTestId("sorter-ask")).toHaveCount(0)
        await shot(page, dir, 4, "after-want-it-to-happen")
      } else if (sorter === "s2") {
        await expect(page.getByTestId("sorter-notice")).toBeVisible()
        await shot(page, dir, 3, "moved-with-undo")
        await page.getByTestId("sorter-undo").click()
        await expect(page.getByTestId("sorter-notice")).toHaveCount(0)
        await shot(page, dir, 4, "after-undo")
      } else {
        await page.waitForTimeout(1500)
        await shot(page, dir, 3, "after-silent-move")
      }
    })
  }
})

test.describe("filmstrips: the parts V2 and V3 add", () => {
  test("home with the Deepen list, a Deepen screen, and the go-deeper cards (V3, copied data)", async ({ page, account }) => {
    const dir = path.join(OUT, "extras")
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    let p = fullPlan()
    p = ns.setAreaReview(p, p.areas[1].id, { ten: "A picture of money." })
    await seedAndCopy(page, account.id, { ...p, answers: { ...p.answers, [SEQUENCE_KEY]: "v3" } })
    const health = p.areas[0]
    const goal = p.goals[0]
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await expect(page.getByTestId("deepen-list")).toBeVisible({ timeout: NAV })
    await shot(page, dir, 1, "home-top")
    await page.getByTestId("deepen-list").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(dir, "02-home-deepen-list.png"), fullPage: false })
    await page.goto(`${ROUTES.planNew}/values.order`, { timeout: NAV })
    await expect(page.getByTestId("back-to-deepen")).toBeVisible({ timeout: NAV })
    await shot(page, dir, 3, "deepen-screen-values-order")
    await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
    await expect(page.getByTestId("deeper-star")).toBeVisible({ timeout: NAV })
    await page.getByTestId("deeper-star").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(dir, "04-card-star.png") })
    await page.goto(`${ROUTES.planNew}/now?area=${health.id}`, { timeout: NAV })
    await expect(page.getByTestId("deeper-area")).toBeVisible({ timeout: NAV })
    await page.getByTestId("deeper-area").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(dir, "05-card-area.png") })
    await page.goto(`${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}`, { timeout: NAV })
    await expect(page.getByTestId("deeper-goal")).toBeVisible({ timeout: NAV })
    await page.getByTestId("deeper-goal").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(dir, "06-card-goal.png") })
  })
})

test.afterAll(() => {
  // A partial run (-g) has no results of every version: leave the last full summary alone.
  if (results.length < SEQUENCES.length) return
  mkdirSync(OUT, { recursive: true })
  const ordered = SEQUENCES.map((s) => results.find((r) => r.version === s.id)).filter(Boolean) as VersionResult[]
  const basis = [
    "Estimate basis: 60 s per long text box, 15 s per short line, 3 s per tap, one tap per Next; reading time is not counted.",
    "The walk TYPES the same short answers in every version: a north star line and its why, three areas scored (V1 also writes their three 10s; V2/V3 leave the 10s on Deepen), one season area, a door, the season sentence, two lines on Systems (one a one-off), and ends on Today with the weekly line to tick. V3 adds a tap for each go-deeper card. Minutes = that typed set.",
    "`Fill every box` is the older model: the minutes if every box on every screen up to Today is filled (three areas where a screen asks per area).",
    "Until Today works = every screen of the path up to and including Today, walked with Next.",
  ]
  writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ basis, seconds: SECONDS, versions: ordered }, null, 2))
  const table = ["| Version | Screens until Today | Minutes until Today (typed set) | Minutes if every box is filled | Screens on the path | Screens in all | Minutes, whole path (typed) | Today | Copied data |", "|---|---|---|---|---|---|---|---|---|"]
  for (const v of ordered) table.push(`| ${v.version.toUpperCase()} | ${v.screensUntilToday} | ${v.minutesUntilToday} | ${v.minutesFillEveryBox} | ${v.totalScreensOnPath} | ${v.totalScreens} (${v.deepenScreens} on the Deepen list) | ${v.minutesWholePath} | ${v.todayHasItems ? "items to tick" : "NO ITEMS"} | ${v.copied ? (v.copied.ok ? `ok, ${v.copied.screens} screens` : "ERRORS") : "not run"} |`)
  const md = [
    "# Versions to try: the walk at 390 px", "", ...basis.map((b) => `- ${b}`), "", ...table, "",
    ...ordered.flatMap((v) => [
      `## ${v.version.toUpperCase()}`, "",
      "| # | Screen | Typed L / S / T | Seconds (typed) | If every box is filled L / S / T | dom (areas / lines) | Wider than the phone |", "|---|---|---|---|---|---|---|",
      ...v.screens.map((r) => `| ${r.n} | ${r.id}${r.id === "today" ? " (Today works)" : ""} | ${r.typed.L} / ${r.typed.S} / ${r.typed.T} | ${r.typedSeconds} | ${r.job.L} / ${r.job.S} / ${r.job.T} | ${r.dom.textareas} / ${r.dom.inputs} | ${r.wideOverflow ? "YES" : "no"} |`),
      "",
    ]),
    "Filmstrips: `<version>/NN-<screen>.png`, `<version>-copied/`, `sorter-s1|s2|s3/`.", "",
  ].join("\n")
  writeFileSync(path.join(OUT, "summary.md"), md)
})
