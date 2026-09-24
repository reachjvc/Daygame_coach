/**
 * THE LIFE PLAN, AS ROWS.
 *
 * One interface per table in `20260922100000_life_plan_tables.sql`, named and
 * typed exactly as the columns are. Nothing here is a view or a convenience
 * shape: `lifePlanMapper` turns the flow's `NsPlan` into these and back, and
 * `save_life_plan` takes them verbatim, so a field that drifts from its column
 * is a save that fails at the database rather than a bug that reads as data
 * loss much later.
 *
 * `tests/unit/goals/lifePlanTypeCoverage.test.ts` fails when a field exists on
 * `NsPlan` and has no home here.
 */

/** The 13 kinds a node can be. Mirrors the CHECK on `life_plan_nodes.kind`. */
export type LifePlanNodeKind =
  | "north_star"
  | "area"
  | "goal"
  | "checkpoint"
  | "obstacle"
  | "belief"
  | "habit"
  | "routine"
  | "routine_step"
  | "split_day"
  | "experience"
  | "field"
  | "sub_step"

export interface LifePlanRow {
  id: string
  user_id: string
  version: number
  revision: number
  seq: number
  season_focus_id: string | null
  created_at: string
  updated_at: string
}

export interface NodeRow {
  id: string
  plan_id: string
  user_id: string
  kind: LifePlanNodeKind
  /** The plan's own id — `g3`, `area_health`. Stored verbatim, never rewritten. */
  local_id: string
}

export interface NorthStarRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "north_star"
  text: string
  horizon_years: number
}

export interface AreaRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "area"
  position: number
  label: string
  sublabel: string
  color: string
  custom: boolean
  review_ten: string
  review_purpose: string
  review_snapshot: string
  review_blockers: string
  review_identity: string
  review_fortnight: number | null
  review_goals_aim: "yes" | "no" | null
  season_rank: number | null
}

export interface GoalRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "goal"
  /** The goals list's own order — what screens reading `plan.goals` render by. */
  position: number
  /** The index in `priorityIds`. A separate list, separately maintained. */
  priority_rank: number
  area_id: string | null
  title: string
  goal_type: string
  why: string
  pain_why: string
  sentence: string
  feeling: string
  reward: string
  stake: string
  unit: string
  target_date: string | null
  belief_level: number | null
  desire_level: number | null
  days_per_week: number
  per_week: number | null
  is_abstinence: boolean
  serves_one_thing: boolean
  metric: "daily_area" | null
  ladder: unknown | null
  ramp_steps: unknown | null
  reasons_list: string[]
  asked: string[]
  /**
   * The link to the counted goal. READ ON LOAD, NEVER SENT ON SAVE — it is
   * owned by the push, and `save_life_plan` deliberately leaves it out of its
   * UPDATE so a device that has never pushed cannot blank it.
   */
  user_goal_id?: string | null
}

export interface CheckpointRow {
  id: string
  user_id: string
  goal_id: string
  node_kind: "checkpoint"
  position: number
  title: string
  done: boolean
  celebration: string
}

export interface ObstacleRow {
  id: string
  user_id: string
  goal_id: string
  node_kind: "obstacle"
  position: number
  what: string
  counter: string
}

export interface BeliefRow {
  id: string
  user_id: string
  goal_id: string
  node_kind: "belief"
  position: number
  old: string
  useful: boolean | null
  evidence: string
  replacement: string
}

export interface HabitRow {
  id: string
  user_id: string
  goal_id: string
  node_kind: "habit"
  position: number
  title: string
  days_per_week: number
  placeholder: boolean
  /** Named days in cycle order, `{id, name}` each. The order is the meaning. */
  routine_days: { id: string; name: string }[]
  source_target_id: string | null
}

export interface RoutineRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "routine"
  position: number
  label: string
  blueprint_id: string
  kind: "sequence" | "weekly"
  area_id: string | null
  days_per_week: number
  /** A REFERENCE to the enrollment, never a copy of the program. */
  enrollment_id: string | null
}

export interface StepRow {
  id: string
  user_id: string
  routine_id: string
  node_kind: "routine_step"
  position: number
  library_step_id: string | null
  title: string
  minutes: number
  days_per_week: number
  dimension: "mind" | "body" | "spirit" | null
  days: number[]
  start_min: number | null
  /** Null means cleared. `goes_to_set` false means never set — a third state. */
  goes_to: string | null
  goes_to_set: boolean
  asks: string | null
  asks_set: boolean
}

export interface SplitDayRow {
  id: string
  user_id: string
  routine_id: string
  node_kind: "split_day"
  position: number
  name: string
}

export interface ExperienceRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "experience"
  position: number
  title: string
  area_id: string | null
  goal_id: string | null
  done: boolean
  done_on: string | null
}

export interface FieldRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "field"
  position: number
  label: string
  kind: "write" | "read" | "go"
  target_id: string | null
  /** Names a code registry entry, not a node. No foreign key, and none possible. */
  read_source_id: string | null
}

export interface SubStepRow {
  id: string
  user_id: string
  plan_id: string
  node_kind: "sub_step"
  position: number
  target_id: string
  title: string
}

export interface GoalFeedRow {
  user_id: string
  goal_id: string
  feeds_goal_id: string
  position: number
}

export interface GoalServeRow {
  user_id: string
  goal_id: string
  area_id: string
  position: number
}

export interface RoutineServeRow {
  user_id: string
  routine_id: string
  area_id: string
  position: number
}

export interface StepServeRow {
  user_id: string
  step_id: string
  goal_id: string
  position: number
}

export interface ValueRow {
  id: string
  user_id: string
  plan_id: string
  scope: "past" | "chosen" | "area" | "goal"
  value: string
  position: number
  area_id: string | null
  goal_id: string | null
}

export interface AnswerRow {
  id: string
  user_id: string
  plan_id: string
  kind: "rung" | "answer"
  prompt_id: string
  body: string
}

/**
 * Everything `save_life_plan` takes, and everything a read hands back.
 *
 * THE FOUR DAY TABLES ARE NOT HERE, and their absence is the design. A plan is
 * replaced on every save; a day is appended to. If a day rode along in this
 * object then one keystroke on the Systems step could wipe a year of journal,
 * which is the single most dangerous thing the first draft of this work got
 * wrong. They travel by their own route (Phase 2) and the save function is
 * asserted at migration time to be unable to reach them.
 */
export interface PlanRows {
  plan_id: string
  user_id: string
  version: number
  seq: number
  season_focus_id: string | null
  /**
   * WHEN THE ACCOUNT LAST ACCEPTED A SAVE. **Meaningful on the way OUT only.**
   *
   * Carried because the flow's footer reads `plan.updatedAt` to decide between
   * "Saved to your account" and "Nothing written yet", and the mapper had no
   * stamp to give it — so a plan read back on a NEW PHONE described itself as
   * never written, at the exact moment this work exists to be trusted.
   *
   * `PlanRows` is one shape used in two directions, which is why this needs
   * saying: the DATABASE owns this column and `save_life_plan` sets it, so what
   * `planToRows` puts here on the way IN is never read by anything. It is
   * required rather than optional so that the read direction — the one that
   * matters — cannot quietly forget it the way the mapper did.
   */
  updated_at: string
  nodes: NodeRow[]
  north_stars: NorthStarRow[]
  areas: AreaRow[]
  goals: GoalRow[]
  checkpoints: CheckpointRow[]
  obstacles: ObstacleRow[]
  beliefs: BeliefRow[]
  habits: HabitRow[]
  goal_feeds: GoalFeedRow[]
  goal_serves: GoalServeRow[]
  routines: RoutineRow[]
  routine_serves: RoutineServeRow[]
  steps: StepRow[]
  split_days: SplitDayRow[]
  step_serves: StepServeRow[]
  experiences: ExperienceRow[]
  fields: FieldRow[]
  sub_steps: SubStepRow[]
  values: ValueRow[]
  answers: AnswerRow[]
}

/** Every table name the whole-plan save writes, for the tests that count them. */
export const PLAN_ROW_KEYS = [
  "nodes",
  "north_stars",
  "areas",
  "goals",
  "checkpoints",
  "obstacles",
  "beliefs",
  "habits",
  "goal_feeds",
  "goal_serves",
  "routines",
  "routine_serves",
  "steps",
  "split_days",
  "step_serves",
  "experiences",
  "fields",
  "sub_steps",
  "values",
  "answers",
] as const

/** The four the save must never touch. Named so a test can assert it. */
export const DAY_TABLES = [
  "life_plan_days",
  "life_plan_day_ratings",
  "life_plan_day_ticks",
  "life_plan_day_journal",
] as const
