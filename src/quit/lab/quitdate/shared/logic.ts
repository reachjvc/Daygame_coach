import { DAY, HOUR, MIN, addDays, dayKey, keyToMs, splitElapsed } from "../../progress/shared/calc"

/* ---------- quit date picker (copy e) ---------- */

export type DateChoice = "today" | "tomorrow" | "pick" | "later"

/** The stored quit date for a choice: today, tomorrow, the picked day, or none. */
export function quitDateFor(choice: DateChoice | null, picked: string, now: number): string | null {
  if (choice === "today") return dayKey(now)
  if (choice === "tomorrow") return addDays(dayKey(now), 1)
  if (choice === "pick") return /^\d{4}-\d{2}-\d{2}$/.test(picked) ? picked : null
  return null
}

/** Whole days from today to a date key (negative when past). */
export function daysUntil(dateKey: string, now: number): number {
  return Math.round((keyToMs(dateKey) - keyToMs(dayKey(now))) / DAY)
}

/** `.ics` text for an all-day event on a date key. */
export function icsFor(dateKey: string, title: string): string {
  const d = dateKey.replace(/-/g, "")
  const end = addDays(dateKey, 1).replace(/-/g, "")
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//quit-lab//EN", "BEGIN:VEVENT", `UID:${d}@quit-lab`, `DTSTAMP:${d}T000000Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${title}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n")
}

export function googleCalendarUrl(dateKey: string, title: string): string {
  const d = dateKey.replace(/-/g, "")
  const end = addDays(dateKey, 1).replace(/-/g, "")
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${d}/${end}`
}

/** Savings from cigarettes a day and pack price; the 20-cigarette pack is in the nicotine data file. */
export const PACK_SIZE = 20
export function savingsFor(perDay: number, packPrice: number) {
  const perDayMoney = (Math.max(0, perDay) / PACK_SIZE) * Math.max(0, packPrice)
  const r = (n: number) => Math.round(n * 100) / 100
  return { week: r(perDayMoney * 7), month: r((perDayMoney * 365) / 12), year: r(perDayMoney * 365) }
}

/* ---------- drinks plans (copies a and b) ---------- */

export type Goal = "cut" | "break" | "curious" | "stop"
export type Approach = "gradual" | "reset" | "mindful"

/** The card marked recommended: only the two branches the shots show. */
export function recommendedApproach(goal: Goal | null): Approach | null {
  if (goal === "cut") return "gradual"
  if (goal === "break") return "reset"
  return null
}

export type Pace = "fast" | "steady" | "gentle"
export const PACE_WEEKS: Record<Pace, string> = { fast: "2", steady: "4", gentle: "6 to 8" }

/** Day numbers of the checkpoints on the 90-day plan. */
export const CHECKPOINTS = [14, 21, 30, 45, 60, 75, 90] as const

/** Only the break branch showed the pace screen; the others are inferred as the same. */
export const showsPace = (goal: Goal | null) => goal === "break" || goal === "curious" || goal === "stop"

/* ---------- weekly table (copy b) ---------- */

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)

export type BGoal = "less" | "zero" | "unsure"

export type Chip = { kind: "equal" | "lower" | "higher"; label: string }
export function changeChip(plan: number | null, base: number): Chip {
  if (plan === null || plan === base) return { kind: "equal", label: "-" }
  const d = plan - base
  return d < 0 ? { kind: "lower", label: String(d) } : { kind: "higher", label: `+${d}` }
}

export type Shade = "green" | "amber" | "red"
/** A day's colour against that day's plan, not a fixed number. */
export function dayShade(drinks: number, plan: number): Shade {
  if (drinks <= plan) return "green"
  return drinks <= plan + 2 ? "amber" : "red"
}

/** Monday-first weekday index 0..6 of a Date. */
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7

/** Cells of a Monday-first month grid: leading nulls then day numbers. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = mondayIndex(new Date(year, month, 1))
  const count = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
}

/** Points of the falling curve, 0..1 in both axes (decorative, no axis). */
export function curvePoints(n = 24): { x: number; y: number }[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = i / n
    return { x, y: 0.12 + 0.76 * (0.5 - 0.5 * Math.cos(Math.PI * x)) }
  })
}

/* ---------- goal ladder and streaks (copy d) ---------- */

export interface TimeGoal {
  key: string
  ms: number
}
/** Only the goals the shots name. */
export const TIME_GOALS: readonly TimeGoal[] = [
  { key: "m20", ms: 20 * MIN },
  { key: "d1", ms: DAY },
  { key: "d2", ms: 2 * DAY },
  { key: "mo2", ms: 60 * DAY },
]

export const nextTimeGoal = (elapsed: number): TimeGoal | null => TIME_GOALS.find((g) => elapsed < g.ms) ?? null
export const reachedTimeGoals = (elapsed: number) => TIME_GOALS.filter((g) => elapsed >= g.ms)

/** "29D 20H 41M & 29S". */
export function goalCountdown(ms: number): string {
  const s = splitElapsed(ms)
  return `${s.days}D ${s.hours}H ${s.minutes}M & ${s.seconds}S`
}

/** "30 days 2 hours 6 minutes 41 seconds" with the unit words passed in. */
export function longSpan(ms: number, u: { d: string; h: string; m: string; s: string }): string {
  const t = splitElapsed(ms)
  return `${t.days} ${u.d} ${t.hours} ${u.h} ${t.minutes} ${u.m} ${t.seconds} ${u.s}`
}

export interface Streak {
  /** Start of the streak, ms. */
  startMs: number
  /** Length, ms. */
  lengthMs: number
}
export type StreakSort = "recent" | "oldest" | "best"

export function sortStreaks(list: readonly Streak[], mode: StreakSort): Streak[] {
  const c = [...list]
  if (mode === "recent") return c.sort((a, b) => b.startMs - a.startMs)
  if (mode === "oldest") return c.sort((a, b) => a.startMs - b.startMs)
  return c.sort((a, b) => b.lengthMs - a.lengthMs)
}

/** Ends the current run: it joins the past list and a new run starts at `now`. */
export function breakStreak(past: readonly Streak[], startMs: number, now: number): { past: Streak[]; startMs: number } {
  return { past: [...past, { startMs, lengthMs: Math.max(0, now - startMs) }], startMs: now }
}

export const longestMs = (past: readonly Streak[], currentMs: number) => Math.max(currentMs, ...past.map((s) => s.lengthMs))

/** A daily number to stay under, falling in a line to zero on the quit date (inferred). */
export function reductionTarget(startPerDay: number, startMs: number, quitMs: number, now: number): number {
  if (now >= quitMs || quitMs <= startMs) return 0
  const left = (quitMs - now) / (quitMs - startMs)
  return Math.max(0, Math.ceil(startPerDay * Math.min(1, left)))
}

/** A start in the past for the example data. */
export const seedStart = (now: number) => now - (30 * DAY + 2 * HOUR + 6 * MIN)
