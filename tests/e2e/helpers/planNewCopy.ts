import type { Page } from "@playwright/test"
import { Client } from "pg"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planWithSteps, seedLifePlan } from "./lifePlan"
import { stackAdmin, testStackEnv } from "../fixtures/stack"

/** Shared by the `/plan/new` specs that run on the copy space: seed a plan, copy it in, and prove the owner never moves. */

export const TABLES = [
  "life_plans", "life_plan_nodes", "life_plan_north_stars", "life_plan_areas", "life_plan_goals", "life_plan_goal_checkpoints",
  "life_plan_goal_obstacles", "life_plan_goal_beliefs", "life_plan_routines", "life_plan_routine_steps", "life_plan_routine_split_days",
  "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps", "life_plan_seasons", "life_plan_goal_feeds", "life_plan_goal_serves",
  "life_plan_routine_serves", "life_plan_step_serves", "life_plan_reviews", "life_plan_season_areas", "life_plan_season_goals",
  "life_plan_review_scores", "life_plan_review_goals", "life_plan_values", "life_plan_answers", "life_plan_days", "life_plan_day_ratings",
  "life_plan_day_ticks", "life_plan_day_journal", "life_plan_day_numbers", "life_plan_reminders",
]

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

/** One row count and hash per plan table for a user: equal before and after means no row moved. */
export async function fingerprint(userId: string): Promise<Record<string, string>> {
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

export const sandboxIdOf = async (ownerId: string) =>
  withDb(async (db) => (await db.query("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [ownerId])).rows[0]?.sandbox_user_id as string | null)

export async function giveCopySpace(ownerId: string): Promise<void> {
  const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true })
  if (error) throw new Error(`could not give the account a copy space: ${error.message}`)
}

/**
 * The full plan plus a routine step that runs every day (so Today has a box to tick), copied into the copy space. The
 * account's own plan is taken out first: `seedLifePlan` adds to a plan the account already holds, which doubles the areas.
 */
export async function seedAndCopy(page: Page, ownerId: string, plan: object = fullPlan()): Promise<string> {
  await giveCopySpace(ownerId)
  await withDb((db) => db.query("delete from public.life_plans where user_id = $1", [ownerId]))
  const full = plan as { routines: object[] }
  const extra = (planWithSteps([{ id: "s_e2e", title: "E2E cold shower", daysPerWeek: 7 }]) as { routines: object[] }).routines[0]
  await seedLifePlan(page, ownerId, { ...full, routines: [...full.routines, { ...extra, id: "r_e2e" }] })
  if ((await page.request.post("/api/plan-sandbox/reset")).status() !== 200) throw new Error("reset failed")
  if ((await page.request.post("/api/plan-sandbox/copy")).status() !== 200) throw new Error("copy failed")
  const id = await sandboxIdOf(ownerId)
  if (!id) throw new Error("no copy space")
  return id
}
