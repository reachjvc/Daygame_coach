import { test, expect as baseExpect } from "../../tests/e2e/fixtures/test"
import type { Page } from "@playwright/test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import * as ns from "@/src/goals/northStarService"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { ROUTES } from "@/src/shared/routes"
import { seedAndCopy, fingerprint } from "../../tests/e2e/helpers/planNewCopy"
import { SEQUENCES, nextScreen, screenRoute, sequenceById, type Sequence } from "@/src/goals/planSteps/planSequences"
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
const secondsOf = (j: Job) => j.L * SECONDS.long + j.S * SECONDS.short + j.T * SECONDS.tap

interface ScreenRow {
  n: number
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
  minutesUntilToday: number
  totalScreensOnPath: number
  totalScreens: number
  deepenScreens: number
  minutesWholePath: number
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

/** Walk the sequence's path with Next, shooting each screen. `shoot` false just proves it opens. */
async function walk(page: Page, seq: Sequence, dir: string | null, errors: string[]): Promise<ScreenRow[]> {
  const rows: ScreenRow[] = []
  await page.goto(screenRoute(seq, seq.screens[0]), { timeout: NAV })
  let n = 0
  for (let screen = seq.screens[0]; ; ) {
    n += 1
    await expect(page.getByTestId(`sequence-${screen.id}`)).toBeVisible({ timeout: NAV })
    await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible()
    await page.waitForLoadState("networkidle").catch(() => {})
    const job = JOBS[screen.id] ?? { L: 0, S: 0, T: 0 }
    const next = nextScreen(seq, screen)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    rows.push({
      n,
      id: screen.id,
      step: screen.step,
      png: dir ? await shot(page, dir, n, screen.id) : "",
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
    minutesUntilToday: Math.round((upToToday.reduce((s, r) => s + r.seconds, 0) / 60) * 10) / 10,
    totalScreensOnPath: rows.length,
    totalScreens: rows.length + (seq.deepen?.length ?? 0),
    deepenScreens: seq.deepen?.length ?? 0,
    minutesWholePath: Math.round((rows.reduce((s, r) => s + r.seconds, 0) / 60) * 10) / 10,
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
      const rows = await walk(page, seq, dir, errors)
      const result = version(seq, rows)
      results.push(result)
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
    "Persona: a new user who does what each screen asks, for three areas where a screen asks per area (the other areas stay blank), two goals, one line per system.",
    "Boxes per screen come from the split map's estimates; `dom` is what the page draws (visible text areas / one-line inputs), as a cross-check.",
    "Until Today works = every screen of the path up to and including Today, walked with Next.",
  ]
  writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ basis, seconds: SECONDS, versions: ordered }, null, 2))
  const table = ["| Version | Screens until Today | Minutes until Today | Screens on the path | Screens in all | Minutes, whole path | Copied data |", "|---|---|---|---|---|---|---|"]
  for (const v of ordered) table.push(`| ${v.version.toUpperCase()} | ${v.screensUntilToday} | ${v.minutesUntilToday} | ${v.totalScreensOnPath} | ${v.totalScreens} (${v.deepenScreens} on the Deepen list) | ${v.minutesWholePath} | ${v.copied ? (v.copied.ok ? `ok, ${v.copied.screens} screens` : "ERRORS") : "not run"} |`)
  const md = [
    "# Versions to try: the walk at 390 px", "", ...basis.map((b) => `- ${b}`), "", ...table, "",
    ...ordered.flatMap((v) => [
      `## ${v.version.toUpperCase()}`, "",
      "| # | Screen | L / S / T | Seconds | dom (areas / lines) | Wider than the phone |", "|---|---|---|---|---|---|",
      ...v.screens.map((r) => `| ${r.n} | ${r.id}${r.id === "today" ? " (Today works)" : ""} | ${r.job.L} / ${r.job.S} / ${r.job.T} | ${r.seconds} | ${r.dom.textareas} / ${r.dom.inputs} | ${r.wideOverflow ? "YES" : "no"} |`),
      "",
    ]),
    "Filmstrips: `<version>/NN-<screen>.png`, `<version>-copied/`, `sorter-s1|s2|s3/`.", "",
  ].join("\n")
  writeFileSync(path.join(OUT, "summary.md"), md)
})
