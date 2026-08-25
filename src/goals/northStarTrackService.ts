/**
 * Turning a North Star plan into goals the app actually counts.
 *
 * The flow itself is a document: it lives in localStorage, it is written once
 * and read back, and nothing in it moves on a Tuesday. `user_goals` is the
 * opposite — a row per thing you do, incremented, streaked, reset weekly. This
 * module is the join, and it is pure: it takes an `NsPlan` and produces the
 * payload for `POST /api/goals/batch`. No fetch, no DB, no React.
 *
 * Everything it emits is tagged `template_id: "ns:<run>:<plan goal id>"`, and
 * that one decision buys three things:
 *
 *   - **Idempotence.** `createGoalBatch` already dedupes on `template_id`, so
 *     pushing twice maps the second push onto the existing rows instead of
 *     writing a second copy of your plan.
 *   - **A read-back.** The track step can tell "already pushed" from "new"
 *     without keeping a list on the plan that would go stale the moment you
 *     deleted a goal in the goals hub.
 *   - **A way out.** Everything this ever created is `template_id LIKE 'ns:%'`,
 *     so it can be found and removed without touching goals made by hand.
 *
 * **Why the run id is in there.** Plan goal ids are `g1`, `g2`, … from a counter
 * that starts again at zero when somebody clears everything and starts over. A
 * tag of `ns:g1` would therefore mean two different goals on two different
 * sides of a reset, and the dedupe would quietly map the new one onto the old
 * one's row — a goal that never appears and a row whose title is a plan you
 * threw away. The run id is a random string minted once per plan and reminted
 * by "start over", which is exactly the boundary the counter resets on.
 */

import type {
  HabitRampStep,
  MilestoneLadderConfig,
  NsArea,
  NsGoal,
  NsPlace,
  NsPlan,
  NsTrackInsert,
  NsTrackRow,
} from "@/src/goals/types"
import { addDaysISO, goalsByPriority, isMilestone, isSystem } from "@/src/goals/northStarService"
import { CADENCE_COPY, TODAY_COPY, JOURNAL_ALL_ID, JOURNAL_COPY, JOURNAL_PREFIX, JOURNAL_SETS, READ_COPY, RECAP_DRIVING_ANCHOR, REVIEW_PROMPTS, SCHEDULE_COPY, STAR_ANCHOR, STAR_PROMPTS, STAR_WHY_ID } from "@/src/goals/data/northStar"
import { WEEK_DAYS } from "@/src/goals/data/northStarStart"
import { NON_REGISTRY_TEMPLATE_PREFIXES } from "@/src/goals/data/templateNamespaces"

/**
 * Every row this module has ever been responsible for starts with this.
 *
 * Read from the shared list rather than typed again here, because the goals
 * hub archives on first render any goal whose template id it does not
 * recognise — a prefix that agreed with itself and with nothing else would
 * push goals that silently disappear.
 */
export const NS_TRACK_PREFIX = NON_REGISTRY_TEMPLATE_PREFIXES[1]

/** The tag a plan goal's row carries. Stable across pushes — it IS the join. */
export function trackTemplateId(runId: string, goalId: string): string {
  return `${NS_TRACK_PREFIX}${runId}:${goalId}`
}

/**
 * The plan-goal id a pushed row came from, or null when the row belongs to
 * something else — a goal made by hand, or a plan from before a reset.
 */
export function trackGoalId(runId: string, templateId: string | null | undefined): string | null {
  const prefix = `${NS_TRACK_PREFIX}${runId}:`
  if (!templateId || !templateId.startsWith(prefix)) return null
  return templateId.slice(prefix.length)
}

/**
 * WHICH LIFE AREA A PUSHED GOAL LANDS IN, AND WHY IT IS NOT ONE OF THE FIVE.
 *
 * The goals hub has five configured areas (daygame, health_fitness,
 * career_business, personal_growth, vices_elimination) and the wheel has
 * twelve. Mapping twelve onto five means Health and Fitness become one bucket,
 * and Family, Friends, Fun and Contribution all become "Custom" — which is the
 * wheel, the thing the whole plan is organised around, thrown away on the way
 * out of the door.
 *
 * So every area keeps its own identity: the slug is the area's own id with the
 * `lm_` stripped, and a custom area is slugged from its label. `getLifeAreaConfig`
 * already degrades gracefully for an id it does not know — it returns the custom
 * config with the id title-cased as the name — so twelve areas render as twelve
 * named groups with the generic icon rather than five with the right icons.
 * Structure beats iconography here, and picking icons for eight new areas is a
 * decision for the icon registry, not for this function.
 */
export function areaSlug(area: NsArea): string {
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  const base = area.id.startsWith("lm_") ? area.id.slice(3) : area.id
  const slug = slugify(base)
  // An area the user added carries a counter id ("a7"), which names nothing in
  // the hub. Its label does.
  if (!slug || /^\d/.test(slug) || /^[a-z]\d+$/.test(slug)) return slugify(area.label) || "custom"
  return slug
}

/** A ladder that counts down — 95 kg to 85 kg — rather than up. */
function isDescending(ladder: MilestoneLadderConfig): boolean {
  return ladder.target < ladder.start
}

const clampInt = (n: number, min: number) => Math.max(min, Math.round(Number.isFinite(n) ? n : min))

/**
 * WHAT ONE PLAN GOAL BECOMES.
 *
 * Three shapes in, three shapes out:
 *
 *   - **A driver** (`habit_ramp`) is a rate you hold, so it is a weekly counter.
 *     The target is `perWeek` when the driver counts things (twenty approaches)
 *     and `daysPerWeek` when it counts occasions (four gym days) — the two are
 *     different questions and the plan already keeps them apart.
 *   - **A target** (`milestone_ladder`) is a number you climb, so it is a
 *     counter with the ladder attached: current is where you said you are,
 *     target is where you are going, and `milestone_config` carries the curve
 *     so the hub draws the same rungs the plan drew.
 *   - **A finish line** (`achievement`) is done or not done, so it is a boolean.
 *
 * **A descending ladder becomes a finish line, on purpose.** The hub computes
 * progress as `current / target` and completion as `current >= target`
 * (`computeGoalProgress`), so pushing "95 kg now, 85 kg by June" as a counter
 * would read 100% and complete on the day it was created. Rather than ship a
 * goal that lies, it goes over as one thing you either did or did not do, with
 * both numbers written into the description so nothing is lost.
 */
export function goalToInsert(plan: NsPlan, runId: string, goal: NsGoal): NsTrackInsert {
  const area = plan.areas.find((a) => a.id === goal.areaId)
  const lifeArea = area ? areaSlug(area) : "custom"
  const descending = goal.ladder != null && isDescending(goal.ladder)
  const unit = goal.unit.trim() ? ` ${goal.unit.trim()}` : ""

  const insert: NsTrackInsert = {
    _tempId: goal.id,
    _tempParentId: null,
    title: goal.title.trim().slice(0, 200),
    life_area: lifeArea,
    category: lifeArea,
    template_id: trackTemplateId(runId, goal.id),
    target_value: 1,
    tracking_type: "boolean",
    period: "yearly",
    goal_type: "milestone",
    goal_nature: isSystem(goal) ? "input" : "outcome",
  }

  // The why is the fuel, and it is the one line the hub already has a home for.
  const why = goal.why.trim()
  if (why) insert.motivation_note = why.slice(0, 500)

  // The sentence is the goal as the plan states it; the description is where
  // the hub shows it. Numbers a descending goal would otherwise lose go here.
  const parts: string[] = []
  if (goal.sentence.trim()) parts.push(goal.sentence.trim())
  if (descending && goal.ladder) parts.push(`From ${goal.ladder.start}${unit} down to ${goal.ladder.target}${unit}.`)
  if (parts.length) insert.description = parts.join(" ").slice(0, 2000)

  if (goal.targetDate) insert.target_date = goal.targetDate
  if (goal.values.length) insert.aligned_values = goal.values.slice(0, 7)

  if (isSystem(goal)) {
    // How much a week, or how often a week when there is no "how much".
    insert.tracking_type = "counter"
    insert.period = "weekly"
    insert.target_value = clampInt(goal.perWeek ?? goal.daysPerWeek, 1)
    insert.goal_type = "habit_ramp"
    if (goal.rampSteps?.length) insert.ramp_steps = goal.rampSteps as unknown as Record<string, unknown>[]
    return insert
  }

  if (goal.ladder && !descending) {
    insert.tracking_type = "counter"
    insert.target_value = clampInt(goal.ladder.target, 1)
    insert.current_value = clampInt(goal.ladder.start, 0)
    insert.milestone_config = goal.ladder as unknown as Record<string, unknown>
    insert.period = goal.targetDate ? "custom" : "yearly"
    if (goal.targetDate) insert.custom_end_date = goal.targetDate
    return insert
  }

  // Finish line, and every descending ladder.
  if (goal.targetDate) {
    insert.period = "custom"
    insert.custom_end_date = goal.targetDate
  }
  return insert
}

/**
 * THE WHOLE PUSH, IN THE ORDER IT HAS TO GO.
 *
 * `createGoalBatch` resolves `_tempParentId` against the temp ids it has
 * already inserted in the same call, so a child that arrives before its parent
 * silently loses the link. `feedsGoalIds` is acyclic by construction on the
 * plan, so a depth-first walk emitting parents first is enough.
 *
 * A parent that is already in the hub is a different case and gets its real
 * uuid on `parent_goal_id` instead — which is what makes pushing five goals
 * now and five more next week produce the same hierarchy as pushing ten at
 * once, rather than ten orphans.
 *
 * Within that constraint the order is the plan's own priority order, so the
 * hub's list opens reading the way the plan reads.
 */
export function buildTrackInserts(
  plan: NsPlan,
  runId: string,
  opts: { goalIds?: string[]; pushedRealIds?: ReadonlyMap<string, string> } = {}
): NsTrackInsert[] {
  const { goalIds, pushedRealIds } = opts
  const wanted = goalIds ? new Set(goalIds) : new Set(plan.goals.map((g) => g.id))
  const byId = new Map(plan.goals.map((g) => [g.id, g]))

  const ordered = goalsByPriority(plan).filter((g) => wanted.has(g.id))
  // goalsByPriority only covers what priorityIds knows about; a goal added in
  // the same tick is not in it yet and must not be dropped from the push.
  const seen = new Set(ordered.map((g) => g.id))
  for (const g of plan.goals) if (wanted.has(g.id) && !seen.has(g.id)) ordered.push(g)

  const out: NsTrackInsert[] = []
  const emitted = new Set<string>()
  const walking = new Set<string>()

  const emit = (goal: NsGoal) => {
    if (emitted.has(goal.id) || walking.has(goal.id)) return
    walking.add(goal.id)

    // The goal this one feeds is its parent. Already over there → real uuid.
    // In this same push → temp id, once it has been emitted above us.
    const parentId = goal.feedsGoalIds.find((id) => byId.has(id) && (wanted.has(id) || pushedRealIds?.has(id))) ?? null
    const parentRealId = parentId ? pushedRealIds?.get(parentId) ?? null : null
    if (parentId && !parentRealId) {
      const parent = byId.get(parentId)
      if (parent) emit(parent)
    }
    walking.delete(goal.id)
    if (emitted.has(goal.id)) return

    const insert = goalToInsert(plan, runId, goal)
    if (parentRealId) insert.parent_goal_id = parentRealId
    else if (parentId && emitted.has(parentId)) insert._tempParentId = parentId
    out.push(insert)
    emitted.add(goal.id)
  }

  for (const goal of ordered) emit(goal)
  return out
}

/**
 * The track step's list: every goal in the plan, what it would become, and
 * whether it is already over there.
 *
 * `pushedRealIds` comes from the goals the hub currently holds, so a goal
 * deleted in the hub shows as pushable again rather than as permanently done.
 */
export function trackRows(plan: NsPlan, runId: string, pushedRealIds: ReadonlyMap<string, string>): NsTrackRow[] {
  return buildTrackInserts(plan, runId).map((insert) => {
    const goal = plan.goals.find((g) => g.id === insert._tempId)!
    const area = plan.areas.find((a) => a.id === goal.areaId)
    return {
      goalId: goal.id,
      title: insert.title,
      areaLabel: area?.label ?? "Unfiled",
      areaColor: area?.color ?? "#71717a",
      shape: insert.tracking_type === "counter" ? (insert.period === "weekly" ? "weekly" : "climb") : "finish",
      readout: trackReadout(insert),
      pushed: pushedRealIds.has(goal.id),
    }
  })
}

/** The one-line "what this becomes over there", for the row. */
export function trackReadout(insert: NsTrackInsert): string {
  if (insert.tracking_type === "boolean") return "done or not done"
  if (insert.period === "weekly") return `${insert.target_value}× a week`
  return `${insert.current_value ?? 0} → ${insert.target_value}`
}

/**
 * The plan goals the hub is currently holding, as plan id → real uuid.
 *
 * Fed the hub's own goal rows. A row whose tag belongs to a different run —
 * the plan before somebody started over — is not this plan's goal and is left
 * out, so it shows as neither pushed nor a duplicate.
 */
export function pushedRealIds(
  runId: string,
  rows: ReadonlyArray<{ id: string; template_id?: string | null }>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    const goalId = trackGoalId(runId, row.template_id)
    if (goalId) map.set(goalId, row.id)
  }
  return map
}

// ============================================================================
// The schedule: what you will actually be doing, week by week and day by day
// ============================================================================

/**
 * WHAT BELONGS ON THE TRACK STEP, AND WHAT DOES NOT.
 *
 * A milestone is not a thing you do on a Tuesday. "Bench 100 kg" and "see the
 * northern lights" are outcomes — one you climb towards and one you either did
 * or did not — and putting them in a weekly view says you are behind on them
 * every week until the week you are not. The plan already separates the two:
 * `isSystem` is the rate you hold, `isMilestone` is the thing you reach.
 *
 * So the schedule is built from the two things that actually repeat:
 *
 *   - **drivers** — `habit_ramp` goals, the rates ("20 approaches a week")
 *   - **routine steps** — the stacks, which are where days and times live
 *
 * Experiences, targets and finish lines are deliberately absent. They are the
 * reason the drivers exist and they are read somewhere else.
 */
export interface TrackActivity {
  id: string
  kind: "driver" | "routine"
  title: string
  /**
   * The routine this step belongs to, for a step. Null for a driver.
   *
   * The id and not just the label, because the schedule groups by it and two
   * routines are allowed to be called the same thing — a person with "Gym" as
   * both a morning stack and an evening one would otherwise see one header
   * holding both.
   */
  routineId: string | null
  routineLabel: string | null
  areaLabel: string
  areaColor: string
  /** Which days it is on, 0 = Monday. Empty means no days chosen yet. */
  days: number[]
  /** Minutes into the day, when the plan says. */
  startMin: number | null
  /** Rough length in minutes, 0 when nothing has said. */
  minutes: number
  /** Times a week at steady state, once any ramp is over. */
  perWeek: number
  /** What is counted when it is not occasions — "approaches", "km". */
  unit: string
  /** The ease-in, when there is one. */
  ramp: HabitRampStep[] | null
}

/** Everything in the plan that repeats, in the plan's own priority order. */
export function trackActivities(plan: NsPlan): TrackActivity[] {
  const areaOf = (areaId: string | null) => plan.areas.find((a) => a.id === areaId)
  const out: TrackActivity[] = []

  // Drivers first: they are the goals, and the plan already ranked them.
  for (const goal of goalsByPriority(plan)) {
    if (!isSystem(goal)) continue
    const area = areaOf(goal.areaId)
    out.push({
      id: goal.id,
      kind: "driver",
      title: goal.title,
      routineId: null,
      routineLabel: null,
      areaLabel: area?.label ?? "Unfiled",
      areaColor: area?.color ?? "#71717a",
      // A driver says how OFTEN, never which days — that is the week grid's job.
      days: [],
      startMin: null,
      minutes: 0,
      perWeek: Math.max(1, Math.round(goal.perWeek ?? goal.daysPerWeek)),
      unit: goal.perWeek != null ? goal.unit.trim() : "",
      ramp: goal.rampSteps?.length ? goal.rampSteps : null,
    })
  }

  for (const routine of plan.routines) {
    const area = areaOf(routine.areaId)
    for (const step of routine.steps) {
      out.push({
        id: step.id,
        kind: "routine",
        title: step.title,
        routineId: routine.id,
        routineLabel: routine.label,
        areaLabel: area?.label ?? routine.label,
        areaColor: area?.color ?? "#71717a",
        days: [...step.days].sort((a, b) => a - b),
        startMin: step.startMin,
        minutes: step.minutes,
        perWeek: Math.max(1, step.days.length || step.daysPerWeek),
        unit: "",
        ramp: null,
      })
    }
  }

  return out
}

/**
 * How many times this activity runs in week N, 1-based.
 *
 * A ramp is the honest answer to "what will I be doing" — somebody easing in at
 * twice a week for a month is not doing four a week in week two, and a
 * schedule that says they are is the schedule they stop reading. Past the end
 * of the ramp it is the steady rate.
 */
export function activityPerWeek(activity: TrackActivity, weekIndex: number): number {
  if (!activity.ramp?.length) return activity.perWeek
  let week = 0
  for (const step of activity.ramp) {
    week += Math.max(1, Math.round(step.durationWeeks))
    if (weekIndex <= week) return Math.max(0, Math.round(step.frequencyPerWeek))
  }
  return activity.perWeek
}

export interface TrackWeekRow {
  activity: TrackActivity
  perWeek: number
  /** True on the week the number goes up, which is the week worth seeing. */
  stepsUp: boolean
}

export interface TrackWeek {
  /** 1-based. Week 1 is the week containing the day you are looking at it. */
  index: number
  /** The Monday of this week. */
  startISO: string
  rows: TrackWeekRow[]
  /** Everything added up: how many times you do something this week. */
  sessions: number
}

/** The Monday on or before an ISO date. */
export function weekStartISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // 0 = Monday
  return addDaysISO(iso, -weekday)
}

/**
 * The next `count` weeks, each with what runs in it.
 *
 * Week by week rather than a single "this is your week" because the interesting
 * question a plan cannot answer on its own is what it turns into: the ramp
 * stepping up in week five is the part people need to see before they agree
 * to it.
 */
export function trackWeeks(plan: NsPlan, todayISO: string, count = 8): TrackWeek[] {
  const activities = trackActivities(plan)
  const monday = weekStartISO(todayISO)
  const weeks: TrackWeek[] = []

  for (let i = 1; i <= count; i += 1) {
    const rows = activities.map((activity) => {
      const perWeek = activityPerWeek(activity, i)
      return { activity, perWeek, stepsUp: i > 1 && perWeek > activityPerWeek(activity, i - 1) }
    })
    weeks.push({
      index: i,
      startISO: addDaysISO(monday, (i - 1) * 7),
      rows: rows.filter((r) => r.perWeek > 0),
      sessions: rows.reduce((n, r) => n + r.perWeek, 0),
    })
  }

  return weeks
}

export interface TrackDayItem {
  activity: TrackActivity
  startMin: number | null
}

export interface TrackDay {
  dateISO: string
  /** 0 = Monday. */
  weekday: number
  /** True for the day you are looking at it on. */
  isToday: boolean
  /** In time order, the ones with a time first. */
  items: TrackDayItem[]
}

/**
 * The next `count` days, each with what sits on it.
 *
 * Only what has been given days can be drawn on one: a driver says "four times
 * a week" and nothing about Tuesday, so it is not invented onto a day here. It
 * comes back from `unscheduledActivities` instead, said plainly, next to the
 * screen that can fix it.
 */
export function trackDays(plan: NsPlan, todayISO: string, count = 7): TrackDay[] {
  const activities = trackActivities(plan).filter((a) => a.days.length > 0)
  const days: TrackDay[] = []

  for (let i = 0; i < count; i += 1) {
    const dateISO = addDaysISO(todayISO, i)
    const [y, m, d] = dateISO.split("-").map(Number)
    const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
    const items = activities
      .filter((a) => a.days.includes(weekday))
      .map((activity) => ({ activity, startMin: activity.startMin }))
      .sort((a, b) => (a.startMin ?? 24 * 60) - (b.startMin ?? 24 * 60))
    days.push({ dateISO, weekday, isToday: i === 0, items })
  }

  return days
}

/**
 * Things that run every week and have not been given a day.
 *
 * Not a failure state: "four times a week" is a complete answer for most of
 * them, and the day view simply cannot draw it. Named so the day view is not
 * quietly missing half the plan.
 */
export function unscheduledActivities(plan: NsPlan): TrackActivity[] {
  return trackActivities(plan).filter((a) => a.days.length === 0)
}

/**
 * WHAT A THING BELONGS TO, rather than a flat list of everything.
 *
 * "Read your north star out loud" is not a thing you do; it is the third line
 * of your morning routine. Listed flat beside "Drink water" and "Bench press"
 * it reads as one more chore on a list of nineteen, and the stack it belongs
 * to — the thing you actually run, once, at seven — is nowhere on the screen.
 *
 * So the schedule groups: one header per routine, its steps underneath it, in
 * the order the day happens. Morning before work before night, because the
 * only ordering a day has is the clock. A routine whose steps have no time
 * yet keeps its place in the plan's own order, after the timed ones — it is
 * unplaced, not last thing at night.
 *
 * Drivers are the exception and get one group of their own at the end. A
 * driver says "twenty approaches a week" and names no hour, so it has no
 * position in a day; pretending it does would put it at midnight.
 */
export interface TrackGroup {
  /** The routine's id, or `drivers` for the one that is not a routine. */
  id: string
  kind: "routine" | "drivers"
  label: string
  color: string
  /** The earliest clock time in the group, when anything in it has one. */
  startMin: number | null
  /** Rough total length, 0 when nothing in it has said. */
  minutes: number
  activities: TrackActivity[]
}

/** The one group that is not a routine: everything that names no hour. */
export const DRIVERS_GROUP_ID = "drivers"

/**
 * Group activities by what they belong to, in the order the day happens.
 *
 * Pure over whatever list it is handed — every activity in the plan for the
 * week grid, one day's worth for the day view — so both views group the same
 * way and a step cannot appear under one header in one of them and another
 * header in the other.
 */
export function trackGroups(activities: readonly TrackActivity[]): TrackGroup[] {
  const routines = new Map<string, TrackGroup>()
  const drivers: TrackActivity[] = []

  for (const activity of activities) {
    if (activity.kind === "driver" || !activity.routineId) {
      drivers.push(activity)
      continue
    }
    let group = routines.get(activity.routineId)
    if (!group) {
      group = {
        id: activity.routineId,
        kind: "routine",
        label: activity.routineLabel ?? activity.areaLabel,
        color: activity.areaColor,
        startMin: null,
        minutes: 0,
        activities: [],
      }
      routines.set(activity.routineId, group)
    }
    group.activities.push(activity)
    group.minutes += activity.minutes
    if (activity.startMin != null) {
      group.startMin = group.startMin == null ? activity.startMin : Math.min(group.startMin, activity.startMin)
    }
  }

  // Sort is stable, so untimed groups hold the plan's own order behind the
  // timed ones rather than being shuffled into an order nobody chose. Same
  // inside a group: a morning stack with no times keeps the stack's order.
  const clock = (min: number | null) => (min == null ? Number.POSITIVE_INFINITY : min)
  const groups = [...routines.values()].sort((a, b) => clock(a.startMin) - clock(b.startMin))
  for (const group of groups) group.activities.sort((a, b) => clock(a.startMin) - clock(b.startMin))

  if (drivers.length > 0) {
    groups.push({
      id: DRIVERS_GROUP_ID,
      kind: "drivers",
      label: SCHEDULE_COPY.driversGroup,
      color: "#71717a",
      startMin: null,
      minutes: 0,
      activities: drivers,
    })
  }

  return groups
}

/**
 * "4 steps · ~19 min" — what a header says about what is folded inside it.
 *
 * Here rather than in either component because both screens draw the same
 * header, and two copies of this sentence drift the day one of them learns a
 * new word. A driver group counts goals, not steps: calling twenty approaches
 * a week a "step" files it as a line in a stack.
 */
export function groupSummary(group: TrackGroup): string {
  const n = group.activities.length
  const noun = group.kind === "routine" ? SCHEDULE_COPY.stepNoun : SCHEDULE_COPY.goalNoun
  const parts = [`${n} ${noun[n === 1 ? 0 : 1]}`]
  if (group.minutes > 0) parts.push(`~${group.minutes} min`)
  return parts.join(" · ")
}

/**
 * How much of a group has been ticked off on a day.
 *
 * Steps only: a driver has a count, not a tick, and counting it here would
 * make a group of five read "0 of 6" forever.
 */
export function groupLogged(plan: NsPlan, date: string, group: TrackGroup): { done: number; total: number } {
  const steps = group.activities.filter((a) => a.kind === "routine")
  return { done: steps.filter((a) => stepLogged(plan, date, a.id)).length, total: steps.length }
}

// ============================================================================
// Today: the one screen that asks what you actually did
// ============================================================================

/**
 * One thing you can put a number or a tick against today.
 *
 * Two kinds, and they are stored in two different places for a reason:
 *
 *   - **A step** is a line in a routine. It is not a goal and never becomes
 *     one, so its tick lives on the plan (`plan.logged`), beside the step.
 *   - **A driver** is a goal. Once it has been pushed on the track step it is a
 *     row in `user_goals` with a target, a period and a weekly reset already
 *     built, so its count belongs there and nowhere else. Until it is pushed
 *     there is nothing to count it, and this says so rather than inventing a
 *     second tally that would disagree with the first the moment you push.
 */
export interface TodayItem {
  activity: TrackActivity
  /** Steps: ticked today. Drivers: never — a driver has a count, not a tick. */
  done: boolean
  /** Drivers only: the real goal's uuid, once it has been pushed. */
  goalId: string | null
  /** Drivers only: where the count stands this period, from the hub. */
  current: number | null
  /** Drivers only: what the period is for. */
  target: number | null
  /** What the plan says about today for this one. */
  when: TodayWhen
}

/**
 * WHAT THE PLAN ACTUALLY SAYS ABOUT TODAY, which is three answers and not two.
 *
 *   - `today`    — the plan put it on today. Named days that include today, or
 *                  seven days a week, which is every day including this one.
 *   - `anyDay`   — a rate that names no day: "once a week", "twenty approaches
 *                  a week". Today is as good a day as any and the plan has no
 *                  opinion; whether you are behind on it is a question about
 *                  the week, not about this morning.
 *   - `otherDay` — placed, and placed somewhere else. Thursday's stack, on a
 *                  Monday.
 *
 * It was a boolean, and the middle case fell into the false half: the weekly
 * review and the piece of content you write once a week sat in "everything
 * else that runs" beside Thursday's routine, which reads as "not your problem
 * today" for two things that are exactly today's problem if today is the day
 * you do them.
 */
export type TodayWhen = "today" | "anyDay" | "otherDay"

/**
 * Which of the three today is for this activity.
 *
 * A step with days named is placed and the days decide. A step with none is a
 * rate: seven a week is every day, anything less names no day. A driver is
 * always a rate — "twenty approaches a week" is a week, not a Tuesday.
 */
export function todayWhen(activity: TrackActivity, weekday: number): TodayWhen {
  if (activity.kind !== "routine") return "anyDay"
  if (activity.days.length > 0) return activity.days.includes(weekday) ? "today" : "otherDay"
  return activity.perWeek >= 7 ? "today" : "anyDay"
}

/**
 * HOW OFTEN THIS RUNS, in words, for the line under its title.
 *
 * Reported against a list that did not say: a business routine held "one most
 * important task" and "write a piece of content" as identical rows, one daily
 * and one weekly, with nothing on either saying which. A tick against the
 * weekly one on the wrong day is a log that disagrees with the plan.
 *
 * Named days are given as days while they still fit on a line — "Mon · Thu" is
 * more use than "2× a week", and it is the same fact.
 */
export function cadenceLabel(activity: TrackActivity): string {
  const { everyDay, weekdays, onceAWeek, timesAWeek } = CADENCE_COPY

  if (activity.kind !== "routine") {
    const unit = activity.unit.trim()
    return unit ? `${activity.perWeek} ${unit} a week` : timesAWeek(activity.perWeek)
  }

  const days = activity.days
  if (days.length === 0) return activity.perWeek >= 7 ? everyDay : activity.perWeek <= 1 ? onceAWeek : timesAWeek(activity.perWeek)
  if (days.length === 7) return everyDay
  if (days.length === 5 && days.every((d) => d <= 4)) return weekdays
  if (days.length <= 3) return days.map((d) => WEEK_DAYS[d]).join(" · ")
  return timesAWeek(days.length)
}

/** Whether a routine step has been ticked on a given day. */
export function stepLogged(plan: NsPlan, date: string, stepId: string): boolean {
  return (plan.logged[date] ?? []).includes(stepId)
}

/**
 * Tick a step for a day, or untick it.
 *
 * An empty day is deleted rather than left as an empty array, so "did nothing"
 * and "was never opened" do not become two different shapes that read the same.
 */
export function toggleStepLogged(plan: NsPlan, date: string, stepId: string): NsPlan {
  const before = plan.logged[date] ?? []
  const after = before.includes(stepId) ? before.filter((id) => id !== stepId) : [...before, stepId]
  const logged = { ...plan.logged }
  if (after.length === 0) delete logged[date]
  else logged[date] = after
  return { ...plan, logged }
}

/**
 * EVERYTHING YOU COULD PUT IN TODAY, in the order you would work down it.
 *
 * What is on today comes first, because that is the question. Everything else
 * that runs weekly comes after it, unticked and unscheduled, because "I did my
 * approaches on a day I had not planned to" has to be recordable or the log
 * quietly under-counts the weeks somebody actually had.
 *
 * Milestones and experiences are not here, for the same reason they are not in
 * the schedule: neither is a thing you did today.
 */
export function todayItems(
  plan: NsPlan,
  date: string,
  hubGoals: ReadonlyArray<{ id: string; template_id?: string | null; current_value?: number; target_value?: number }>,
  runId: string
): TodayItem[] {
  const [y, m, d] = date.split("-").map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  const real = pushedRealIds(runId, hubGoals)
  const byId = new Map(hubGoals.map((g) => [g.id, g]))

  const items = trackActivities(plan).map((activity) => {
    const when = todayWhen(activity, weekday)
    if (activity.kind === "routine") {
      return { activity, done: stepLogged(plan, date, activity.id), goalId: null, current: null, target: null, when }
    }
    const goalId = real.get(activity.id) ?? null
    const row = goalId ? byId.get(goalId) : undefined
    return {
      activity,
      done: false,
      goalId,
      current: row?.current_value ?? null,
      target: row?.target_value ?? null,
      when,
    }
  })

  // On today first, then what today could be for, then the other days'. Within
  // each, steps by time, then drivers.
  const rank: Record<TodayWhen, number> = { today: 0, anyDay: 1, otherDay: 2 }
  return items.sort((a, b) => {
    if (a.when !== b.when) return rank[a.when] - rank[b.when]
    const at = a.activity.startMin ?? (a.activity.kind === "routine" ? 24 * 60 : 24 * 60 + 1)
    const bt = b.activity.startMin ?? (b.activity.kind === "routine" ? 24 * 60 : 24 * 60 + 1)
    return at - bt
  })
}

/**
 * THE THINGS THAT ARE NOT A WEEKLY RHYTHM AT ALL.
 *
 * Everything above this is something you do again and again: seven mornings a
 * week, once a week, twenty a week. This is the other half of a plan — the
 * experiences you want to have had and the milestones you are climbing towards
 * — and it is here because the flow had nowhere to tick one off. Reported as:
 * "I need to be able to differentiate between things I am supposed to do today
 * and things from my weekly or monthly or yearly list that I might check off."
 *
 * They are kept out of today's list and out of its count, for the reason the
 * schedule keeps them out of the week grid: a milestone is not a thing you do
 * on a Tuesday, and counting "see the northern lights" as undone today reads
 * as a day you failed. Folded away, in their own section, with their own
 * ticking.
 *
 * **Only an experience actually ticks.** It carries `done` and `doneOn` on the
 * plan, so a tick has somewhere true to live. A milestone does not: its
 * progress is the goal row in the hub once it has been pushed, and a second
 * tick here would be a second tally disagreeing with the first — the same trap
 * the unpushed drivers avoid. So a milestone is shown with what it is aimed at
 * and when, and nothing to click.
 */
export interface StandingItem {
  kind: "experience" | "milestone"
  id: string
  title: string
  areaLabel: string | null
  areaColor: string
  /** Experiences only: ticked, and the day it was ticked. */
  done: boolean
  doneOn: string | null
  /** Milestones only: the date it is aimed at, and the numbers under it. */
  targetDate: string | null
  readout: string | null
}

/**
 * The one-off half of the plan, in the order you would look at it.
 *
 * Milestones by date, soonest first, undated last — that is the order the
 * question "what is coming" is asked in. Experiences after them, the ones
 * still to do before the ones already done, because a list of things you have
 * had is a record and a list of things you have not is a plan.
 */
export function standingItems(plan: NsPlan): StandingItem[] {
  const areaOf = (areaId: string | null) => plan.areas.find((a) => a.id === areaId)
  const far = "9999-99-99"

  const milestones: StandingItem[] = plan.goals
    .filter((goal) => !isSystem(goal))
    .map((goal) => {
      const area = areaOf(goal.areaId)
      const unit = goal.unit.trim() ? ` ${goal.unit.trim()}` : ""
      return {
        kind: "milestone" as const,
        id: goal.id,
        title: goal.title,
        areaLabel: area?.label ?? null,
        areaColor: area?.color ?? "#71717a",
        done: false,
        doneOn: null,
        targetDate: goal.targetDate,
        readout: goal.ladder ? `${goal.ladder.start}${unit} → ${goal.ladder.target}${unit}` : null,
      }
    })
    .sort((a, b) => (a.targetDate ?? far).localeCompare(b.targetDate ?? far))

  const experiences: StandingItem[] = plan.experiences
    .map((exp) => {
      const area = areaOf(exp.areaId)
      return {
        kind: "experience" as const,
        id: exp.id,
        title: exp.title,
        areaLabel: area?.label ?? null,
        areaColor: area?.color ?? "#71717a",
        done: exp.done,
        doneOn: exp.doneOn,
        targetDate: null,
        readout: null,
      }
    })
    .sort((a, b) => Number(a.done) - Number(b.done))

  return [...milestones, ...experiences]
}

/**
 * EVERYTHING A TEXT FIELD CAN BE HUNG OFF, grouped the way the screen shows it.
 *
 * One flat list of ids would do for the data — a field names a target and the
 * row it belongs to finds it — but the control that ASSIGNS one is a picker,
 * and a picker over "everything in the plan" is forty unlabelled titles in the
 * order the plan happens to hold them. So each option carries the header it
 * appears under on Today, and the picker draws them as groups: the routine's
 * own name for a step, the drivers, the milestones, the experiences.
 *
 * The day itself is not in here. It is not a thing in the plan and it is the
 * default rather than an option, so the screen offers it in its own place.
 */
export interface FieldTarget {
  id: string
  label: string
  /** The header it sits under on Today. */
  group: string
}

/**
 * SOMETHING YOU ALREADY WROTE, ON THE ROW THAT TELLS YOU TO READ IT.
 *
 * "Read your north star out loud" is a line in a morning stack, and as a tick
 * on its own it is useless: the paragraph it names lives four steps away
 * behind two clicks, so the step either sends you off the screen or gets
 * ticked without being done. The honest version of that row is the paragraph
 * itself, at 07:00, under the line that asks for it.
 *
 * Everything readable in the plan, with its text resolved live rather than
 * copied: editing the north star changes what the morning row shows, because
 * there is one paragraph and not a paragraph and a stale quote of it.
 *
 * **Only what has been written.** An empty source is not offered — a picker
 * full of blank promises is how somebody attaches "what a 10 looks like in
 * Health" to a row and reads nothing every morning.
 */
export interface ReadSource {
  id: string
  label: string
  /** The header it appears under in the picker. */
  group: string
  text: string
  /**
   * WHERE THIS ACTUALLY LIVES, so a field can send you to it rather than
   * quote it.
   *
   * Quoting is right for a paragraph you re-read at 07:00 and wrong for
   * anything you might want to CHANGE while you are looking at it: a goal's
   * date, its curve, how many times a week it runs. Those controls exist,
   * three tabs away, and a blockquote on Today is a picture of them.
   */
  home: NsPlace
}

export function readSources(plan: NsPlan): ReadSource[] {
  const out: ReadSource[] = []
  const push = (id: string, label: string, group: string, text: string, home: NsPlace) => {
    if (text.trim()) out.push({ id, label, group, text: text.trim(), home })
  }
  const { starGroup, valuesGroup, areasGroup, goalsGroup } = READ_COPY

  push("star", READ_COPY.starLabel, starGroup, plan.northStar, { tab: "star", anchor: STAR_ANCHOR })
  /**
   * The two prompt sets are answered on two different steps, and a field that
   * lands you on the wrong one is a link that goes to the right page and the
   * wrong screen. The star questions are written on step 1; the review
   * questions live under Commit.
   */
  const starIds = new Set(STAR_PROMPTS.map((p) => p.id))
  for (const prompt of [...STAR_PROMPTS, ...REVIEW_PROMPTS]) {
    push(`answer:${prompt.id}`, prompt.question, starGroup, plan.answers[prompt.id] ?? "", {
      tab: starIds.has(prompt.id) ? "star" : "commit",
      anchor: starIds.has(prompt.id) ? `star-${prompt.id}` : `prompt-${prompt.id}`,
    })
  }
  // The ordered list, as one block: "whatever number one is, everything else is
  // being filtered through that" is a fact about the ORDER, so reading value
  // four on its own would be reading the one thing the exercise is not about.
  push("values", READ_COPY.valuesLabel, valuesGroup, plan.values.map((v, i) => `${i + 1}. ${v}`).join("\n"), { tab: "values" })

  for (const area of plan.areas) {
    const review = plan.review[area.id]
    if (!review) continue
    // All three are written in the area's own dialog, which the assessment
    // step opens. One place, three questions.
    const home: NsPlace = { tab: "now", areaId: area.id }
    push(`area:${area.id}:ten`, READ_COPY.areaTen(area.label), areasGroup, review.ten, home)
    push(`area:${area.id}:purpose`, READ_COPY.areaPurpose(area.label), areasGroup, review.purpose, home)
    push(`area:${area.id}:identity`, READ_COPY.areaIdentity(area.label), areasGroup, review.identity, home)
  }

  for (const goal of goalsByPriority(plan)) {
    // The goal's card, on the step that holds goals of its kind. Everything
    // that can be CHANGED about a goal — its date, its curve, how many times a
    // week, what it feeds — is on that card and nowhere else.
    const home: NsPlace = {
      tab: isMilestone(goal) ? "milestones" : "systems",
      areaId: goal.areaId,
      goalId: goal.id,
    }
    /**
     * THE GOAL ITSELF, not one paragraph of it.
     *
     * The four below are pieces of writing about a goal, and reading one back
     * is the whole point of them. This one exists for the other direction: a
     * Today row that means "open this goal" — because the thing you want at
     * that moment is usually not to re-read the why, it is to move the date or
     * change the number. Its text is the sentence when there is one, so it is
     * still worth quoting inline for anyone who picks it as a read.
     */
    push(`goal:${goal.id}`, READ_COPY.goalItself(goal.title), goalsGroup, goal.sentence.trim() || goal.title, home)
    push(`goal:${goal.id}:why`, READ_COPY.goalWhy(goal.title), goalsGroup, goal.why, home)
    push(`goal:${goal.id}:sentence`, READ_COPY.goalSentence(goal.title), goalsGroup, goal.sentence, home)
    push(`goal:${goal.id}:pain`, READ_COPY.goalPain(goal.title), goalsGroup, goal.painWhy, home)
    push(`goal:${goal.id}:reasons`, READ_COPY.goalReasons(goal.title), goalsGroup, goal.reasonsList.join("\n"), home)
  }

  /**
   * THE DRIVING FORCE: the five, as one thing.
   *
   * Last, because it is not a sixth piece of the plan — it is the other five
   * read in order, which is what the practice actually is. Composed from the
   * sources already pushed above rather than from the plan again, so a heading
   * can never appear over a paragraph that has since been emptied, and the
   * whole source disappears on its own when nothing under it has been written.
   *
   * It goes to the recap page because that page IS these five parts in order.
   */
  const driving = [
    [READ_COPY.drivingHeadings.star, plan.northStar],
    [READ_COPY.drivingHeadings.why, plan.answers[STAR_WHY_ID] ?? ""],
    [READ_COPY.drivingHeadings.identity, plan.answers["identity_total"] ?? ""],
    [READ_COPY.drivingHeadings.conduct, plan.answers["conduct"] ?? ""],
    [READ_COPY.drivingHeadings.values, plan.values.map((v, i) => `${i + 1}. ${v}`).join("\n")],
  ]
    .filter(([, text]) => text.trim())
    .map(([heading, text]) => `${heading}\n${text.trim()}`)
    .join("\n\n")
  push("driving", READ_COPY.drivingLabel, starGroup, driving, { tab: "recap", anchor: RECAP_DRIVING_ANCHOR })

  /**
   * THE WHY UNDER ONE GOAL, for the row that says exactly that.
   *
   * "Re-read the why under one goal" is a step in the manifestation stack, and
   * it pointed nowhere because it names no particular goal. Making somebody
   * pick one would be answering a question the row leaves open on purpose — the
   * practice is re-reading a reason, not a specific reason. So it resolves to
   * the goal the plan already puts first, and the arrow carries that goal's
   * name so the door is never a mystery.
   *
   * It disappears with the same rule as everything else here: no goals, or no
   * why written under the first one, and the row says so rather than opening
   * onto a blank.
   */
  const top = goalsByPriority(plan).find((g) => g.why.trim())
  if (top) {
    push(`why:top`, READ_COPY.topWhyLabel(top.title), goalsGroup, top.why, {
      tab: isMilestone(top) ? "milestones" : "systems",
      areaId: top.areaId,
      goalId: top.id,
    })
  }

  return out
}

/** The one source a read field names, or null when it names nothing that exists. */
export function readSource(plan: NsPlan, id: string | null): ReadSource | null {
  if (!id) return null
  return readSources(plan).find((s) => s.id === id) ?? null
}

/**
 * WHERE A ROW CAN SEND YOU — everything readable, plus the journal.
 *
 * `readSources` is one half of the answer and was for a while treated as the
 * whole of it: a destination had to be a piece of the plan you had already
 * written, which is right for "read your north star" and useless for "Journal".
 * A row whose words ask you to WRITE has a destination too, and it is the page
 * where the writing lives.
 *
 * So the id space grows one prefix. `journal:all` is the page itself;
 * `journal:<setId>` is the page opened on one of the standard sets, which is
 * how "Weekly review" leads to four questions rather than to a checkbox.
 * Everything without the prefix is a read source and resolves exactly as before.
 */
export interface Destination {
  id: string
  label: string
  group: string
  home: NsPlace
}

export function destinations(plan: NsPlan): Destination[] {
  const out: Destination[] = readSources(plan).map(({ id, label, group, home }) => ({ id, label, group, home }))
  out.push({ id: JOURNAL_ALL_ID, label: JOURNAL_COPY.title, group: JOURNAL_COPY.tab, home: { tab: "journal" } })
  for (const set of JOURNAL_SETS) {
    out.push({ id: `${JOURNAL_PREFIX}${set.id}`, label: set.title, group: JOURNAL_COPY.tab, home: { tab: "journal", anchor: journalSetAnchor(set.id) } })
  }
  return out
}

/** The one destination a row names, or null when it names nothing that exists. */
export function destination(plan: NsPlan, id: string | null): Destination | null {
  if (!id) return null
  return destinations(plan).find((d) => d.id === id) ?? null
}

/** Where a standard set lands on the journal page. One name, both ends. */
export function journalSetAnchor(setId: string): string {
  return `journal-set-${setId}`
}

// ------------------------------------------------------------- the journal

/**
 * ONE QUESTION THE PLAN IS ASKING YOU, whoever put it there.
 *
 * Two things ask questions and the journal must not care which: a routine step
 * whose own words ask for words ("Write three gratitudes", "Two lines on how
 * the day went"), and a field somebody added themselves. They differ in where
 * they came from and in nothing else — same store, same archive, same box.
 *
 * `from` is what the page says under the question, so an answer written months
 * ago can still be placed: "from Morning routine" or "your own question".
 * `today` is whether it is being asked THIS day, which for a step is the same
 * question the Today list asks and for a field is always yes.
 */
export interface JournalQuestion {
  id: string
  question: string
  from: string
  /** The step's routine, when a step asked it. Needed to edit the question. */
  routineId: string | null
  /** What the question hangs off, for a field. Null for the day itself. */
  targetId: string | null
  kind: "step" | "own"
  today: boolean
}

export function journalQuestions(plan: NsPlan, date: string): JournalQuestion[] {
  const [y, m, d] = date.split("-").map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  const byId = new Map(trackActivities(plan).map((a) => [a.id, a]))

  const out: JournalQuestion[] = []
  for (const routine of plan.routines) {
    for (const step of routine.steps) {
      const question = step.asks?.trim()
      if (!question) continue
      const activity = byId.get(step.id)
      out.push({
        id: step.id,
        question,
        from: JOURNAL_COPY.fromRoutine(routine.label),
        routineId: routine.id,
        targetId: null,
        kind: "step",
        // A step placed on Thursday is not asking you anything on a Monday, and
        // drawing its box under "Today" would be the page inventing a practice.
        today: activity ? todayWhen(activity, weekday) !== "otherDay" : true,
      })
    }
  }
  for (const field of plan.fields) {
    if (field.kind !== "write") continue
    out.push({
      id: field.id,
      question: field.label.trim() || TODAY_COPY.fieldUnnamed,
      from: JOURNAL_COPY.ownQuestion,
      routineId: null,
      targetId: field.targetId,
      kind: "own",
      today: true,
    })
  }
  return out
}

/**
 * EVERY ANSWER EVER GIVEN, newest day first.
 *
 * The archive the complaint asked for: *"see ALL old reports"*. Read straight
 * off `plan.journal` and `plan.notes` rather than off the questions, because
 * the two do not match and must not be made to — a question somebody has since
 * removed still has three months written under it, and dropping those entries
 * to keep the list tidy would be deleting somebody's diary to make a join
 * easier. Those rows carry the label they can still be given, which is that
 * the question is gone.
 */
export interface JournalDay {
  date: string
  /** The day's own note, when there is one. */
  note: string
  entries: Array<{ id: string; question: string; text: string; missing: boolean }>
}

export function journalArchive(plan: NsPlan, date: string): JournalDay[] {
  const asked = new Map(journalQuestions(plan, date).map((q) => [q.id, q.question]))
  const dates = new Set([...Object.keys(plan.journal), ...Object.keys(plan.notes)])
  return [...dates]
    .map((day) => ({
      date: day,
      note: (plan.notes[day] ?? "").trim(),
      entries: Object.entries(plan.journal[day] ?? {})
        .filter(([, text]) => text.trim())
        .map(([id, text]) => ({
          id,
          question: asked.get(id) ?? JOURNAL_COPY.gone,
          text: text.trim(),
          missing: !asked.has(id),
        }))
        .sort((a, b) => a.question.localeCompare(b.question)),
    }))
    .filter((day) => day.note || day.entries.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** "12 entries across 5 days", for the archive heading. */
export function journalTotals(days: JournalDay[]): { entries: number; days: number } {
  return { entries: days.reduce((n, day) => n + day.entries.length + (day.note ? 1 : 0), 0), days: days.length }
}

export function fieldTargets(plan: NsPlan): FieldTarget[] {
  const out: FieldTarget[] = []
  for (const group of trackGroups(trackActivities(plan))) {
    for (const activity of group.activities) out.push({ id: activity.id, label: activity.title, group: group.label })
  }
  // The one-off half, in the order the standing section draws it. Milestones
  // are goals and are already in the plan's own priority order there; adding
  // them here is what lets a field hang off "Bench 100 kg" and not only off
  // the driver that walks towards it.
  for (const item of standingItems(plan)) {
    out.push({
      id: item.id,
      label: item.title,
      group: item.kind === "milestone" ? SCHEDULE_COPY.milestoneGroup : SCHEDULE_COPY.experienceGroup,
    })
  }
  return out
}

/** How much of today's own list is done — steps only; a driver has no "done". */
export function todayProgress(items: TodayItem[]): { done: number; total: number } {
  const steps = items.filter((i) => i.when === "today" && i.activity.kind === "routine")
  return { done: steps.filter((i) => i.done).length, total: steps.length }
}
