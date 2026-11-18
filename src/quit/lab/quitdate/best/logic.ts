import { DAY, addDays, dayKey, keyToMs } from "../../progress/shared/calc"

/** Whole days from today to a date key (negative when past). */
export function daysAhead(dateKey: string, nowMs: number): number {
  return Math.round((keyToMs(dateKey) - keyToMs(dayKey(nowMs))) / DAY)
}

export type ChipId = "in3" | "weekend" | "monday" | "in14"
export const CHIP_IDS: readonly ChipId[] = ["in3", "weekend", "monday", "in14"]

/** Monday-first weekday index 0..6 of a date key. */
const mondayIndex = (key: string) => (new Date(`${key}T12:00:00`).getDay() + 6) % 7

/**
 * The date a chip stands for, always after today:
 * in 3 days; this weekend (the coming Saturday, or tomorrow when today is Saturday, or next Saturday when today is Sunday);
 * next Monday (never today); in 2 weeks.
 */
export function chipDate(chip: ChipId, todayKey: string): string {
  const wd = mondayIndex(todayKey)
  if (chip === "in3") return addDays(todayKey, 3)
  if (chip === "in14") return addDays(todayKey, 14)
  if (chip === "monday") return addDays(todayKey, 7 - wd)
  if (wd === 5) return addDays(todayKey, 1)
  if (wd === 6) return addDays(todayKey, 6)
  return addDays(todayKey, 5 - wd)
}

/** Days ahead beyond which the date-distance line shows. */
export const FAR_DAYS = 14
export const isFar = (dateKey: string | null, nowMs: number) => dateKey !== null && daysAhead(dateKey, nowMs) > FAR_DAYS

export type BreakLen = "w1" | "w2" | "w4" | "set"
export const BREAK_DAYS: Record<Exclude<BreakLen, "set">, number> = { w1: 7, w2: 14, w4: 28 }

/** The day a break ends: start plus 7, 14 or 28 days, or the chosen date (must come after the start). */
export function breakEnd(startKey: string, len: BreakLen, setKey: string | null): string | null {
  if (len !== "set") return addDays(startKey, BREAK_DAYS[len])
  return setKey && /^\d{4}-\d{2}-\d{2}$/.test(setKey) && keyToMs(setKey) > keyToMs(startKey) ? setKey : null
}

/** Milliseconds from now to the end day (start of that day); 0 once reached. */
export const msToEnd = (endKey: string, nowMs: number) => Math.max(0, keyToMs(endKey) - nowMs)

/* ---------- ladder of near goals after the date ---------- */

export const LADDER = [
  { key: "d1", days: 1 },
  { key: "d3", days: 3 },
  { key: "w1", days: 7 },
  { key: "w2", days: 14 },
  { key: "m1", days: 30 },
] as const

export interface Rung {
  key: string
  days: number
  atMs: number
  reached: boolean
  next: boolean
}

/** Each goal reached once that many full days have passed since the date; exactly one is next. */
export function ladder(startKey: string, nowMs: number): Rung[] {
  const startMs = keyToMs(startKey)
  const rungs = LADDER.map((g) => ({ ...g, atMs: startMs + g.days * DAY, reached: nowMs >= startMs + g.days * DAY, next: false }))
  const i = rungs.findIndex((r) => !r.reached)
  if (i >= 0) rungs[i].next = true
  return rungs
}

/* ---------- runs: total clear days stay, past runs stay ---------- */

export interface Run {
  /** First clear day. */
  start: string
  /** Day of the slip that ended the run; null while the run goes on. */
  end: string | null
}

/** Clear days of a run: the days before the slip day, or up to and including today while it goes on. */
export function runDays(run: Run, todayKey: string): number {
  const from = keyToMs(run.start)
  if (run.end) return Math.max(0, Math.round((keyToMs(run.end) - from) / DAY))
  return Math.max(0, Math.round((keyToMs(todayKey) - from) / DAY) + 1)
}

/** A slip today: the current run ends today, a new run starts tomorrow. Nothing is erased. */
export function slipToday(runs: readonly Run[], todayKey: string): Run[] {
  const last = runs[runs.length - 1]
  if (!last || last.end !== null) return [...runs]
  return [...runs.slice(0, -1), { ...last, end: todayKey }, { start: addDays(todayKey, 1), end: null }]
}

export interface RunSummary {
  total: number
  best: number
  current: number
  /** Past runs, newest first, with their length. */
  past: { start: string; end: string; days: number }[]
}

export function summarize(runs: readonly Run[], todayKey: string): RunSummary {
  const lens = runs.map((r) => runDays(r, todayKey))
  const cur = runs.length > 0 && runs[runs.length - 1].end === null ? runs[runs.length - 1] : null
  return {
    total: lens.reduce((a, b) => a + b, 0),
    best: Math.max(0, ...lens),
    current: cur ? runDays(cur, todayKey) : 0,
    past: runs
      .filter((r): r is Run & { end: string } => r.end !== null)
      .map((r) => ({ start: r.start, end: r.end, days: runDays(r, todayKey) }))
      .reverse(),
  }
}

/** True once the first run has started (the date has come). */
export const dateCame = (startKey: string, nowMs: number) => daysAhead(startKey, nowMs) <= 0

/* ---------- countdown ---------- */

export function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000))
  return { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 }
}

/* ---------- calendar ---------- */

export { icsFor, googleCalendarUrl } from "../shared/logic"

/** Which evidence lines a given addiction sees: none for porn; smokers-only lines carry a tag for alcohol and weed. */
export type EvidenceMode = "plain" | "tagged" | "hidden"
export function evidenceMode(addiction: string): EvidenceMode {
  if (addiction === "nicotine") return "plain"
  if (addiction === "porn") return "hidden"
  return "tagged"
}
