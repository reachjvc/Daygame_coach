import { test, expect as baseExpect } from "./fixtures/test"
import type { Page, Request as PwRequest } from "@playwright/test"
import { Client } from "pg"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"
import { stackAdmin, testStackEnv } from "./fixtures/stack"
import { REAL_STEP_IDS, realStepRoute } from "@/src/goals/planSteps/realStepRoutes"

/**
 * THE REAL STEP PARTS ON /plan/new/s/<step> (Plans/plan-new-from-real.md, Phase 3.3 and 3.6), on the copy space.
 *
 *   (1) a tick made through the real Today part is in the hidden account's rows after a reload, and the owner's rows
 *       do not move;
 *   (2) fifty typed characters in the north star box do not send fifty requests;
 *   (3) every one of the twelve step pages opens with no page error and shows a heading of its own.
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

const tickCount = async (userId: string) =>
  withDb(async (db) => (await db.query("select count(*)::int as n from public.life_plan_day_ticks where user_id = $1", [userId])).rows[0].n as number)

/** The hidden account's current north star text ("" when none). */
const northStarText = (userId: string) =>
  withDb(async (db) => {
    const r = await db.query("select text from public.life_plan_north_stars where user_id = $1 and ended_on is null", [userId])
    return (r.rows[0]?.text as string | undefined) ?? ""
  })

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

// The plan save is a PATCH, the day save a PUT, the first-visit start a POST: every write counts.
const isPlanWrite = (r: PwRequest) => !["GET", "HEAD", "OPTIONS"].includes(r.method()) && new URL(r.url()).pathname.startsWith("/api/life-plan")

test.describe("the real step parts on /plan/new/s/<step>", () => {
  test("a tick through the real Today part survives a reload, lands in the hidden account, and the owner is untouched", async ({ page, account }) => {
    test.setTimeout(240_000)
    const sandboxId = await seedAndCopy(page, account.id)
    const ownerBefore = await fingerprint(account.id)
    const ticksBefore = await tickCount(sandboxId)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))

    await page.goto(realStepRoute("today")!, { timeout: NAV })
    const box = page.getByRole("checkbox", { name: /E2E cold shower/ }).first()
    await expect(box).toBeVisible({ timeout: NAV })
    await expect(box).not.toBeChecked()
    const saved = page.waitForResponse((r) => r.url().includes("/api/life-plan/day") && r.request().method() !== "GET" && r.ok(), { timeout: 30_000 })
    await box.click()
    await saved
    await expect(box).toBeChecked()

    await page.reload({ timeout: NAV })
    const again = page.getByRole("checkbox", { name: /E2E cold shower/ }).first()
    await expect(again).toBeVisible({ timeout: NAV })
    await expect(again).toBeChecked()

    expect(await tickCount(sandboxId), "the tick is in the hidden account's rows").toBeGreaterThan(ticksBefore)
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
    expect(errors).toEqual([])
  })

  test("fifty typed characters in the north star box send far fewer than fifty requests", async ({ page, account }) => {
    test.setTimeout(240_000)
    const sandboxId = await seedAndCopy(page, account.id)
    await page.goto(realStepRoute("star")!, { timeout: NAV })
    const north = page.getByRole("textbox", { name: "Your north star" })
    await expect(north).toBeVisible({ timeout: NAV })
    await north.fill("")
    // Let the save of the clearing reach the hidden account, then count only what typing sends.
    await expect.poll(() => northStarText(sandboxId), { timeout: 30_000 }).toBe("")
    const sent: PwRequest[] = []
    const on = (r: PwRequest) => { if (isPlanWrite(r)) sent.push(r) }
    page.on("request", on)
    const text = "x".repeat(10) + "abcdefghij" + "0123456789" + "KLMNOPQRST" + "uvwxyz-_.,"
    expect(text.length).toBe(50)
    await north.pressSequentially(text)
    // Typing is done once the whole text is in the hidden account; then nothing more is owed.
    await expect.poll(() => northStarText(sandboxId), { timeout: 30_000 }).toBe(text)
    page.off("request", on)
    expect(sent.length, `plan requests while typing 50 characters: ${sent.map((r) => r.method() + " " + new URL(r.url()).pathname).join(", ")}`).toBeLessThan(10)
    expect(sent.length).toBeGreaterThan(0)

    await page.reload({ timeout: NAV })
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue(text, { timeout: NAV })
  })

  test("all twelve step pages open with no page error and a heading of their own", async ({ page, account }) => {
    test.setTimeout(900_000)
    await seedAndCopy(page, account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    const headings = new Map<string, string>()
    for (const id of REAL_STEP_IDS) {
      await page.goto(realStepRoute(id)!, { timeout: NAV })
      expect(new URL(page.url()).pathname).toBe(`${ROUTES.planNew}/s/${id}`)
      const heading = page.locator("h1, h2").filter({ hasText: /\S/ }).first()
      await expect(heading, `${id}: a heading`).toBeVisible({ timeout: NAV })
      headings.set(id, ((await heading.textContent()) ?? "").trim())
      await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    }
    expect(errors).toEqual([])
    expect(new Set(headings.values()).size, `each step has its own first heading: ${JSON.stringify([...headings])}`).toBe(12)
  })

  test("an area sheet opens from the address on Your 10s, survives a reload, and closes with the address clean", async ({ page, account }) => {
    test.setTimeout(240_000)
    await seedAndCopy(page, account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(realStepRoute("now")!, { timeout: NAV })
    // Any area the wheel offers opens its sheet; the address says which.
    const pick = page.getByRole("button", { name: /Open it\.$/ }).first()
    await expect(pick).toBeVisible({ timeout: NAV })
    await pick.click()
    await expect.poll(() => new URL(page.url()).searchParams.get("area"), { timeout: 15_000 }).not.toBeNull()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await page.reload({ timeout: NAV })
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: NAV })
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect.poll(() => new URL(page.url()).searchParams.get("area")).toBeNull()
    expect(errors).toEqual([])
  })
})
