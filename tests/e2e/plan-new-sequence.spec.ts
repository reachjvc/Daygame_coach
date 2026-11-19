import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { Client } from "pg"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"
import { stackAdmin, testStackEnv } from "./fixtures/stack"
import { screensOf, screenRoute, sequenceById } from "@/src/goals/planSteps/planSequences"

/**
 * THE V1 SEQUENCE ON /plan/new/<screen> (Plans/plan-new-from-real.md, Phase 4), on the copy space.
 *
 *   (1) from /plan/new/star the Frame's Next walks the eight build steps in order; each has exactly one Next;
 *   (2) the four daily steps open full width with no Frame;
 *   (3) the plan home lists the twelve screens and links to the first rebuild;
 *   (4) no page error, and the owner's rows never move.
 */

/** A dev server compiles each page the first time it is opened. */
const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000

test.describe.configure({ mode: "serial" })

const TABLES = [
  "life_plans", "life_plan_nodes", "life_plan_north_stars", "life_plan_areas", "life_plan_goals", "life_plan_goal_checkpoints",
  "life_plan_goal_obstacles", "life_plan_goal_beliefs", "life_plan_routines", "life_plan_routine_steps", "life_plan_routine_split_days",
  "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps", "life_plan_seasons", "life_plan_goal_feeds", "life_plan_goal_serves",
  "life_plan_routine_serves", "life_plan_step_serves", "life_plan_reviews", "life_plan_season_areas", "life_plan_season_goals",
  "life_plan_review_scores", "life_plan_review_goals", "life_plan_values", "life_plan_answers", "life_plan_days", "life_plan_day_ratings",
  "life_plan_day_ticks", "life_plan_day_journal", "life_plan_day_numbers", "life_plan_reminders",
]

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

async function fingerprint(userId: string): Promise<Record<string, string>> {
  return withDb(async (db) => {
    const out: Record<string, string> = {}
    for (const t of TABLES) {
      const { rows } = await db.query(
        `select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from public.${t} x where user_id = $1`,
        [userId],
      )
      out[t] = `${rows[0].n}:${rows[0].h}`
    }
    return out
  })
}

const sandboxIdOf = async (ownerId: string) =>
  withDb(async (db) => (await db.query("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [ownerId])).rows[0]?.sandbox_user_id as string | null)

async function giveCopySpace(ownerId: string): Promise<void> {
  const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true })
  if (error) throw new Error(`could not give the account a copy space: ${error.message}`)
}

/** The owner's full plan plus a routine step that runs every day (so Today has a box to tick), copied into the copy space. */
async function seedAndCopy(page: Page, ownerId: string): Promise<string> {
  await giveCopySpace(ownerId)
  const full = fullPlan()
  const extra = (planWithSteps([{ id: "s_e2e", title: "E2E cold shower", daysPerWeek: 7 }]) as { routines: object[] }).routines[0]
  await seedLifePlan(page, ownerId, { ...full, routines: [...full.routines, { ...extra, id: "r_e2e" }] })
  expect((await page.request.post("/api/plan-sandbox/reset")).status()).toBe(200)
  expect((await page.request.post("/api/plan-sandbox/copy")).status()).toBe(200)
  const id = await sandboxIdOf(ownerId)
  if (!id) throw new Error("no copy space")
  return id
}

const V1 = sequenceById("v1")

test.describe("the V1 sequence on /plan/new/<screen>", () => {
  test("the Frame's Next walks the build steps, the daily steps open without a Frame, and the owner is untouched", async ({ page, account }) => {
    test.setTimeout(900_000)
    await seedAndCopy(page, account.id)
    const ownerBefore = await fingerprint(account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))

    const build = V1.screens.filter((s) => s.kind === "build")
    const daily = V1.screens.filter((s) => s.kind === "daily")
    await page.goto(screenRoute(V1, build[0]), { timeout: NAV })
    for (let i = 0; i < build.length; i++) {
      const here = build[i]
      await expect(page.getByTestId(`sequence-${here.id}`)).toBeVisible({ timeout: NAV })
      expect(new URL(page.url()).pathname).toBe(screenRoute(V1, here))
      await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: NAV })
      // One Next, and the Frame's Back and save state beside it.
      await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(1)
      await expect(page.getByTestId("back")).toHaveCount(1)
      await expect(page.getByTestId("save-status").first()).toBeVisible()
      await page.getByTestId("next").click()
      const after = V1.screens[V1.screens.findIndex((s) => s.id === here.id) + 1]
      await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(screenRoute(V1, after))
    }
    // The last build step's Next opens the first daily step.
    for (const d of daily) {
      await page.goto(screenRoute(V1, d), { timeout: NAV })
      await expect(page.getByTestId(`sequence-${d.id}`)).toBeVisible({ timeout: NAV })
      await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: NAV })
      await expect(page.getByTestId("next")).toHaveCount(0)
      await expect(page.getByTestId("back")).toHaveCount(0)
      await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    }
    // Back from the second build step returns to the first.
    await page.goto(screenRoute(V1, build[1]), { timeout: NAV })
    await page.getByTestId("back").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(screenRoute(V1, build[0]))
    expect(errors).toEqual([])
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("the plan home lists the twelve screens in order and links to the first rebuild", async ({ page, account }) => {
    test.setTimeout(240_000)
    await seedAndCopy(page, account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(ROUTES.planNew, { timeout: NAV })
    const home = page.getByTestId("sequence-home")
    await expect(home).toBeVisible({ timeout: NAV })
    const hrefs = await home.locator("ol a").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname))
    expect(hrefs).toEqual(screensOf("v1").map((s) => screenRoute(V1, s)))
    await home.getByTestId("first-rebuild-link").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/first`)
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    // An old first-rebuild-style address under the sequence's folder does not exist; the first rebuild is under /first.
    await page.goto(`${ROUTES.planNew}/first/areas/pick`, { timeout: NAV })
    await expect(page.locator("h1").first()).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("back")).toBeVisible()
    expect(errors).toEqual([])
  })
})
