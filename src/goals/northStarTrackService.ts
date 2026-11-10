/**
 * The plan in time: the week's schedule, Today's list, the journal and where
 * each step leads. Pure: no fetch, no DB, no React.
 *
 * It once also turned the plan's goals into rows of `user_goals`, the old
 * goals table, tagged `ns:<run>:<goal id>`. Q4 of Plans/life-plan-rebuild.md
 * stopped that (Today counts on the plan's own days) and Phase 7 removed the
 * code and the copies.
 */

import type {
  NsCheckpoint,
  HabitRampStep,
  NsGoal,
  NsPlace,
  NsPlan,
} from "@/src/goals/types"
import { addDaysISO, daysBetween, goalsByPriority, isMilestone, isSystem, weekStartISO } from "@/src/goals/northStarService"
import { CADENCE_COPY, TODAY_COPY, JOURNAL_ALL_ID, JOURNAL_COPY, JOURNAL_PREFIX, JOURNAL_SETS, READ_COPY, RECAP_DRIVING_ANCHOR, REVIEW_PERIOD_COPY, REVIEW_PROMPTS, SCHEDULE_COPY, STAR_ANCHOR, STAR_PROMPTS, STAR_WHY_ID } from "@/src/goals/data/northStar"
import { WEEK_DAYS } from "@/src/goals/data/northStarStart"
/* "Is this step done today" has ONE owner, and it is not this file — see
   `dayTicks.ts` for why it is a leaf both services can import. */
import { stepTick, type TrainingTicks } from "@/src/goals/dayTicks"
import { isActive } from "@/src/goals/goalStatus"

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

/**
 * WHAT A PRACTICE ASKS FOR IN WEEK N — the one place that walks a ramp.
 *
 * THE BUG THIS FIXES. The owner's Approaches goal carries a ramp of five a
 * week for eight weeks, rising to twenty-one. The goal it created asked for
 * SEVEN a week from day one — neither end of the ramp. Seven was
 * `daysPerWeek`, a count of DAYS, standing in for a count of approaches
 * because `perWeek` was never set, and `goalToInsert` never looked at the ramp
 * at all.
 *
 * Meanwhile `activityPerWeek` walked the ramp correctly, so the week grid on
 * the Track step showed five while the goal directly beneath it asked for
 * seven. Two answers to one question, 250 lines apart in this file. Both now
 * come from here.
 *
 * PAST THE END OF THE RAMP it is `steadyRate`, below.
 */
export function practiceRateInWeek(
  practice: { perWeek: number | null; daysPerWeek: number; rampSteps: HabitRampStep[] | null },
  weekIndex: number,
): number {
  const ramp = practice.rampSteps
  if (ramp?.length) {
    let week = 0
    for (const step of ramp) {
      week += Math.max(1, Math.round(step.durationWeeks))
      if (weekIndex <= week) return Math.max(0, Math.round(step.frequencyPerWeek))
    }
    return steadyRate(practice)
  }
  return steadyRate(practice)
}

/**
 * THE RATE A PRACTICE SETTLES AT ONCE ITS RAMP IS OVER — one definition, for
 * the week grid, for the goal a practice becomes, and for every week after.
 *
 * An explicit `perWeek` wins, because somebody said it. Otherwise the plan's
 * "N× a week" (`daysPerWeek`) means two different things, and each surface
 * used to pick one: for Approaches it is a count of DAYS (7) while the ramp
 * climbs to twenty-one approaches, and for a Life Mastery driver — "gym four
 * times a week, easing in at two for a fortnight" — it IS the rate, and the
 * ramp is only the ease-in. The grid read it as the rate and showed SEVEN
 * after Approaches' ramp; the goal read the ramp's last step and settled the
 * gym at TWO. A ramp eases IN, so the steady rate is the larger of what it
 * built up to and the rate the plan names: 21 for one, 4 for the other.
 * tests/unit/goals/practiceRate.test.ts compares the two surfaces in every week.
 */
export function steadyRate(practice: {
  perWeek: number | null
  daysPerWeek: number
  rampSteps: HabitRampStep[] | null
}): number {
  if (practice.perWeek != null) return Math.max(0, Math.round(practice.perWeek))
  const ramp = practice.rampSteps
  const builtUpTo = ramp?.length ? Math.round(ramp[ramp.length - 1].frequencyPerWeek) : 0
  return Math.max(0, builtUpTo, Math.round(practice.daysPerWeek))
}

/**
 * A practice that is simply EVERY DAY, rather than so many times a week.
 *
 * Counting occasions is the test: a practice with an amount per week or a ramp
 * is counting THINGS, and seven of those a week is a weekly total rather than a
 * daily rule. `goalToInsert` sends the first kind over as a daily yes/no and
 * the second as a weekly counter, and `weeklyTotalOf` is how the two are
 * compared without pretending they are the same number.
 */
export function isEveryDay(goal: NsGoal): boolean {
  return goal.perWeek == null && !goal.rampSteps?.length && goal.daysPerWeek >= 7
}

/** Everything in the plan that repeats, in the plan's own priority order. */
export function trackActivities(plan: NsPlan): TrackActivity[] {
  const areaOf = (areaId: string | null) => plan.areas.find((a) => a.id === areaId)
  const out: TrackActivity[] = []

  // Drivers first: they are the goals, and the plan already ranked them.
  for (const goal of goalsByPriority(plan)) {
    // An achieved, paused or dropped goal is not something you do this week.
    if (!isSystem(goal) || !isActive(goal)) continue
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
      perWeek: Math.max(1, steadyRate(goal)),
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
  // `perWeek` on a TrackActivity is already the steady rate somebody named, so
  // it goes in as an explicit one rather than as a fallback.
  return practiceRateInWeek(
    { perWeek: activity.perWeek, daysPerWeek: activity.perWeek, rampSteps: activity.ramp },
    weekIndex,
  )
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

/** A step on the way to a goal that is due today or late (Plans/life-plan-dated-steps.md). */
export interface StepDue {
  goal: NsGoal
  checkpoint: NsCheckpoint
  dueOn: string
  /** Days past its day; 0 when due today. */
  late: number
}

/**
 * THE STEPS DUE: every open step of a goal being worked on whose day has come,
 * the latest-due last, so the one most behind is first. Only steps that were
 * given a day: an undated step is never due.
 */
export function stepsDue(plan: NsPlan, today: string): StepDue[] {
  const out: StepDue[] = []
  // Every goal: the ranked ones first, then any the ranking does not list.
  const ranked = goalsByPriority(plan)
  const goals = [...ranked, ...plan.goals.filter((g) => !ranked.includes(g))]
  for (const goal of goals) {
    if (!isActive(goal)) continue
    for (const checkpoint of goal.checkpoints) {
      if (checkpoint.done || !checkpoint.dueOn || checkpoint.dueOn > today) continue
      out.push({ goal, checkpoint, dueOn: checkpoint.dueOn, late: Math.max(0, daysBetween(checkpoint.dueOn, today)) })
    }
  }
  return out.sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

/** The Monday on or before an ISO date: `northStarService`'s, so a count and its week agree. */
export { weekStartISO }

/** The first day each part holds a number above zero, found in one pass over the days. */
export function firstCountDays(plan: NsPlan): Map<string, string> {
  const firsts = new Map<string, string>()
  for (const [date, row] of Object.entries(plan.numbers ?? {})) {
    for (const [id, n] of Object.entries(row)) {
      const had = firsts.get(id)
      if (n > 0 && (!had || date < had)) firsts.set(id, date)
    }
  }
  return firsts
}

/**
 * WHICH WEEK OF ITS RAMP A GOAL IS IN: the week it was first counted is week
 * one (Plans/life-plan-rebuild.md, Q4). The counted copy in the old goals table
 * walked its ramp from the day Track sent it; a goal counted on its days has no
 * such day, so its first count starts the ramp. Never counted, it is in week
 * one, which is where Today and the schedule both start it.
 */
export function rampWeek(plan: NsPlan, goalId: string, date: string, firsts = firstCountDays(plan)): number {
  const first = firsts.get(goalId)
  if (!first || first > date) return 1
  const [y1, m1, d1] = weekStartISO(first).split("-").map(Number)
  const [y2, m2, d2] = weekStartISO(date).split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (7 * 86_400_000)) + 1
}

/**
 * HOW MANY OF A GOAL THIS WEEK: the counts on its days, Monday to Sunday
 * (Plans/life-plan-rebuild.md, Q4). Each day's count is that day's number on
 * the goal, kept in the day half like a number box's.
 */
export function weekCount(plan: NsPlan, goalId: string, date: string): number {
  const monday = weekStartISO(date)
  let n = 0
  for (let i = 0; i < 7; i += 1) n += plan.numbers?.[addDaysISO(monday, i)]?.[goalId] ?? 0
  return n
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

  // A driver's ramp runs from the week it was first counted (`rampWeek`), so
  // this week's column asks what Today asks; a step has no ramp to walk.
  const firsts = firstCountDays(plan)
  const startAt = new Map(activities.map((a) => [a.id, a.kind === "driver" ? rampWeek(plan, a.id, todayISO, firsts) : 1]))
  for (let i = 1; i <= count; i += 1) {
    const rows = activities.map((activity) => {
      const at = (startAt.get(activity.id) ?? 1) + i - 1
      const perWeek = activityPerWeek(activity, at)
      // Marked on the week it rises, this week included once the ramp is under way.
      return { activity, perWeek, stepsUp: at > 1 && perWeek > activityPerWeek(activity, at - 1) }
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
 *
 * `ticks` is required rather than optional, and that is the fix. This counted
 * hand ticks while the rows folded underneath it counted hand ticks OR the
 * training log, so the header said `0/2` above two struck-through lines. An
 * optional argument would have left the same hole open for the next caller.
 */
export function groupLogged(
  plan: NsPlan,
  date: string,
  group: TrackGroup,
  ticks: TrainingTicks
): { done: number; total: number } {
  const steps = group.activities.filter((a) => a.kind === "routine")
  return { done: steps.filter((a) => stepTick(plan, date, a.id, ticks).done).length, total: steps.length }
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
  /**
   * Steps: the tick came from a finished workout, so it cannot be un-ticked.
   * Drivers: always false.
   */
  fromLog: boolean
  /** Drivers only: the plan goal being counted. */
  goalId: string | null
  /** Drivers only: how many this week, Monday to Sunday, from the day rows. */
  current: number | null
  /** Drivers only: what this week asks for, as the Track schedule says. */
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
  ticks: TrainingTicks
): TodayItem[] {
  const [y, m, d] = date.split("-").map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7

  const firsts = firstCountDays(plan)
  const items = trackActivities(plan).map((activity) => {
    const when = todayWhen(activity, weekday)
    if (activity.kind === "routine") {
      const tick = stepTick(plan, date, activity.id, ticks)
      return { activity, done: tick.done, fromLog: tick.fromLog, goalId: null, current: null, target: null, when }
    }
    /*
     * THE COUNT IS THE WEEK'S DAYS (Plans/life-plan-rebuild.md, Q4). It was
     * the counted goal's in `user_goals`, so a driver Track had never pushed
     * had no count at all, and one pushed on another device had none here.
     * Now every driver counts, on the day it was done, and the target is
     * this week's row of the Track schedule: the same number, its ramp walked
     * from the week it was first counted (`rampWeek`).
     */
    return {
      activity,
      done: false,
      fromLog: false,
      goalId: activity.id,
      current: weekCount(plan, activity.id, date),
      target: activityPerWeek(activity, rampWeek(plan, activity.id, date, firsts)),
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

  /**
   * A DREAM YOU DECIDED TO CHASE IS ONE THING, NOT TWO.
   *
   * `promoteExperience` turns a bucket-list line into a finish-line goal and
   * deliberately leaves the line in the list — a bucket list that empties out as
   * things get serious is one that empties out exactly as it starts working. But
   * both halves of this list then drew it, so the same dream appeared twice,
   * once tickable and once not.
   *
   * THE EXPERIENCE IS THE ONE THAT STAYS, and that is not arbitrary: `NsGoal`
   * has no `done` field, so a plan-side goal cannot be ticked at all. Hiding the
   * experience and showing the goal would have removed the only tick there is.
   */
  const promoted = new Set(
    plan.experiences.map((e) => e.goalId).filter((id): id is string => id != null),
  )

  const milestones: StandingItem[] = plan.goals
    // An achieved, paused or dropped goal is not standing work (Plans/life-plan-goal-status.md).
    .filter((goal) => !isSystem(goal) && !promoted.has(goal.id) && isActive(goal))
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
   * questions live on Everything, where Commit folded in.
   */
  const starIds = new Set(STAR_PROMPTS.map((p) => p.id))
  for (const prompt of [...STAR_PROMPTS, ...REVIEW_PROMPTS]) {
    push(`answer:${prompt.id}`, prompt.question, starGroup, plan.answers[prompt.id] ?? "", {
      tab: starIds.has(prompt.id) ? "star" : "recap",
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
  const top = goalsByPriority(plan).find((g) => g.why.trim() && isActive(g))
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

/**
 * THE REVIEW STEP, as a place a row can send you (Plans/life-plan-review-reads-back.md).
 * The weekly-review routine step pointed at the Journal's four weekly
 * questions, a second home for the review the Review step holds; it points
 * here now, and so does any step still naming that set (`destination`).
 */
export const REVIEW_DESTINATION_ID = "review"
const OLD_WEEKLY_REVIEW_ID = `${JOURNAL_PREFIX}weekly-review`

export function destinations(plan: NsPlan): Destination[] {
  const out: Destination[] = readSources(plan).map(({ id, label, group, home }) => ({ id, label, group, home }))
  out.push({ id: REVIEW_DESTINATION_ID, label: REVIEW_PERIOD_COPY.destination, group: REVIEW_PERIOD_COPY.title, home: { tab: "review" } })
  out.push({ id: JOURNAL_ALL_ID, label: JOURNAL_COPY.title, group: JOURNAL_COPY.tab, home: { tab: "journal" } })
  for (const set of JOURNAL_SETS) {
    const id = `${JOURNAL_PREFIX}${set.id}`
    // The Journal's weekly questions are not offered as a place to send a row:
    // a row naming them opens the Review step (`destination`), so offering them
    // would be a choice that lands somewhere else. The set stays on the Journal.
    if (id === OLD_WEEKLY_REVIEW_ID) continue
    out.push({ id, label: set.title, group: JOURNAL_COPY.tab, home: { tab: "journal", anchor: journalSetAnchor(set.id) } })
  }
  return out
}

/** The one destination a row names, or null when it names nothing that exists. */
export function destination(plan: NsPlan, id: string | null): Destination | null {
  if (!id) return null
  const wanted = id === OLD_WEEKLY_REVIEW_ID ? REVIEW_DESTINATION_ID : id
  return destinations(plan).find((d) => d.id === wanted) ?? null
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
  /**
   * The day's number boxes, in the boxes' own order (Plans/life-plan-rebuild.md,
   * Phase 6). Only boxes that still exist: a removed box takes its numbers with it.
   */
  numbers: Array<{ id: string; label: string; value: number }>
}

export function journalArchive(plan: NsPlan, date: string): JournalDay[] {
  const asked = new Map(journalQuestions(plan, date).map((q) => [q.id, q.question]))
  const numberBoxes = plan.fields.filter((f) => f.kind === "number")
  const dates = new Set([...Object.keys(plan.journal), ...Object.keys(plan.notes), ...Object.keys(plan.numbers ?? {})])
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
      numbers: numberBoxes
        .filter((f) => typeof plan.numbers?.[day]?.[f.id] === "number")
        .map((f) => ({ id: f.id, label: f.label.trim() || TODAY_COPY.fieldUnnamed, value: plan.numbers[day][f.id] })),
    }))
    .filter((day) => day.note || day.entries.length > 0 || day.numbers.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** "12 entries across 5 days", for the archive heading. */
export function journalTotals(days: JournalDay[]): { entries: number; days: number } {
  return { entries: days.reduce((n, day) => n + day.entries.length + (day.note ? 1 : 0) + (day.numbers?.length ?? 0), 0), days: days.length }
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
