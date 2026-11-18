import { DAY, wholeDays, moneySaved } from "../shared/calc"

export interface Habit {
  id: string
  name: string
  startMs: number
  perDay: number
  calPerDay: number
}

/** Day thresholds of the milestone chips, in the same order as the names in the text file. */
export const MILESTONE_DAYS = [1, 3, 7, 14, 21, 25, 30, 60, 90, 180, 365] as const

/** Index of the last reached milestone, or -1. */
export function lastMilestone(days: number): number {
  let idx = -1
  MILESTONE_DAYS.forEach((d, i) => {
    if (days >= d) idx = i
  })
  return idx
}

/** Fill of the days bar: progress to the next milestone (full after the last one). */
export function daysBarFill(days: number): number {
  const next = MILESTONE_DAYS.find((d) => days < d)
  if (next === undefined) return 1
  const prev = [...MILESTONE_DAYS].reverse().find((d) => days >= d) ?? 0
  return (days - prev) / (next - prev)
}

export interface Totals {
  days: number
  money: number
  calories: number
}

export function totals(h: Habit, nowMs: number): Totals {
  const days = wholeDays(h.startMs, nowMs)
  return { days, money: moneySaved(h.perDay, days), calories: Math.round(h.calPerDay * days) }
}

/** The habits of the copy: the main one from the setup, the seeded extras, the ones the user added. */
export function buildHabits(
  main: { startMs: number; perDay: number; calPerDay: number; seeded: number },
  names: { main: string; caffeine: string; pills: string },
  added: Habit[],
  rates: Record<string, number>,
): Habit[] {
  const list: Habit[] = [{ id: "main", name: names.main, startMs: main.startMs, perDay: main.perDay, calPerDay: main.calPerDay }]
  if (main.seeded) {
    list.push({ id: "x0", name: names.caffeine, startMs: main.startMs + 20 * DAY, perDay: main.perDay, calPerDay: 0 })
    list.push({ id: "x1", name: names.pills, startMs: main.startMs - 5 * DAY, perDay: main.perDay, calPerDay: 0 })
  }
  return [...list, ...added].map((h) => (rates[h.id] !== undefined ? { ...h, perDay: rates[h.id] } : h))
}

/** Pledge streak: consecutive pledged days ending today (or yesterday), capped at 7. */
export function pledgeStreak(pledged: string[], today: string, prevKey: (k: string) => string): number {
  const set = new Set(pledged)
  let k = set.has(today) ? today : prevKey(today)
  let n = 0
  while (set.has(k) && n < 7) {
    n++
    k = prevKey(k)
  }
  return n
}
