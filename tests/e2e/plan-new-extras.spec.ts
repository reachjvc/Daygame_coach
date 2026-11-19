import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { Client } from "pg"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { ROUTES } from "@/src/shared/routes"
import { stackAdmin, testStackEnv } from "./fixtures/stack"

/**
 * THE EXTRA MODULES AND THE DAILY SIDE OF THE NEW VERSION (Plans/plan-in-steps.md, Phase 7), through the real
 * page on the copy space, at 390 x 844:
 *
 *   (a) from "Start as new", every extra module is walked screen by screen, and each Done summary shows what was made;
 *   (b) Today is used on two days (a week apart): tick a step, Log one, rate Feeling about life, write a day note;
 *   (c) a check-in is set up and run, from Today's due card;
 *   (d) after a reload everything is still there, on Today, Track, Journal and the plan home;
 *   (e) no screen is wider than the phone, and the owner's own rows are the same, table by table, after all of it.
 *
 * Phone screenshots of every new screen go to the shots folder (NN-module-screen.png).
 */

const expect = baseExpect.configure({ timeout: 45_000 })

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
test.describe.configure({ mode: "serial" })

const SHOTS = process.env.PLAN_NEW_SHOTS ?? path.join(os.homedir(), ".cache/daygame-research/plan-steps/new-shots-p7")
const NAV = 120_000
// The first rebuild lives one folder down since Phase 4 of Plans/plan-new-from-real.md: a path change only.
const BASE = `${ROUTES.planNew}/first`

const TABLES = [
  "life_plans", "life_plan_nodes", "life_plan_north_stars", "life_plan_areas", "life_plan_goals", "life_plan_goal_checkpoints",
  "life_plan_goal_obstacles", "life_plan_goal_beliefs", "life_plan_routines", "life_plan_routine_steps", "life_plan_routine_split_days",
  "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps", "life_plan_seasons", "life_plan_goal_feeds", "life_plan_goal_serves",
  "life_plan_routine_serves", "life_plan_step_serves", "life_plan_reviews", "life_plan_season_areas", "life_plan_season_goals",
  "life_plan_review_scores", "life_plan_review_goals", "life_plan_values", "life_plan_answers", "life_plan_days", "life_plan_day_ratings",
  "life_plan_day_ticks", "life_plan_day_journal", "life_plan_day_numbers", "life_plan_reminders",
]

async function fingerprint(userId: string): Promise<Record<string, string>> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    const out: Record<string, string> = {}
    for (const t of TABLES) {
      const { rows } = await db.query(
        `select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from public.${t} x where user_id = $1`,
        [userId],
      )
      out[t] = `${rows[0].n}:${rows[0].h}`
    }
    return out
  } finally {
    await db.end()
  }
}

async function giveCopySpace(ownerId: string): Promise<void> {
  const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true })
  if (error) throw new Error(`could not give the account a copy space: ${error.message}`)
}

let shot = 0
/** Layout problems found on the way; reported together at the end so one run shows them all. */
const problems: string[] = []
/** Check the screen is not wider than the phone, then keep a phone picture of it. */
async function look(page: Page, name: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, body: document.body.scrollWidth }))
  if (widths.scroll > widths.client || widths.body > widths.client) problems.push(`${name}: the page is wider than the phone (${widths.scroll} > ${widths.client})`)
  expect(new URL(page.url()).pathname.startsWith(BASE), `${name}: left ${BASE} (${page.url()})`).toBe(true)
  // Every button and link a thumb must hit is at least 44 px tall (inline text links inside a sentence excepted).
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, a[href]:not([href='/settings']), [role=button], input[type=checkbox]"))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (el instanceof HTMLInputElement && (el.closest("label")?.getBoundingClientRect().height ?? 0) >= 44) return false
        return r.width > 0 && r.height > 0 && r.height < 40
      })
      .map((el) => `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 24)}:${Math.round(el.getBoundingClientRect().height)}`),
  )
  if (small.length) problems.push(`${name}: tap targets under 40 px: ${small.join(" | ")}`)
  shot += 1
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${String(shot).padStart(2, "0")}-${name}.png`), fullPage: true })
}

const tid = (page: Page, id: string) => page.getByTestId(id)
const next = (page: Page) => tid(page, "next").click()
const open = async (page: Page, route: string, id: string) => {
  await page.goto(`${BASE}/${route}`, { timeout: NAV })
  await expect(tid(page, id)).toBeVisible({ timeout: NAV })
}
/** Add a line to a LineList with the test id prefix `list`. */
async function addLine(page: Page, list: string, text: string): Promise<void> {
  await tid(page, `${list}-draft`).fill(text)
  await tid(page, `${list}-add`).click()
}
/** Make the page believe it is `offsetDays` from now (before any script of the page runs). */
async function shiftClock(page: Page, offsetDays: number): Promise<void> {
  await page.addInitScript((offset) => {
    const Real = Date
    const shifted = offset * 86_400_000
    class Shifted extends Real {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(Real.now() + shifted)
        else super(...(args as [number]))
      }
      static now() {
        return Real.now() + shifted
      }
    }
    // @ts-expect-error the shifted class stands in for Date
    window.Date = Shifted
  }, offsetDays)
}

test.describe("the extra modules and the daily side", () => {
  test.beforeEach(async ({ account }) => {
    await giveCopySpace(account.id)
  })

  test("a brand-new user walks every extra module, uses Today on two days, runs a check-in, and a reload keeps it all", async ({ page, account }) => {
    test.setTimeout(900_000)
    shot = 0
    problems.length = 0
    const ownerBefore = await fingerprint(account.id)
    expect((await page.request.post("/api/plan-sandbox/reset")).status()).toBe(200)

    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    // All ten extra modules are listed with a status, and none says "coming soon".
    for (const id of ["standing", "values", "identity", "experiences", "obstacles", "routines", "questions", "rolemodels", "quit", "selfratings"]) {
      await expect(tid(page, `extra-${id}`)).toBeVisible()
    }
    await expect(page.getByText("Coming soon")).toHaveCount(0)
    await look(page, "home-extras")

    // ---- Things to have done
    await open(page, "experiences/list", "experiences-list")
    await look(page, "experiences-list")
    await addLine(page, "thing", "Learn to surf in Portugal")
    await addLine(page, "thing", "See the northern lights")
    await next(page)
    await expect(tid(page, "experiences-chase")).toBeVisible()
    await look(page, "experiences-chase")
    await tid(page, "skip").click()
    await expect(tid(page, "experiences-done")).toBeVisible()
    await expect(page.getByText("Learn to surf in Portugal")).toBeVisible()
    await look(page, "experiences-done")

    // ---- Quit something (gives Today a weekly count and the obstacles module a goal)
    await open(page, "quit/what", "quit-what")
    await look(page, "quit-what")
    await tid(page, "quit-chip-Sugar").click()
    await next(page)
    await expect(tid(page, "quit-days")).toBeVisible()
    await look(page, "quit-days")
    await tid(page, "quit-days-7").click()
    await next(page)
    await expect(tid(page, "quit-urge")).toBeVisible()
    await look(page, "quit-urge")
    await tid(page, "quit-urge-text").fill("Cold water, then a 10-minute walk")
    await next(page)
    await expect(tid(page, "quit-done")).toBeVisible()
    await expect(page.getByText("Quit: Sugar").first()).toBeVisible()
    await look(page, "quit-done")

    // ---- What could stop you
    await open(page, "obstacles/what", "obstacles-what")
    await look(page, "obstacles-what")
    await tid(page, "what-chip-1").click()
    await next(page)
    await expect(tid(page, "obstacles-goal")).toBeVisible()
    await look(page, "obstacles-goal")
    await page.locator('[data-testid^="goal-pick-"]').first().click()
    await next(page)
    await expect(tid(page, "obstacles-then")).toBeVisible()
    await look(page, "obstacles-then")
    await tid(page, "then-text").fill("Train at home for 20 minutes")
    await next(page)
    await expect(tid(page, "obstacles-help")).toBeVisible()
    await look(page, "obstacles-help")
    await tid(page, "help-text").fill("Tom: check I trained on Fridays")
    await next(page)
    await expect(tid(page, "obstacles-done")).toBeVisible()
    await expect(page.getByText("Train at home for 20 minutes")).toBeVisible()
    await look(page, "obstacles-done")

    // ---- Where you stand
    await open(page, "standing/dating", "standing-dating")
    await look(page, "standing-area")
    await tid(page, "standing-text").fill("Few dates; I freeze before I open")
    await next(page)
    await open(page, "standing/done", "standing-done")
    await expect(page.getByText("Few dates; I freeze before I open")).toBeVisible()
    await look(page, "standing-done")

    // ---- Values
    await open(page, "values/found", "values-found")
    await look(page, "values-found")
    await next(page)
    await expect(tid(page, "values-add")).toBeVisible()
    await addLine(page, "value-own", "Loyalty")
    await addLine(page, "value-own", "Freedom")
    await look(page, "values-add")
    await next(page)
    await expect(tid(page, "values-most")).toBeVisible()
    await tid(page, "most-Loyalty").click()
    await tid(page, "most-Freedom").click()
    await look(page, "values-most")
    await next(page)
    // Where does the first one show up: the quit goal serves it.
    await expect(tid(page, "values-where")).toBeVisible()
    await look(page, "values-where")
    await page.locator('[data-testid^="where-goal-"]').first().click()
    await next(page)
    await open(page, "values/done", "values-done")
    await expect(tid(page, "done-values-top")).toContainText("Loyalty")
    await look(page, "values-done")

    // ---- Who you are
    await open(page, "identity/who", "identity-who")
    await look(page, "identity-who")
    await tid(page, "identity-text").fill("I keep my word, even the small ones")
    await next(page)
    await expect(tid(page, "identity-lines")).toBeVisible()
    await addLine(page, "lines", "I go first.")
    await look(page, "identity-lines")
    await next(page)
    await expect(tid(page, "identity-when")).toBeVisible()
    await tid(page, "when-today").click()
    await look(page, "identity-when")
    await next(page)
    await expect(tid(page, "identity-done")).toBeVisible()
    await look(page, "identity-done")

    // ---- Routines: a morning routine every day, and a training routine three times a week
    await open(page, "routines/pick", "routines-pick")
    await look(page, "routines-pick")
    await tid(page, "routine-morning").click()
    await tid(page, "routine-training").click()
    await next(page)
    await expect(tid(page, "routines-steps")).toBeVisible()
    await look(page, "routines-steps")
    await tid(page, "lib-0").click()
    await addLine(page, "step", "Stretch hips").catch(() => undefined)
    await next(page)
    await expect(tid(page, "routines-when")).toBeVisible()
    for (let d = 0; d < 7; d++) await tid(page, `when-day-${d}`).click()
    await look(page, "routines-when")
    await next(page)
    await expect(tid(page, "routines-serves")).toBeVisible()
    await look(page, "routines-serves")
    await tid(page, "skip").click()
    await expect(tid(page, "routines-steps")).toBeVisible()
    await tid(page, "lib-0").click()
    await next(page)
    await expect(tid(page, "routines-when")).toBeVisible()
    await page.locator('[data-testid^="times-"][data-testid$="-3"]').first().click()
    await look(page, "routines-when-weekly")
    await next(page)
    await expect(tid(page, "routines-split")).toBeVisible()
    await look(page, "routines-split")
    await tid(page, "split-full_body").click().catch(() => page.locator('[data-testid^="split-"]').first().click())
    await next(page)
    await expect(tid(page, "routines-serves")).toBeVisible()
    await tid(page, "skip").click()
    await expect(tid(page, "routines-done")).toBeVisible()
    await look(page, "routines-done")

    // ---- Journal questions
    await open(page, "questions/pick", "questions-pick")
    await look(page, "questions-pick")
    await tid(page, "qset-end_of_day").click()
    await next(page)
    // Three questions in the set: each asks where it shows and what it is. Skip them all, keeping a picture of the first of each.
    await expect(tid(page, "questions-where")).toBeVisible()
    await look(page, "questions-where")
    await tid(page, "skip").click()
    await expect(tid(page, "questions-kind")).toBeVisible()
    await look(page, "questions-kind")
    for (let guard = 0; guard < 8 && !(await tid(page, "questions-done").isVisible()); guard++) {
      // each question step has its own address: wait for the next one instead of a fixed time
      const at = page.url()
      await tid(page, "skip").click()
      await expect(page).not.toHaveURL(at)
    }
    await expect(tid(page, "questions-done")).toBeVisible()
    await look(page, "questions-done")

    // ---- Daily ratings
    await open(page, "selfratings/pick", "selfratings-pick")
    await look(page, "selfratings-pick")
    await tid(page, "rating-own-draft").fill("How well did I sleep?")
    await tid(page, "rating-own-add").click()
    await next(page)
    await expect(tid(page, "selfratings-scale")).toBeVisible()
    await look(page, "selfratings-scale")
    await tid(page, "scale-ten").click()
    await next(page)
    await expect(tid(page, "selfratings-where")).toBeVisible()
    await look(page, "selfratings-where")
    await tid(page, "skip").click()
    await expect(tid(page, "selfratings-done")).toBeVisible()
    await expect(page.getByText("How great did life feel today?")).toBeVisible()
    await look(page, "selfratings-done")

    // ---- Role models
    await open(page, "rolemodels/pick", "rolemodels-pick")
    await look(page, "rolemodels-pick")
    await tid(page, "person-search").fill("Marcus")
    await page.locator('[data-testid^="person-"]:not([data-testid="person-search"])').first().click()
    await look(page, "rolemodels-pick-chosen")
    await next(page)
    await expect(tid(page, "rolemodels-take")).toBeVisible()
    await page.locator('[data-testid^="take-"]').first().click()
    await look(page, "rolemodels-take")
    await next(page)
    await expect(tid(page, "rolemodels-week")).toBeVisible()
    await page.locator('[data-testid^="week-"]:not([data-testid="week-clear"])').first().click()
    await look(page, "rolemodels-week")
    await next(page)
    await expect(tid(page, "rolemodels-remind")).toBeVisible()
    await tid(page, "remind-on").click()
    await look(page, "rolemodels-remind")
    await next(page)
    await expect(tid(page, "rolemodels-done")).toBeVisible()
    await look(page, "rolemodels-done")

    // ---- Home after the walk: every extra module started.
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    for (const id of ["experiences", "quit", "obstacles", "standing", "values", "identity", "routines", "questions", "selfratings", "rolemodels"]) {
      await expect(tid(page, `extra-${id}-chip`), id).not.toContainText("Not started")
    }
    await look(page, "home-extras-built")

    // ---- Today on the first day (a week ago, so the check-in below has a week to look back on).
    const day1 = await page.context().newPage()
    await shiftClock(day1, -7)
    await day1.goto(`${BASE}/today`, { timeout: NAV })
    await expect(tid(day1, "today")).toBeVisible({ timeout: NAV })
    await expect(tid(day1, "rating-f_feeling")).toBeVisible()
    await look(day1, "today-day1")
    await day1.locator('[data-testid^="tick-"]').first().click()
    await day1.locator('[data-testid^="log-"]').first().click()
    await tid(day1, "rating-f_feeling-4").click()
    await tid(day1, "day-note").fill("Slow morning, strong evening")
    await day1.locator('[data-testid^="answer-"]').first().fill("Talked to three people")
    await expect(tid(day1, "save-status")).toHaveAttribute("data-state", "saved", { timeout: 30_000 })
    await look(day1, "today-day1-filled")
    await day1.reload({ timeout: NAV })
    await expect(tid(day1, "rating-f_feeling-4")).toHaveAttribute("aria-pressed", "true")
    await expect(tid(day1, "day-note")).toHaveValue("Slow morning, strong evening")
    await day1.close()

    // ---- Today on the second day (now).
    await page.goto(`${BASE}/today`, { timeout: NAV })
    await expect(tid(page, "today")).toBeVisible({ timeout: NAV })
    await page.locator('[data-testid^="tick-"]').first().click()
    await page.locator('[data-testid^="log-"]').first().click()
    await page.locator('[data-testid^="log-"]').first().click()
    await tid(page, "rating-f_feeling-5").click()
    await tid(page, "day-note").fill("Good day")
    await expect(tid(page, "save-status")).toHaveAttribute("data-state", "saved", { timeout: 30_000 })
    await look(page, "today-day2-filled")

    // ---- Track and Journal show both days.
    await page.goto(`${BASE}/track`, { timeout: NAV })
    await expect(tid(page, "track")).toBeVisible({ timeout: NAV })
    await look(page, "track")
    await page.goto(`${BASE}/journal`, { timeout: NAV })
    await expect(tid(page, "journal")).toBeVisible({ timeout: NAV })
    const all = tid(page, "journal-all")
    await expect(all.getByText("Slow morning, strong evening")).toBeVisible()
    await expect(all.getByText("Good day")).toBeVisible()
    await expect(all.getByText("Talked to three people")).toBeVisible()
    await look(page, "journal")

    // ---- Review: set up the check-in (Sunday evening), then run it from the due card on Today.
    await page.goto(`${BASE}/review`, { timeout: NAV })
    await expect(tid(page, "review-setup-needed")).toBeVisible({ timeout: NAV })
    await look(page, "review-page-setup")
    await tid(page, "review-setup-go").click()
    await expect(tid(page, "review-day")).toBeVisible()
    await tid(page, "review-day-7").click()
    await next(page)
    await expect(tid(page, "review-time")).toBeVisible()
    await next(page)
    await expect(tid(page, "review-phone")).toBeVisible()
    await next(page)
    await expect(tid(page, "review-done")).toBeVisible()
    await page.goto(`${BASE}/today`, { timeout: NAV })
    await expect(tid(page, "due-review")).toBeVisible({ timeout: NAV })
    await look(page, "today-due-card")
    await tid(page, "due-review").getByRole("link").first().click()
    await expect(tid(page, "run-week")).toBeVisible({ timeout: NAV })
    await look(page, "review-run-week")
    await next(page)
    for (let guard = 0; guard < 5; guard++) {
      const frame = page.locator('[data-testid^="run-"]').first()
      await expect(frame).toBeVisible()
      const name = (await frame.getAttribute("data-testid")) ?? "run"
      if (name === "run-done") break
      await look(page, `review-${name}`)
      if (await tid(page, "skip").count()) await tid(page, "skip").click({ timeout: 10_000 }).catch(() => undefined)
      else await next(page)
      await page.waitForFunction((prev) => document.querySelector('[data-testid^="run-"]')?.getAttribute("data-testid") !== prev, name, { timeout: 30_000 })
    }
    await expect(tid(page, "run-done")).toBeVisible({ timeout: NAV })
    await look(page, "review-run-done")
    await page.goto(`${BASE}/review/done`, { timeout: NAV })
    await expect(page.getByText(/Week of/).first()).toBeVisible()
    await look(page, "review-history")
    await page.goto(`${BASE}/today`, { timeout: NAV })
    await expect(tid(page, "due-review")).toHaveCount(0)

    // ---- A reload keeps everything: Today (second day), Home chips, the questions and the lines.
    await page.reload({ timeout: NAV })
    await expect(tid(page, "rating-f_feeling-5")).toHaveAttribute("aria-pressed", "true")
    await expect(tid(page, "day-note")).toHaveValue("Good day")
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    await expect(tid(page, "extra-routines-chip")).toContainText(/Done|Needs a look/)
    await open(page, "values/done", "values-done")
    await expect(tid(page, "done-values-top")).toContainText("Freedom")

    // The owner's own plan was never touched: not a count or a byte different.
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
    expect(problems, problems.join("\n")).toEqual([])
  })
})
