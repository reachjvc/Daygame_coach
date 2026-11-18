import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { Client } from "pg"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { seedLifePlan } from "./helpers/lifePlan"
import { stackAdmin, testStackEnv } from "./fixtures/stack"
import { rowsToPlan } from "@/src/goals/lifePlanMapper"
import { planStatus } from "@/src/goals/planSteps/planStatus"
import { todayISO } from "@/src/goals/northStarService"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import { CORE_IDS } from "@/src/goals/planSteps/planRoutes"

/**
 * THE NEW VERSION OF THE PLAN (Plans/plan-in-steps.md, Phase 6), through the real page on the copy space, at 390 x 844.
 *
 *   (a) a brand-new copy walks all six core modules to a working home; a reload keeps it all;
 *   (b) a copy of a seeded owner's plan shows the statuses the status function says, and every
 *       "needs a look" reason opens its screen in one tap;
 *   (c) no screen is wider than the phone (checked on every screen of both walks);
 *   (d) the owner's own rows are the same, table by table, after all of it.
 *
 * Phone screenshots of every screen of the new-user walk go to the shots folder (NN-module-screen.png).
 */

/** A dev server compiles each screen the first time it is opened. */
const expect = baseExpect.configure({ timeout: 45_000 })

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
test.describe.configure({ mode: "serial" })

const SHOTS = process.env.PLAN_NEW_SHOTS ?? path.join(os.homedir(), ".cache/daygame-research/plan-steps/new-shots")
const NAV = 120_000
const BASE = ROUTES.planNew

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
/** Check the screen is not wider than the phone, then keep a phone picture of it. */
async function look(page: Page, name: string, prefix = ""): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, body: document.body.scrollWidth }))
  expect(widths.scroll, `${name}: the page is wider than the phone`).toBeLessThanOrEqual(widths.client)
  expect(widths.body, `${name}: the body is wider than the phone`).toBeLessThanOrEqual(widths.client)
  // The address bar never leaves the new version.
  expect(new URL(page.url()).pathname.startsWith(BASE), `${name}: left ${BASE} (${page.url()})`).toBe(true)
  shot += 1
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${prefix}${String(shot).padStart(2, "0")}-${name}.png`), fullPage: true })
}

const tid = (page: Page, id: string) => page.getByTestId(id)
async function next(page: Page): Promise<void> {
  await tid(page, "next").click()
}

test.describe("the new version of the plan", () => {
  test.beforeEach(async ({ account }) => {
    await giveCopySpace(account.id)
  })

  test("a brand-new user walks all six core modules to a working home, and a reload keeps everything", async ({ page, account }) => {
    test.setTimeout(600_000)
    shot = 0
    const ownerBefore = await fingerprint(account.id)
    const reset = await page.request.post("/api/plan-sandbox/reset")
    expect(reset.status()).toBe(200)

    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-sandbox-banner")).toBeVisible({ timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    await look(page, "home-new")

    // ---- Areas: the eight he picked are there already; the summary opens in one tap, and each screen is reachable.
    await expect(tid(page, "core-areas")).toHaveAttribute("data-state", "done")
    await tid(page, "core-areas-open").click()
    await expect(tid(page, "areas-done")).toBeVisible()
    await expect(page.getByText("Dating & Daygame")).toBeVisible()
    await look(page, "areas-done")
    await page.goto(`${BASE}/areas/describe`, { timeout: NAV })
    await expect(tid(page, "areas-describe")).toBeVisible()
    await look(page, "areas-describe")
    await next(page)
    await expect(tid(page, "areas-order")).toBeVisible()
    await look(page, "areas-order")
    await tid(page, "order-health").click()
    await tid(page, "order-dating").click()
    await next(page)
    await expect(tid(page, "areas-done")).toBeVisible()
    // Pick: hide one, rename one, add one, come back.
    await page.getByRole("link", { name: "Change" }).first().click()
    await expect(tid(page, "areas-pick")).toBeVisible()
    await tid(page, "area-toggle-vices").click()
    await tid(page, "area-rename-lifestyle").click()
    await page.getByLabel("Area name").fill("Lifestyle and travel")
    await page.keyboard.press("Enter")
    await tid(page, "area-own").fill("Music")
    await tid(page, "area-own-add").click()
    await expect(tid(page, "area-toggle-vices")).toHaveAttribute("aria-pressed", "false")
    await look(page, "areas-pick")
    await next(page)
    await expect(tid(page, "areas-done")).toBeVisible()
    await expect(page.getByText("Lifestyle and travel")).toBeVisible()
    await expect(page.getByText("Music")).toBeVisible()
    // Put the hidden one back so later screens see the whole list.
    await page.getByRole("link", { name: "Change" }).first().click()
    await tid(page, "area-toggle-vices").click()
    await next(page)

    // ---- Direction
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "next-up")).toContainText("North star")
    await tid(page, "next-up-go").click()
    await expect(tid(page, "direction-picture")).toBeVisible()
    await look(page, "direction-picture")
    await expect(tid(page, "next")).toBeDisabled()
    await tid(page, "stuck-link").click()
    await look(page, "direction-picture-stuck")
    await tid(page, "stuck-link").click()
    await tid(page, "picture-text").fill("Health: strong and lean. Money: my own business that pays well. Relationship: a woman I love.")
    await next(page)
    await expect(tid(page, "direction-why")).toBeVisible()
    await tid(page, "why-text").fill("I am done watching life from the side")
    await look(page, "direction-why")
    await next(page)
    await expect(tid(page, "direction-big")).toBeVisible()
    await tid(page, "big-list-draft").fill("Run my own business")
    await tid(page, "big-list-add").click()
    await look(page, "direction-big")
    await next(page)
    await expect(tid(page, "direction-big-file")).toBeVisible({ timeout: NAV })
    await tid(page, "file-area-dating").click()
    await tid(page, "file-year").fill("2030")
    await look(page, "direction-big-file")
    await next(page)
    await expect(tid(page, "direction-big-why")).toBeVisible()
    await tid(page, "bigwhy-text").fill("So my kids grow up with options")
    await look(page, "direction-big-why")
    await next(page)
    await expect(tid(page, "direction-become")).toBeVisible()
    await tid(page, "become-title").fill("Calm under pressure")
    await tid(page, "become-for-" + (await page.locator('[data-testid^="become-for-"]').first().getAttribute("data-testid"))!.replace("become-for-", "")).click()
    await tid(page, "become-add").click()
    await expect(page.getByTestId(/^growth-/)).toHaveCount(1)
    await look(page, "direction-become")
    await next(page)
    await expect(tid(page, "direction-done")).toBeVisible()
    await look(page, "direction-done")

    // ---- Season
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "next-up")).toContainText("Season")
    await tid(page, "next-up-go").click()
    await expect(tid(page, "season-focus")).toBeVisible()
    await look(page, "season-focus")
    await tid(page, "season-text").fill("Get in shape and go on more dates")
    await next(page)
    await expect(tid(page, "season-big")).toBeVisible()
    await page.locator('[data-testid^="season-big-"]').first().click()
    await look(page, "season-big")
    await next(page)
    await expect(tid(page, "season-areas")).toBeVisible()
    await expect(page.locator('[data-testid^="season-area-"][aria-pressed="true"]')).toHaveCount(1)
    await tid(page, "season-area-health").click()
    await look(page, "season-areas")
    await next(page)
    await expect(tid(page, "season-areas-order")).toBeVisible()
    await tid(page, "order-health").click()
    await look(page, "season-areas-order")
    await next(page)
    await expect(tid(page, "season-end")).toBeVisible()
    await tid(page, "end-in-3").click()
    await expect(tid(page, "end-shown")).toBeVisible()
    await look(page, "season-end")
    await next(page)
    await expect(tid(page, "season-why")).toBeVisible()
    await tid(page, "season-why-text").fill("I am tired of waiting")
    await look(page, "season-why")
    await next(page)
    await expect(tid(page, "season-yes")).toBeVisible()
    await tid(page, "season-yes-text").fill("Gym before work, out every Saturday")
    await look(page, "season-yes")
    await tid(page, "im-in").click()
    await expect(tid(page, "season-done")).toBeVisible()
    await look(page, "season-done")

    // ---- Season goals: one for each season area.
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "next-up")).toContainText("Season goals")
    await tid(page, "next-up-go").click()
    await expect(tid(page, "goal-what")).toBeVisible()
    await tid(page, "goal-title").fill("Bench 100 kg")
    await look(page, "goals-what")
    await next(page)
    await expect(tid(page, "goal-kind")).toBeVisible()
    await tid(page, "kind-milestone_ladder").click()
    await look(page, "goals-kind")
    await next(page)
    await expect(tid(page, "goal-numbers")).toBeVisible()
    await tid(page, "num-unit").fill("kg")
    await tid(page, "num-now").fill("70")
    await tid(page, "num-target").fill("100")
    await expect(tid(page, "rung-preview")).toBeVisible()
    await look(page, "goals-numbers-target")
    await next(page)
    await expect(tid(page, "goal-first")).toBeVisible()
    await look(page, "goals-first")
    await tid(page, "first-lower").click()
    await expect(tid(page, "first-lowered")).toBeVisible()
    await next(page)
    await expect(tid(page, "goal-why")).toBeVisible()
    await tid(page, "goal-why-text").fill("So I stop going home alone")
    await look(page, "goals-why")
    await next(page)
    await expect(tid(page, "goal-feeds")).toBeVisible()
    await page.locator('[data-testid^="feeds-"]').first().click()
    await look(page, "goals-feeds")
    await next(page)
    await expect(tid(page, "goal-mark")).toBeVisible()
    await tid(page, "goal-reward").fill("A weekend in Lisbon")
    await look(page, "goals-mark")
    await next(page)
    await expect(tid(page, "goals-list")).toBeVisible()
    await look(page, "goals-list")
    // A Practice goal in the second season area, a Finish line in none: both kinds of numbers screens.
    await tid(page, "add-goal").click()
    await tid(page, "goal-title").fill("Talk to women")
    await tid(page, "goal-area-health").click()
    await next(page)
    await tid(page, "kind-habit_ramp").click()
    await next(page)
    await tid(page, "num-per").fill("4")
    await tid(page, "ease-yes").click()
    await expect(tid(page, "stages")).toBeVisible()
    await look(page, "goals-numbers-practice")
    await next(page)
    await expect(tid(page, "goal-first")).toBeVisible()
    await tid(page, "first-yes").click()
    await expect(tid(page, "goal-why")).toBeVisible()
    await page.goBack()
    await page.goto(`${BASE}/goals/list`, { timeout: NAV })
    await tid(page, "add-goal").click()
    await tid(page, "goal-title").fill("Launch the website")
    await next(page)
    await tid(page, "kind-achievement").click()
    await next(page)
    await tid(page, "tasks-draft").fill("Buy the domain")
    await tid(page, "tasks-add").click()
    await tid(page, "tasks-draft").fill("Write the pages")
    await tid(page, "tasks-add").click()
    await tid(page, "finish-by").fill(new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10))
    await tid(page, "spread").click()
    await look(page, "goals-numbers-finish")
    await next(page)
    await expect(tid(page, "goal-why")).toBeVisible()
    await page.goto(`${BASE}/goals/done`, { timeout: NAV })
    await expect(tid(page, "goals-done")).toBeVisible()
    await look(page, "goals-done")

    // ---- Weekly actions: the Practice goal already counts as weekly, so the home asks about the goals with none.
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "core-actions-chip")).toHaveAttribute("data-reason", "actions.goal-bare")
    await tid(page, "core-actions-chip").click()
    await expect(tid(page, "actions-goal")).toBeVisible()
    for (const title of ["Train", "Practise approaching", "Write the pages"]) {
      await tid(page, "action-title").fill(title)
      await tid(page, "times-3").click()
      await tid(page, "action-add").click()
      await expect(page.getByTestId(/^action-s/).getByText(title, { exact: true })).toBeVisible()
      if (title === "Train") await look(page, "actions-goal")
      const here = page.url()
      await next(page)
      await expect(page).not.toHaveURL(here)
    }
    await expect(tid(page, "actions-days")).toBeVisible()
    await page.locator('[data-testid^="day-"]').first().click()
    await look(page, "actions-days")
    await next(page)
    await expect(tid(page, "actions-protect")).toBeVisible()
    await page.locator('[data-testid^="protect-"]').first().click()
    await look(page, "actions-protect")
    await next(page)
    await expect(tid(page, "actions-done")).toBeVisible()
    await look(page, "actions-done")

    // ---- Review
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "next-up")).toContainText("Review")
    await tid(page, "next-up-go").click()
    await expect(tid(page, "review-day")).toBeVisible()
    await tid(page, "review-day-7").click()
    await look(page, "review-day")
    await next(page)
    await expect(tid(page, "review-time")).toBeVisible()
    await look(page, "review-time")
    await next(page)
    await expect(tid(page, "review-phone")).toBeVisible()
    await look(page, "review-phone")
    await next(page)
    await expect(tid(page, "review-done")).toBeVisible()
    await look(page, "review-done")

    // ---- Home: every core module Done, and a reload keeps it.
    await page.goto(BASE, { timeout: NAV })
    const states = async () => Object.fromEntries(await Promise.all(["areas", "direction", "season", "goals", "actions", "review"].map(async (m) => [m, await tid(page, `core-${m}`).getAttribute("data-state")])))
    const before = await states()
    expect(before, JSON.stringify(before)).toEqual({ areas: "done", direction: "done", season: "done", goals: "done", actions: "done", review: "done" })
    await expect(tid(page, "next-up")).toContainText("All set")
    await look(page, "home-built")
    await page.reload({ timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    await expect.poll(states).toEqual(before)
    await expect(tid(page, "counts")).toContainText("1 big goal")
    await page.goto(`${BASE}/read`, { timeout: NAV })
    await expect(tid(page, "read-all")).toBeVisible()
    await expect(tid(page, "read-star")).toContainText("a woman I love")
    await look(page, "read-all")

    // Every screen kept its address under the new version, and the owner's own plan was never touched.
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
  })

  test("after Copy my real plan in, the statuses are the status function's, and every reason opens its screen in one tap", async ({ page, account }) => {
    test.setTimeout(600_000)
    shot = 100
    await seedLifePlan(page, account.id, fullPlan())
    const ownerBefore = await fingerprint(account.id)
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })

    await tid(page, "plan-sandbox-copy").click()
    const copied = page.waitForResponse((r) => r.url().includes("/api/plan-sandbox/copy"))
    await tid(page, "plan-sandbox-confirm").click()
    expect((await copied).status()).toBe(200)
    // The banner reloads the page on the new version's own address; open it again so nothing of the old screen is read.
    await page.goto(BASE, { timeout: NAV })
    await expect(tid(page, "plan-home")).toBeVisible({ timeout: NAV })
    await expect(page).toHaveURL(new RegExp(`${BASE}$`))
    await look(page, "home-copy", "copy-")

    // What the copy holds, as the plan's own load reads it, run through the status function.
    const body = (await (await page.request.get("/api/life-plan?target=sandbox")).json()) as { plan: PlanRows | null }
    const plan = rowsToPlan(body.plan!)!
    const expected = planStatus({ plan, today: todayISO(), hour: new Date().getHours() })
    for (const id of CORE_IDS) {
      const state = expected.modules[id].lockedBy ? "locked" : expected.modules[id].state
      await expect(tid(page, `core-${id}`)).toHaveAttribute("data-state", state)
    }

    // Every reason: from the module's own summary, one tap on Fix lands on its screen.
    let reasons = 0
    for (const id of CORE_IDS) {
      const m = expected.modules[id]
      if (!m.started) continue
      for (const r of m.reasons) {
        await page.goto(`${BASE}/${id}/done`, { timeout: NAV })
        await expect(tid(page, `${id}-done`)).toBeVisible({ timeout: NAV })
        const fix = page.locator(`[data-testid="reason-fix"][href="${r.href}"]`).first()
        await expect(fix, `${r.id} has a Fix link`).toBeVisible()
        await fix.click()
        await expect(page).toHaveURL(new RegExp(`${r.href.replace(/[?]/g, "\\?")}$`))
        await expect(page.getByTestId(/^(screen|[a-z]+-[a-z-]+)$/).first()).toBeVisible({ timeout: NAV })
        await expect(page.getByText("This page could not be found")).toHaveCount(0)
        await look(page, `reason-${r.id}`, "copy-")
        reasons += 1
      }
    }
    expect(reasons).toBeGreaterThan(0)

    // The switch to the eight: asks first, then folds the twelve into them on the copy only.
    await page.goto(`${BASE}/areas/done`, { timeout: NAV })
    await tid(page, "switch-go").click()
    await tid(page, "switch-yes").click()
    await expect(tid(page, "switch-done")).toBeVisible()
    await look(page, "areas-switched", "copy-")
    await page.reload({ timeout: NAV })
    await expect(page.getByText("Dating & Daygame").first()).toBeVisible()
    await expect(tid(page, "switch-go")).toHaveCount(0)

    // The Next up card opens its screen, and the Read it all page shows the copied plan.
    await page.goto(BASE, { timeout: NAV })
    if (expected.nextUp) {
      await tid(page, "next-up-go").click()
      await expect(page).toHaveURL(new RegExp(expected.nextUp.href.replace(/[?]/g, "\\?") + "$"))
    }
    await page.goto(`${BASE}/read`, { timeout: NAV })
    await expect(tid(page, "read-all")).toBeVisible()
    await look(page, "read-copy", "copy-")

    // The owner's own rows: not a count or a byte different.
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
  })

  test("only an account with a copy space can open it, and a signed-out visit is sent to sign in", async ({ page, secondUser, browser }) => {
    const other = await browser.newContext({ storageState: secondUser.storageState })
    const p = await other.newPage()
    const res = await p.goto(`${BASE}`, { timeout: NAV })
    expect(res?.status()).toBe(404)
    const deep = await p.goto(`${BASE}/areas/pick`, { timeout: NAV })
    expect(deep?.status()).toBe(404)
    await other.close()
    void page
  })
})
