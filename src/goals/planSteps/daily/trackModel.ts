/** WHAT TRACK SHOWS: weeks at a glance, climbs, history. Pure reads (job spec 6.2). */

import type { NsGoal, NsPlan } from "@/src/goals/types"
import { addDaysISO, weekStartISO } from "@/src/goals/northStarService"
import { rampWeek } from "@/src/goals/northStarTrackService"
import { growthProgress, isActive, weeklyItems, protectedId, tierOf, type WeeklyItem } from "../planFacts"
import { weekDates, nextRungOf } from "./todayModel"
import { latestReading, takesReadings } from "@/src/goals/goalReadings"

export interface WeekRow {
  item: WeeklyItem
  protected: boolean
  planned: number
  done: number
  /** One entry per day, Monday to Sunday: ticked or the count. */
  days: number[]
}

function plannedOf(plan: NsPlan, item: WeeklyItem): number {
  if (item.kind === "goal") {
    const g = plan.goals.find((x) => x.id === item.id)
    return g ? (g.perWeek ?? g.daysPerWeek) : 0
  }
  const s = plan.routines.flatMap((r) => r.steps).find((x) => x.id === item.id)
  return s ? s.days.length || s.daysPerWeek : 0
}

/** One week's rows, protected item first. `date` is any day of the week. */
export function weekRows(plan: NsPlan, date: string): WeekRow[] {
  const dates = weekDates(date)
  const pid = protectedId(plan)
  return weeklyItems(plan)
    .map((item) => {
      const days = dates.map((d) => (item.kind === "goal" ? (plan.numbers[d]?.[item.id] ?? 0) : (plan.logged[d] ?? []).includes(item.id) ? 1 : 0))
      return { item, protected: item.id === pid, planned: plannedOf(plan, item), done: item.kind === "goal" ? days.reduce((a, b) => a + b, 0) : days.filter(Boolean).length, days }
    })
    .sort((a, b) => Number(b.protected) - Number(a.protected))
}

/** The last `count` weeks before this one, newest first. A week with nothing planned or done is left out. */
export function pastWeeks(plan: NsPlan, today: string, count = 8): { monday: string; rows: WeekRow[] }[] {
  const monday = weekStartISO(today)
  const out: { monday: string; rows: WeekRow[] }[] = []
  for (let i = 1; i <= count; i++) {
    const m = addDaysISO(monday, -7 * i)
    const rows = weekRows(plan, m)
    if (rows.some((r) => r.done > 0)) out.push({ monday: m, rows })
  }
  return out
}

export type Climb =
  | { kind: "target"; goal: NsGoal; now: number | null; next: number | null }
  | { kind: "finish"; goal: NsGoal; done: number; total: number }
  | { kind: "practice"; goal: NsGoal; stage: number; of: number; perWeek: number }
  | { kind: "growth"; goal: NsGoal; pct: number }

export function climbs(plan: NsPlan, today: string): Climb[] {
  const out: Climb[] = []
  for (const g of plan.goals.filter(isActive)) {
    if (tierOf(plan, g) === "become") {
      const pct = growthProgress(plan, g.id)
      if (pct != null) out.push({ kind: "growth", goal: g, pct })
    } else if (takesReadings(g)) {
      const next = nextRungOf(g)
      out.push({ kind: "target", goal: g, now: latestReading(plan, g.id, today)?.value ?? null, next: next ? Number.parseFloat(next.title) : null })
    } else if (g.type === "achievement" && g.checkpoints.length > 0) {
      out.push({ kind: "finish", goal: g, done: g.checkpoints.filter((c) => c.done).length, total: g.checkpoints.length })
    } else if (g.type === "habit_ramp" && g.rampSteps && g.rampSteps.length > 1) {
      let week = rampWeek(plan, g.id, today)
      let stage = 0
      for (const [i, s] of g.rampSteps.entries()) {
        stage = i
        if (week <= s.durationWeeks) break
        week -= s.durationWeeks
      }
      out.push({ kind: "practice", goal: g, stage: stage + 1, of: g.rampSteps.length, perWeek: g.rampSteps[stage].frequencyPerWeek })
    }
  }
  return out
}

/** Answers of one number question over the last `days` days, oldest first; days with no answer are null. */
export function ratingStrip(plan: NsPlan, fieldId: string, today: string, days: number): { date: string; value: number | null }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(today, i - (days - 1))
    return { date, value: plan.numbers[date]?.[fieldId] ?? null }
  })
}

/** Old per-area daily ratings, newest day first. */
export function earlierRatings(plan: NsPlan): { date: string; scores: { area: string; value: number }[] }[] {
  return Object.entries(plan.daily)
    .filter(([, row]) => Object.keys(row).length > 0)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, row]) => ({ date, scores: Object.entries(row).map(([id, value]) => ({ area: plan.areas.find((a) => a.id === id)?.label ?? id, value })) }))
}

/** Old check-in area scores, newest first. */
export function earlierScores(plan: NsPlan): { date: string; scores: { area: string; value: number }[] }[] {
  return plan.reviews
    .filter((r) => Object.keys(r.scores).length > 0)
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
    .map((r) => ({ date: r.periodStart, scores: Object.entries(r.scores).map(([id, value]) => ({ area: plan.areas.find((a) => a.id === id)?.label ?? id, value })) }))
}
