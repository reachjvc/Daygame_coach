/**
 * THE LIFE MASTERY PLAN, ON THE ACCOUNT.
 *
 * Every read and write of the 25 `life_plan_*` tables. Nothing outside this
 * file touches them, which is the same rule the rest of `src/db` lives by and
 * the reason the platform move (vision item 36) is a change to twelve files
 * rather than to the app.
 *
 * ----------------------------------------------------------------------------
 * EVERY READ IS PAGED. The day tables pass a thousand rows inside three years
 * and the plan tables can too — a plan with fifty goals, each with checkpoints,
 * obstacles, beliefs and habits, is already several hundred nodes. Supabase
 * returns at most 1,000 rows per request and says NOTHING about the ones it
 * dropped: no error, no flag, just a shorter list. That has bitten this project
 * twice on real data. `readAllRows` orders by `id` so paging cannot skip a row.
 *
 * ----------------------------------------------------------------------------
 * THE SAVE IS ONE STATEMENT AND IT IS LOUD. `save_life_plan` is a single
 * transaction with a revision lock; a stale save raises 55000 and this file
 * turns that into a typed refusal the route can answer 409 with. NOTHING here
 * falls back to "save it anyway" — a silent merge of two devices' plans is how
 * somebody loses an evening's work without ever seeing an error.
 */

import { createServerSupabaseClient } from "./supabase"
import { readAllRows } from "./paging"
import { PLAN_ROW_KEYS } from "./lifePlanTypes"
import type {
  AnswerRow,
  AreaRow,
  BeliefRow,
  CheckpointRow,
  ExperienceRow,
  FieldRow,
  GoalFeedRow,
  GoalRow,
  GoalServeRow,
  HabitRow,
  NodeRow,
  NorthStarRow,
  ObstacleRow,
  PlanRows,
  RoutineRow,
  RoutineServeRow,
  SplitDayRow,
  StepRow,
  StepServeRow,
  SubStepRow,
  ValueRow,
} from "./lifePlanTypes"

/** A plan as it came off the account, with the revision a save must quote. */
export interface StoredPlan {
  rows: PlanRows
  revision: number
  /** The counted-goal link per goal UUID. Read here, never written by the save. */
  goalLinks: Record<string, string | null>
}

/** A save refused because somebody else's device got there first. */
export class StalePlanError extends Error {
  readonly revision: number
  constructor(revision: number) {
    super("This plan changed on another device. Reload before saving again.")
    this.name = "StalePlanError"
    this.revision = revision
  }
}

/** Postgres' code for the revision lock, raised by `save_life_plan`. */
const STALE = "55000"

/**
 * The plan row, making one if the account has none.
 *
 * Separate from reading the plan because the id is needed BEFORE the mapper can
 * run — the mapper stamps `plan_id` on every row it builds.
 */
export async function ensureLifePlan(userId: string): Promise<{ id: string; revision: number; seq: number }> {
  const supabase = await createServerSupabaseClient()

  const existing = await supabase
    .from("life_plans")
    .select("id, revision, seq")
    .eq("user_id", userId)
    .maybeSingle()
  if (existing.error) throw new Error(`Failed to read the plan: ${existing.error.message}`)
  if (existing.data) return existing.data as { id: string; revision: number; seq: number }

  const made = await supabase
    .from("life_plans")
    .insert({ user_id: userId })
    .select("id, revision, seq")
    .single()
  // A second tab racing this one hits the one-plan-per-user key. That is not a
  // failure: re-read and use theirs rather than reporting an error nobody can
  // act on.
  if (made.error) {
    const again = await supabase
      .from("life_plans")
      .select("id, revision, seq")
      .eq("user_id", userId)
      .maybeSingle()
    if (again.data) return again.data as { id: string; revision: number; seq: number }
    throw new Error(`Failed to start a plan: ${made.error.message}`)
  }
  return made.data as { id: string; revision: number; seq: number }
}

/**
 * Which plan is this person's, without reading the plan.
 *
 * The day route needs the id and nothing else, and `readLifePlan` below reads
 * twenty tables to get it. Null means the account has no plan — which the day
 * route answers with an empty record rather than by creating one, because a
 * GET must not write.
 *
 * Here rather than in `lifePlanDayRepo` so that `life_plans` keeps one owner.
 */
export async function findLifePlanId(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("life_plans")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to find your plan: ${error.message}`)
  return (data as { id: string } | null)?.id ?? null
}

/**
 * Everything the plan is made of, or null when the account has no plan yet.
 *
 * Null is a real answer and the caller must handle it — a new account starts
 * empty and that is not an error. Returning an empty plan here instead would
 * make "no plan" indistinguishable from "a plan that failed to load", and the
 * flow would then save the empty one over the real one.
 */
export async function readLifePlan(userId: string): Promise<StoredPlan | null> {
  const supabase = await createServerSupabaseClient()

  const plan = await supabase
    .from("life_plans")
    .select("id, revision, version, seq, season_focus_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (plan.error) throw new Error(`Failed to read the plan: ${plan.error.message}`)
  if (!plan.data) return null

  const planId = plan.data.id as string
  /**
   * Read a table whole, a page at a time.
   *
   * `order` is explicit and never assumed to be `id`, because FOUR OF THESE
   * TABLES HAVE NO `id` COLUMN — a link row's key is the pair it joins, so
   * `life_plan_goal_feeds` is (goal_id, feeds_goal_id) and ordering it by `id`
   * asks for a column that does not exist. That is a 500 on the whole read, and
   * it is what happened the first time this route was driven in a browser.
   *
   * The ordering must also be UNIQUE, or paging is two reads of a moving table
   * and a row that ties can land in both pages while another lands in neither.
   */
  const all = <T>(table: string, on: "plan" | "node", order: string[]) =>
    readAllRows<T>(table, (from, to) => {
      const col = on === "plan" ? "plan_id" : "user_id"
      const val = on === "plan" ? planId : userId
      // Written as one chain per case rather than built up in a variable, so
      // the `.range()` is visible ON the chain — both to a reader and to the
      // architecture test that counts reads with no upper bound.
      return order.length === 2
        ? supabase.from(table).select("*").eq(col, val).order(order[0]).order(order[1]).range(from, to)
        : supabase.from(table).select("*").eq(col, val).order(order[0]).range(from, to)
    })

  // The child tables have no `plan_id` of their own — they hang off a goal, a
  // routine or a step — so they are read by owner and then narrowed to this
  // plan's parents below. One account has one plan, so this reads nothing extra
  // today; it is written this way so a second plan per account stays a
  // migration rather than a rewrite.
  const [
    nodes, north_stars, areas, goals, routines, steps, split_days,
    experiences, fields, sub_steps, values, answers,
    checkpoints, obstacles, beliefs, habits,
    goal_feeds, goal_serves, routine_serves, step_serves,
  ] = await Promise.all([
    all<NodeRow>("life_plan_nodes", "plan", ["id"]),
    all<NorthStarRow>("life_plan_north_stars", "plan", ["id"]),
    all<AreaRow>("life_plan_areas", "plan", ["id"]),
    all<GoalRow>("life_plan_goals", "plan", ["id"]),
    all<RoutineRow>("life_plan_routines", "plan", ["id"]),
    all<StepRow>("life_plan_routine_steps", "node", ["id"]),
    all<SplitDayRow>("life_plan_routine_split_days", "node", ["id"]),
    all<ExperienceRow>("life_plan_experiences", "plan", ["id"]),
    all<FieldRow>("life_plan_fields", "plan", ["id"]),
    all<SubStepRow>("life_plan_sub_steps", "plan", ["id"]),
    all<ValueRow>("life_plan_values", "plan", ["id"]),
    all<AnswerRow>("life_plan_answers", "plan", ["id"]),
    all<CheckpointRow>("life_plan_goal_checkpoints", "node", ["id"]),
    all<ObstacleRow>("life_plan_goal_obstacles", "node", ["id"]),
    all<BeliefRow>("life_plan_goal_beliefs", "node", ["id"]),
    all<HabitRow>("life_plan_goal_habits", "node", ["id"]),
    all<GoalFeedRow>("life_plan_goal_feeds", "node", ["goal_id", "feeds_goal_id"]),
    all<GoalServeRow>("life_plan_goal_serves", "node", ["goal_id", "area_id"]),
    all<RoutineServeRow>("life_plan_routine_serves", "node", ["routine_id", "area_id"]),
    all<StepServeRow>("life_plan_step_serves", "node", ["step_id", "goal_id"]),
  ])

  const goalIds = new Set(goals.map((g) => g.id))
  const routineIds = new Set(routines.map((r) => r.id))
  const stepIds = new Set(steps.filter((s) => routineIds.has(s.routine_id)).map((s) => s.id))

  return {
    revision: plan.data.revision as number,
    // The link, read and handed back so a push can find it — and deliberately
    // NOT part of what the save sends, so a device that has never pushed cannot
    // blank it and make the next push duplicate every goal.
    goalLinks: Object.fromEntries(goals.map((g) => [g.id, g.user_goal_id ?? null])),
    rows: {
      plan_id: planId,
      user_id: userId,
      version: plan.data.version as number,
      seq: plan.data.seq as number,
      season_focus_id: (plan.data.season_focus_id as string | null) ?? null,
      updated_at: plan.data.updated_at as string,
      nodes,
      north_stars,
      areas,
      goals,
      checkpoints: checkpoints.filter((r) => goalIds.has(r.goal_id)),
      obstacles: obstacles.filter((r) => goalIds.has(r.goal_id)),
      beliefs: beliefs.filter((r) => goalIds.has(r.goal_id)),
      habits: habits.filter((r) => goalIds.has(r.goal_id)),
      goal_feeds: goal_feeds.filter((r) => goalIds.has(r.goal_id)),
      goal_serves: goal_serves.filter((r) => goalIds.has(r.goal_id)),
      routines,
      routine_serves: routine_serves.filter((r) => routineIds.has(r.routine_id)),
      steps: steps.filter((r) => routineIds.has(r.routine_id)),
      split_days: split_days.filter((r) => routineIds.has(r.routine_id)),
      step_serves: step_serves.filter((r) => stepIds.has(r.step_id)),
      experiences,
      fields,
      sub_steps,
      values,
      answers,
    },
  }
}

/**
 * Write the whole plan, in one transaction, against a revision.
 *
 * `user_goal_id` is STRIPPED from every goal before sending. The column is the
 * link to the counted goal and it belongs to the push; the save function does
 * not list it in its UPDATE either, so this is the belt to that braces. Sending
 * it would let a second device, which has never pushed, blank the link.
 *
 * @throws StalePlanError when the stored revision has moved on.
 */
export async function saveLifePlan(
  rows: PlanRows,
  expectedRevision: number,
  userId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient()

  // EVERY ROW CARRIES THE SIGNED-IN OWNER, stamped here from the session rather
  // than trusted from whatever the browser sent. Row security would refuse a
  // foreign one, but "the database will catch it" is not the same as not
  // sending it — and the browser has no business knowing its own uuid for a
  // save to work at all.
  const payload: Record<string, unknown> = { ...rows, user_id: userId }
  for (const key of PLAN_ROW_KEYS) {
    const list = (rows as unknown as Record<string, unknown>)[key]
    if (!Array.isArray(list)) continue
    payload[key] = list.map((row) =>
      row && typeof row === "object" ? { ...(row as Record<string, unknown>), user_id: userId } : row,
    )
  }
  // The link belongs to the push, never to the plan save.
  payload.goals = rows.goals.map((g) => {
    const copy: Record<string, unknown> = { ...g, user_id: userId }
    delete copy.user_goal_id
    return copy
  })

  const { data, error } = await supabase.rpc("save_life_plan", {
    p_rows: payload,
    p_expected_rev: expectedRevision,
  })

  if (error) {
    if (error.code === STALE) throw new StalePlanError(expectedRevision)
    // Loud, and never "carry on as if it saved". A swallowed error here looks
    // exactly like a successful save until the next reload.
    throw new Error(`Failed to save the plan: ${error.message}`)
  }
  if (typeof data !== "number") {
    throw new Error("The plan save returned no revision, so it cannot be trusted to have run.")
  }
  return data
}

/**
 * Point a plan goal at the counted goal it became.
 *
 * Its own write because the link is its own fact with its own owner: the push
 * makes it, the plan save may not touch it, and the two must not be able to
 * race each other through one code path.
 */
export async function linkPlanGoal(
  userId: string,
  planGoalId: string,
  userGoalId: string | null,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("life_plan_goals")
    .update({ user_goal_id: userGoalId })
    .eq("id", planGoalId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to link the goal: ${error.message}`)
}
