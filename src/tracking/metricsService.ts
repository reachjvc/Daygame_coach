/**
 * Metric identity, goal-derived metrics, and display formatting.
 *
 * Pure on purpose — no repo imports, so client components (the tile, the
 * picker, the manage dialog) can import it. Anything that needs the database
 * lives in dashboardService.
 *
 * THE RULE THIS FILE EXISTS TO KEEP: every goal a user has resolves to at least
 * one thing that can track it.
 *
 * Goals built from a template carry a `linked_metric`, which names a catalogue
 * entry directly. Goals the user typed themselves have no backend anywhere in
 * the app — there is no deep-work table, no reading table, no meditation table.
 * Rather than leave those goals untrackable, the goal becomes its own source:
 * its logged value is read five ways (this period, streak, % of target,
 * accumulated, best streak), which is what makes "deep work, daily or
 * accumulated" work without inventing a schema for deep work.
 *
 * A goal-derived id looks like `goal:<uuid>:<view>`. It is resolved against the
 * goal row, and ownership is re-checked server-side — the id lives in a row the
 * user can write.
 */

import { isPracticeRow } from "@/src/goals/data/goalShapes"
import type {
  GoalMetricView,
  MetricDef,
  MetricFormat,
  MetricValue,
} from "./types"
import type { UserGoalRow } from "@/src/db/goalTypes"
import { CircleDot } from "lucide-react"
import { METRIC_BY_ID, METRIC_BY_LINKED_METRIC } from "./data/metricCatalog"

/** Stand-in icon for a goal that has no backing metric to borrow one from. */
const FALLBACK_GOAL_ICON = CircleDot

export const GOAL_METRIC_PREFIX = "goal"

/** Every reading a goal can have. Which ones apply depends on the goal — see goalMetricViews. */
export const GOAL_METRIC_VIEWS: GoalMetricView[] = ["period", "total", "streak", "percent", "best"]

/** How many tiles a dashboard may hold. Below 2 the row looks broken; above 8 it stops being a summary. */
export const MIN_TILES = 2
export const MAX_TILES = 8

export function buildGoalMetricId(goalId: string, view: GoalMetricView): string {
  return `${GOAL_METRIC_PREFIX}:${goalId}:${view}`
}

/** Null for anything that is not a goal-derived id, including unknown views. */
export function parseGoalMetricId(id: string): { goalId: string; view: GoalMetricView } | null {
  const parts = id.split(":")
  if (parts.length !== 3) return null
  const [prefix, goalId, view] = parts
  if (prefix !== GOAL_METRIC_PREFIX) return null
  if (!goalId) return null
  if (!GOAL_METRIC_VIEWS.includes(view as GoalMetricView)) return null
  return { goalId, view: view as GoalMetricView }
}

export function isGoalMetricId(id: string): boolean {
  return parseGoalMetricId(id) !== null
}

/** What a goal's period is called on a tile. */
function periodWord(period: string): string {
  switch (period) {
    case "daily": return "today"
    case "weekly": return "this week"
    case "monthly": return "this month"
    case "quarterly": return "this quarter"
    case "yearly": return "this year"
    default: return "this period"
  }
}

function periodNoun(period: string): string {
  switch (period) {
    case "daily": return "day"
    case "weekly": return "week"
    case "monthly": return "month"
    case "quarterly": return "quarter"
    case "yearly": return "year"
    default: return "period"
  }
}

const GOAL_VIEW_COPY: Record<GoalMetricView, { suffix: string; describe: (p: string) => string }> = {
  period: {
    suffix: "",
    describe: (p) => `What you have logged against this goal ${periodWord(p)}.`,
  },
  total: {
    suffix: "(total)",
    describe: (p) => `Everything logged against this goal, added up across every ${periodNoun(p)}.`,
  },
  streak: {
    suffix: "(streak)",
    describe: (p) => `Consecutive ${periodNoun(p)}s where you hit this goal.`,
  },
  percent: {
    suffix: "(% of target)",
    describe: (p) => `How far through the target you are ${periodWord(p)}.`,
  },
  best: {
    suffix: "(best streak)",
    describe: (p) => `The longest run of ${periodNoun(p)}s you have hit this goal.`,
  },
}

/**
 * Is this a goal the user logs against, or a container above those?
 *
 * The goal tree has levels: L1 and L2 are outcomes ("Get a girlfriend",
 * "Approach Legend") whose progress comes from the L3 goals underneath them.
 * Nothing writes their `current_value`, so a tile built on one reads 0 forever.
 * The same line is drawn in goalsService.isDailyActionable — L3 and standalone
 * goals are the measured ones.
 */
export function isTrackableGoal(goal: UserGoalRow): boolean {
  if (!goal.is_active || goal.is_archived) return false
  return goal.goal_level === 3 || goal.goal_level === null
}

/**
 * The readings that mean something for THIS goal.
 *
 * Not every goal supports every view, and offering all five is how the picker
 * ended up full of nonsense like "Get a girlfriend (best streak) — the longest
 * run of weeks you have hit this goal".
 *
 * - A **recurring** goal ("10 approaches per week") resets each period, so it
 *   has a current period, a streak of periods hit, and a lifetime total that
 *   only exists because the periods are added back up.
 * - A **milestone** ("squat 100kg", "visible abs") is reached once. It has no
 *   streak, and no separate total: `current_value` already IS the running
 *   figure, so adding period history to it would double-count.
 */
export function goalMetricViews(goal: UserGoalRow): GoalMetricView[] {
  const hasTarget = goal.target_value > 0
  const recurs = isPracticeRow(goal)

  if (!recurs) return hasTarget ? ["period", "percent"] : ["period"]

  const views: GoalMetricView[] = ["period", "total", "streak", "best"]
  if (hasTarget) views.splice(1, 0, "percent")
  return views
}

/**
 * Describe one reading of one goal as if it were a catalogue entry, so tiles and
 * the picker can treat goal-derived and catalogue metrics identically.
 */
export function goalMetricDef(goal: UserGoalRow, view: GoalMetricView): MetricDef {
  const copy = GOAL_VIEW_COPY[view]
  const catalogEntry = goal.linked_metric ? METRIC_BY_LINKED_METRIC[goal.linked_metric] : undefined
  const recurs = isPracticeRow(goal)
  // A milestone has no "this period" — it has how far along it is.
  const describe = view === "period" && !recurs
    ? "How far you have got toward this milestone."
    : copy.describe(goal.period)

  const format: MetricFormat =
    view === "percent" ? "percent"
    : view === "streak" || view === "best" ? (goal.period === "daily" ? "days" : "weeks")
    : (catalogEntry?.format ?? "count")

  return {
    id: buildGoalMetricId(goal.id, view),
    label: copy.suffix ? `${goal.title} ${copy.suffix}` : goal.title,
    tileLabel: copy.suffix ? `${goal.title} ${copy.suffix}` : goal.title,
    area: goal.life_area,
    group: "Your goals",
    window: view === "total" ? "cumulative" : view === "streak" || view === "best" ? "streak" : (goal.period as MetricDef["window"]),
    format,
    description: describe,
    source: "goal",
    // A goal-derived metric never backs a goal: it IS one.
    linkedMetric: null,
    icon: catalogEntry?.icon ?? FALLBACK_GOAL_ICON,
    accent: catalogEntry?.accent ?? "text-primary",
  }
}

/**
 * Everything that can track this goal, best first.
 *
 * Never empty for a goal the user logs against: one with a linked_metric gets
 * the real metric at the top (that number is what advances it), then the
 * readings its shape supports. A self-input goal gets those readings only.
 *
 * Empty for a container goal (L1/L2). That is not a gap — a container is
 * tracked through the L3 goals beneath it, and those are in this same list.
 */
export function metricsForGoal(goal: UserGoalRow): MetricDef[] {
  if (!isTrackableGoal(goal)) return []

  const out: MetricDef[] = []

  if (goal.linked_metric) {
    const backing = METRIC_BY_LINKED_METRIC[goal.linked_metric]
    if (backing) out.push(backing)
  }

  for (const view of goalMetricViews(goal)) {
    out.push(goalMetricDef(goal, view))
  }

  return out
}

/** Catalogue lookup that also understands goal-derived ids given the goals. */
export function metricDefFor(id: string, goals: UserGoalRow[] = []): MetricDef | null {
  const catalogEntry = METRIC_BY_ID[id]
  if (catalogEntry) return catalogEntry

  const parsed = parseGoalMetricId(id)
  if (!parsed) return null

  const goal = goals.find((g) => g.id === parsed.goalId)
  if (!goal) return null

  return goalMetricDef(goal, parsed.view)
}

/**
 * Read one goal the way a metric id asks for.
 *
 * `value: null` only where the goal genuinely has no answer — a percentage of a
 * zero target is undefined, not 0%.
 *
 * `accumulatedTotal` is the sum of completed periods. Zero is a real answer
 * there: a goal created this week has no completed periods, and its lifetime
 * total is simply what it has logged so far.
 */
export function readGoalMetric(
  goal: UserGoalRow,
  view: GoalMetricView,
  accumulatedTotal: number
): MetricValue {
  const id = buildGoalMetricId(goal.id, view)
  const def = goalMetricDef(goal, view)
  // The view-specific label, so a goal's "total" tile cannot be mistaken for its
  // "this period" tile sitting next to it.
  const base = { id, label: def.tileLabel, format: def.format }

  switch (view) {
    case "period":
      return { ...base, value: goal.current_value, target: goal.target_value }
    case "total":
      return { ...base, value: accumulatedTotal + goal.current_value }
    case "streak":
      return { ...base, value: goal.current_streak }
    case "best":
      return { ...base, value: goal.best_streak }
    case "percent":
      return goal.target_value > 0
        ? { ...base, value: Math.round((goal.current_value / goal.target_value) * 100), target: 100 }
        : { ...base, value: null, reason: "This goal has no target to measure against" }
  }
}

/**
 * Render a value for a tile. Null renders as an em dash — a metric with no data
 * must never show a 0 the user could read as "you did none".
 */
export function formatMetricValue(value: number | null, format: MetricFormat = "count"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"

  switch (format) {
    case "percent":
      return `${Math.round(value)}%`
    case "kg":
      return `${round1(value)} kg`
    case "km":
      return `${round1(value)} km`
    case "hours":
      return `${round1(value)}h`
    case "minutes":
      return `${Math.round(value)}m`
    case "rating":
      return round1(value).toString()
    case "reps":
    case "days":
    case "weeks":
    case "count":
    default:
      return Math.round(value).toLocaleString()
  }
}

/** Small suffix under the number, e.g. "of 10 this week". */
export function metricSubLabel(def: MetricDef, value: MetricValue): string | null {
  if (value.value === null) return value.reason ?? "No data yet"
  if (value.target && def.format !== "percent") return `of ${value.target}`
  return null
}

function round1(n: number): string | number {
  return Number.isInteger(n) ? n : Math.round(n * 10) / 10
}

/**
 * MAY THIS METRIC BACK A GOAL ON THIS PERIOD?
 *
 * A goal's `current_value` is the count for one period. A linked metric supplies
 * that count. If the two describe different spans of time, the goal is wrong in
 * a way nothing on screen explains: the roll zeroes `current_value` on Monday
 * and `syncLinkedGoals` writes the metric's number straight back, so a weekly
 * goal with target 2 fed by `approaches_cumulative` reads 416 and is
 * permanently complete. Eleven of eighteen linked goals in production were in
 * that state.
 *
 * The rule is that the metric's window IS its cadence:
 *
 *   weekly      -> only a weekly goal
 *   cumulative  -> only a `custom` goal, i.e. a milestone that never rolls.
 *                  Not yearly: a yearly goal rolls every January and would be
 *                  refilled with the lifetime total the same second.
 *   current     -> only a `custom` goal. A 1RM or a body weight is a level, not
 *                  a count; zeroing it every Monday means nothing.
 *   streak      -> only a `custom` goal. "Reach 12 consecutive training weeks"
 *                  is a target you walk towards and the streak IS the progress;
 *                  zeroing a streak every Monday would be meaningless. The
 *                  daygame streaks stay unlinkable because their catalogue
 *                  entries carry no `linkedMetric` at all.
 *   daily,
 *   monthly     -> no metric has these windows yet. Left explicit so adding one
 *                  is a decision somebody makes rather than a default.
 *
 * A metric with `linkedMetric: null` cannot back a goal at all — nothing syncs
 * it into `current_value`.
 */
export function metricFitsPeriod(metricId: string, period: string): boolean {
  const def = METRIC_BY_ID[metricId]
  if (!def) return false
  if (def.linkedMetric === null) return false

  switch (def.window) {
    case "weekly":
      return period === "weekly"
    case "cumulative":
    case "current":
      return period === "custom"
    case "streak":
      return period === "custom"
    case "daily":
    case "monthly":
      return false
  }
}
