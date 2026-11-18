/**
 * WHAT TODAY SHOWS, worked out from the plan: pure reads, no I/O (job spec 6.1).
 * The screens only draw these and call the plan's own day changes.
 */

import type { NsCheckpoint, NsDailyField, NsGoal, NsPlan, NsRoutine, NsRoutineStep } from "@/src/goals/types"
import { addDaysISO, weekStartISO } from "@/src/goals/northStarService"
import { stepsDue, type StepDue } from "@/src/goals/northStarTrackService"
import { latestReading, takesReadings } from "@/src/goals/goalReadings"
import { protectedId, ratingLabelsKey, isActive } from "../planFacts"

/** Monday is 0, the way a routine step's `days` count. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

export const weekDates = (date: string): string[] => {
  const monday = weekStartISO(date)
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
}

export interface DayStep {
  step: NsRoutineStep
  routine: NsRoutine
}

/** Every routine step whose days include the date, grouped by routine, sorted by start time then routine order. */
export function routineGroups(plan: NsPlan, date: string): { routine: NsRoutine; steps: NsRoutineStep[] }[] {
  const wd = weekdayIndex(date)
  const groups = plan.routines
    .map((routine, order) => ({ routine, order, steps: routine.steps.filter((s) => s.days.includes(wd)) }))
    .filter((g) => g.steps.length > 0)
  const first = (g: (typeof groups)[number]) => Math.min(...g.steps.map((s) => s.startMin ?? 24 * 60))
  groups.sort((a, b) => first(a) - first(b) || a.order - b.order)
  return groups.map(({ routine, steps }) => ({ routine, steps: [...steps].sort((a, b) => (a.startMin ?? 24 * 60) - (b.startMin ?? 24 * 60)) }))
}

export interface WeekItem {
  kind: "step" | "goal"
  id: string
  title: string
  count: number
  target: number
  protected: boolean
  clean: boolean
}

/** Weekly items with no fixed days, and every Practice goal (a quit goal is one with a clean-today button). Protected first. */
export function weekItems(plan: NsPlan, date: string): WeekItem[] {
  const dates = weekDates(date)
  const pid = protectedId(plan)
  const out: WeekItem[] = []
  for (const r of plan.routines) {
    for (const s of r.steps) {
      if (s.days.length > 0 || s.daysPerWeek <= 0) continue
      out.push({ kind: "step", id: s.id, title: s.title, count: dates.filter((d) => (plan.logged[d] ?? []).includes(s.id)).length, target: s.daysPerWeek, protected: s.id === pid, clean: false })
    }
  }
  for (const g of plan.goals) {
    const target = g.perWeek ?? g.daysPerWeek
    if (!isActive(g) || g.type !== "habit_ramp" || !(target > 0)) continue
    out.push({ kind: "goal", id: g.id, title: g.title, count: dates.reduce((n, d) => n + (plan.numbers[d]?.[g.id] ?? 0), 0), target, protected: g.id === pid, clean: g.isAbstinence })
  }
  return out.sort((a, b) => Number(b.protected) - Number(a.protected))
}

export function tasksDue(plan: NsPlan, date: string): StepDue[] {
  return stepsDue(plan, date).filter((d) => d.goal.type === "achievement")
}

/** The checkpoint that is a rung of a Target climb (its title is the number). */
export const isRung = (c: NsCheckpoint) => Number.isFinite(Number.parseFloat(c.title))

export interface ReadingRow {
  goal: NsGoal
  latest: number | null
  next: NsCheckpoint | null
  nextValue: number | null
  toGo: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function nextRungOf(goal: NsGoal): NsCheckpoint | null {
  return goal.checkpoints.find((c) => !c.done && isRung(c)) ?? null
}

export function readingRows(plan: NsPlan, date: string): ReadingRow[] {
  return plan.goals.filter((g) => isActive(g) && takesReadings(g)).map((goal) => {
    const latest = latestReading(plan, goal.id, date)?.value ?? null
    const next = nextRungOf(goal)
    const nextValue = next ? Number.parseFloat(next.title) : null
    return { goal, latest, next, nextValue, toGo: latest != null && nextValue != null ? round1(Math.abs(nextValue - latest)) : null }
  })
}

/** Has this reading reached the rung? A climb down (a weight to lose) is reached from above. */
export function reachedRung(goal: NsGoal, rungValue: number, reading: number): boolean {
  const start = goal.ladder?.start ?? rungValue
  return rungValue >= start ? reading >= rungValue : reading <= rungValue
}

/** Every rung the reading reaches that was open before it. */
export function rungsReachedBy(goal: NsGoal, reading: number): NsCheckpoint[] {
  return goal.checkpoints.filter((c) => !c.done && isRung(c) && reachedRung(goal, Number.parseFloat(c.title), reading))
}

export const fieldsFor = (plan: NsPlan, targetId: string | null): NsDailyField[] => plan.fields.filter((f) => f.targetId === targetId)

/** Low and high word of a tap scale, or empty strings. */
export function scaleLabels(plan: NsPlan, fieldId: string): { low: string; high: string } {
  const [low = "", high = ""] = (plan.answers[ratingLabelsKey(fieldId)] ?? "").split("|")
  return { low, high }
}

export interface DueCard {
  id: "review" | "season-ended" | "season-ending" | "past-date"
  goalTitle?: string
  days?: number
  href: string
}

/** Cards above the list: at most two, in the spec's order. The Next up card is added by the screen. */
export function dueCards(
  plan: NsPlan,
  today: string,
  reasons: { id: string; href: string; itemId?: string }[],
  seasonHref: string,
  closeHref: string,
  reviewHref: string,
): DueCard[] {
  const out: DueCard[] = []
  if (reasons.some((r) => r.id === "review.due")) out.push({ id: "review", href: reviewHref })
  const ends = plan.season?.endsOn
  if (ends) {
    const days = Math.round((Date.parse(ends) - Date.parse(today)) / 86_400_000)
    if (days < 0) out.push({ id: "season-ended", href: closeHref })
    else if (days <= 7) out.push({ id: "season-ending", days, href: seasonHref })
  }
  for (const r of reasons.filter((x) => x.id === "goals.past-date")) {
    out.push({ id: "past-date", goalTitle: plan.goals.find((g) => g.id === r.itemId)?.title ?? "", href: r.href })
  }
  return out.slice(0, 2)
}
