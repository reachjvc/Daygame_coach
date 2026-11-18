import { DAY, HOUR, dayKey } from "../shared/calc"

export interface Stretch {
  startMs: number
  /** null while it runs. */
  endMs: number | null
  /** What he wrote when he reset. */
  note: string
}

export interface CHabit {
  id: string
  name: string
  perDay: number
  stretches: Stretch[]
}

export interface Entry {
  rating: number
  mood: string
  text: string
  photo: string | null
}

export interface Goal {
  name: string
  hours: number
}

/** Standard goals, in hours; the names live in the text file in the same order. */
export const STANDARD_HOURS = [5, 24, 72, 120, 168, 240, 336, 480, 720, 1440, 2160, 4320, 8760] as const

const round2 = (n: number) => Math.round(n * 100) / 100

export const stretchMs = (s: Stretch, now: number) => Math.max(0, (s.endMs ?? now) - s.startMs)
export const current = (h: CHabit): Stretch => h.stretches[h.stretches.length - 1]
export const finished = (h: CHabit): Stretch[] => h.stretches.filter((s) => s.endMs !== null)

/** Clean days across every stretch, running one included. */
export function totalDays(h: CHabit, now: number): number {
  return h.stretches.reduce((sum, s) => sum + stretchMs(s, now), 0) / DAY
}

/** Savings: per-day amount times the clean time of all stretches, so a reset never erases the money. */
export const habitSavings = (h: CHabit, now: number) => round2(h.perDay * totalDays(h, now))

export const stretchCount = (hs: CHabit[]) => hs.reduce((n, h) => n + h.stretches.length, 0)
export const allSavings = (hs: CHabit[], now: number) => round2(hs.reduce((n, h) => n + habitSavings(h, now), 0))

/** Pie slices as fractions of the whole with a running start. */
export function pieSlices(values: number[]): { frac: number; start: number }[] {
  const sum = values.reduce((a, b) => a + b, 0)
  let acc = 0
  return values.map((v) => {
    const frac = sum > 0 ? v / sum : 0
    const out = { frac, start: acc }
    acc += frac
    return out
  })
}

/** All goals of a habit: standard first by hours, personal merged in order. */
export function sortedGoals(standard: { name: string; hours: number }[], personal: Goal[]) {
  return [...standard, ...personal].sort((a, b) => a.hours - b.hours)
}

/** The next goal above the running time (or null). */
export function nextGoal(goals: Goal[], runningHours: number): Goal | null {
  return goals.find((g) => g.hours > runningHours) ?? null
}

/** Progress shown on a goal row: min(running, goal) in days with one decimal. */
export const goalProgress = (goalHours: number, runningHours: number) => `${(Math.min(goalHours, runningHours) / 24).toFixed(1)}/${(goalHours / 24).toFixed(1)}`

/** `19.0d`. */
export const lengthLabel = (s: Stretch, now: number) => `${(stretchMs(s, now) / DAY).toFixed(1)}d`

/** Calendar tags: milestone names on the days they were reached, reset marks on reset days. */
export function dayTags(h: CHabit, goals: Goal[], now: number, resetLabel: (n: number) => string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (k: string, t: string) => {
    out[k] = [...(out[k] ?? []), t]
  }
  let resets = 0
  for (const s of h.stretches) {
    const end = s.endMs ?? now
    for (const g of goals) {
      const at = s.startMs + g.hours * HOUR
      if (at <= end) add(dayKey(at), g.name)
    }
    if (s.endMs !== null) {
      resets += 1
      add(dayKey(s.endMs), resetLabel(resets))
    }
  }
  return out
}

/** The example habits: alcohol with four resets, smoking with one, pills with none. */
export function seedHabits(now: number, startMs: number, perDay: number, names: [string, string, string], notes: string[]): CHabit[] {
  const lens = [19, 27, 42, 7]
  const finishedList: Stretch[] = []
  let cursor = startMs
  lens.forEach((len, i) => {
    const end = cursor
    const start = end - len * DAY
    finishedList.unshift({ startMs: start, endMs: end, note: notes[i % notes.length] })
    cursor = start - DAY
  })
  return [
    { id: "alc", name: names[0], perDay, stretches: [...finishedList, { startMs, endMs: null, note: "" }] },
    { id: "smk", name: names[1], perDay: round2(perDay * 0.75), stretches: [{ startMs: now - 50 * DAY, endMs: now - 36 * DAY, note: notes[0] }, { startMs: now - 35 * DAY, endMs: null, note: "" }] },
    { id: "pil", name: names[2], perDay, stretches: [{ startMs: now - 28 * DAY, endMs: null, note: "" }] },
  ]
}

/** The example journal days of the first habit. */
export function seedJournal(startMs: number, texts: string[], moods: string[]): Record<string, Entry> {
  const k = (n: number) => dayKey(startMs + n * DAY)
  return {
    [k(2)]: { rating: 4, mood: moods[0], text: texts[0], photo: null },
    [k(6)]: { rating: 2, mood: moods[1], text: texts[1], photo: null },
    [k(11)]: { rating: 5, mood: moods[0], text: texts[0], photo: null },
  }
}

