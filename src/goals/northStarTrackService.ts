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
  NsPlan,
  NsTrackInsert,
  NsTrackRow,
} from "@/src/goals/types"
import { addDaysISO, goalsByPriority, isSystem } from "@/src/goals/northStarService"
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
  /** The routine this step belongs to, for a step. Null for a driver. */
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
  /** True when the plan says this one is on today. */
  onToday: boolean
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
    const onToday = activity.kind === "routine" ? activity.days.includes(weekday) : true
    if (activity.kind === "routine") {
      return { activity, done: stepLogged(plan, date, activity.id), goalId: null, current: null, target: null, onToday }
    }
    const goalId = real.get(activity.id) ?? null
    const row = goalId ? byId.get(goalId) : undefined
    return {
      activity,
      done: false,
      goalId,
      current: row?.current_value ?? null,
      target: row?.target_value ?? null,
      onToday,
    }
  })

  // On today first; within that, steps by time, then drivers.
  return items.sort((a, b) => {
    if (a.onToday !== b.onToday) return a.onToday ? -1 : 1
    const at = a.activity.startMin ?? (a.activity.kind === "routine" ? 24 * 60 : 24 * 60 + 1)
    const bt = b.activity.startMin ?? (b.activity.kind === "routine" ? 24 * 60 : 24 * 60 + 1)
    return at - bt
  })
}

/** How much of today's own list is done — steps only; a driver has no "done". */
export function todayProgress(items: TodayItem[]): { done: number; total: number } {
  const steps = items.filter((i) => i.onToday && i.activity.kind === "routine")
  return { done: steps.filter((i) => i.done).length, total: steps.length }
}
