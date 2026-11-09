/**
 * DAN MARTELL'S PERFECT WEEK, the step after the audit (Plans/perfect-week.md).
 *
 * A week planned ahead, one template, not dates: Monday to Sunday, blocks on
 * the quarter hour. Stored on the audit's review (`review.week`), so it needs
 * no table of its own. Blocks on the same day may touch but never overlap:
 * a calendar has no room for two things at once, which is Martell's point.
 */

import { hhmm } from "@/src/notifications/quietHours"
import { storableText } from "./requestGuard"
import type { WeekBlock, WeekKind } from "./types"

export type { WeekBlock, WeekKind } from "./types"

export const WEEK_KINDS: readonly WeekKind[] = ["deep", "workout", "people", "batch", "admin", "rest"]

/** Martell's own categories where he names them (big rocks: workouts, people, deep work; batching; admin in the low hours). Rest is from a book summary only. */
export const WEEK_KIND_NAMES: Record<WeekKind, string> = {
  deep: "Deep work",
  workout: "Workout or hobby",
  people: "People",
  batch: "Batched tasks",
  admin: "Admin and calls",
  rest: "Rest",
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export const WEEK_BLOCKS_MAX = 150
export const WEEK_WHAT_MAX = 80
/** Made on the phone (a UUID); letters, digits, - and _ only, so nothing the database refuses gets through. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const QUARTER = 15
const DAY_MINUTES = 24 * 60

const KEYS = new Set(["id", "day", "start", "end", "what", "kind"])

/** The week as it may be stored, sorted by day then start. Anything else is refused with a reason a person can read. */
export function checkWeek(input: unknown): { week: WeekBlock[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "A week is a list of blocks" }
  if (input.length > WEEK_BLOCKS_MAX) return { error: `A week can hold at most ${WEEK_BLOCKS_MAX} blocks` }
  const out: WeekBlock[] = []
  const ids = new Set<string>()
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "A block is an object" }
    const b = raw as Record<string, unknown>
    if (Object.keys(b).some((k) => !KEYS.has(k))) return { error: "A block holds id, day, start, end, what and kind only" }
    const { id, day, start, end, kind } = b
    if (typeof id !== "string" || !ID_PATTERN.test(id)) return { error: "Bad block id" }
    if (ids.has(id)) return { error: "Two blocks share an id" }
    ids.add(id)
    if (!Number.isInteger(day) || (day as number) < 0 || (day as number) > 6) return { error: "A day is 0 (Monday) to 6 (Sunday)" }
    if (!Number.isInteger(start) || !Number.isInteger(end) || (start as number) % QUARTER !== 0 || (end as number) % QUARTER !== 0) {
      return { error: "Blocks start and end on :00, :15, :30 or :45" }
    }
    if ((start as number) < 0 || (end as number) > DAY_MINUTES) return { error: "A block stays inside its day" }
    if ((end as number) <= (start as number)) return { error: "A block ends after it starts" }
    if (typeof kind !== "string" || !(WEEK_KINDS as readonly string[]).includes(kind)) return { error: "Unknown kind of block" }
    const what = typeof b.what === "string" ? storableText(b.what).trim() : ""
    if (!what) return { error: "Say what the block is for" }
    if (what.length > WEEK_WHAT_MAX) return { error: `A block's name can be at most ${WEEK_WHAT_MAX} characters` }
    out.push({ id, day: day as number, start: start as number, end: end as number, what, kind: kind as WeekKind })
  }
  out.sort((a, b) => a.day - b.day || a.start - b.start)
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]
    const cur = out[i]
    if (cur.day === prev.day && cur.start < prev.end) {
      return { error: `"${cur.what}" overlaps "${prev.what}" on ${DAY_NAMES[cur.day]}` }
    }
  }
  return { week: out }
}

/** Hours per kind across the whole week, two decimals at most. */
export function hoursByKind(week: readonly WeekBlock[]): Record<WeekKind, number> {
  const out = Object.fromEntries(WEEK_KINDS.map((k) => [k, 0])) as Record<WeekKind, number>
  for (const b of week) out[b.kind] += b.end - b.start
  for (const k of WEEK_KINDS) out[k] = Math.round((out[k] / 60) * 100) / 100
  return out
}

/**
 * Where a new block on this day goes by default: the first free quarter from
 * 09:00 on (then from midnight), an hour long or up to the next block,
 * whichever is shorter. Null when the day has no free quarter.
 */
export function freeSlot(week: readonly WeekBlock[], day: number): { start: number; end: number } | null {
  const blocks = week.filter((b) => b.day === day)
  const busy = (m: number) => blocks.some((b) => b.start <= m && m < b.end)
  const from = 9 * 60
  for (let i = 0; i < DAY_MINUTES / QUARTER; i++) {
    const start = (from + i * QUARTER) % DAY_MINUTES
    if (busy(start)) continue
    const next = blocks.filter((b) => b.start > start).reduce((m, b) => Math.min(m, b.start), DAY_MINUTES)
    return { start, end: Math.min(start + 60, next) }
  }
  return null
}

const clock = (hour: number) => hhmm(hour * 60)

/**
 * Martell's steps 1-7, as Plans/perfect-week.md (Phase 0) words them from his
 * own videos. Steps 8-11 are not built (summary only, or later).
 */
export const MARTELL_STEPS: readonly { title: string; text: string }[] = [
  { title: "Big rocks first", text: "Workouts, people, deep work and thinking blocks go in before anything else." },
  { title: "Plan around your energy", text: "Hardest work in your best hours; admin and calls in the low ones." },
  { title: "Batch the same kind of work", text: "Group the same kind of work into blocks of two to three hours." },
  { title: "Cut bleed time", text: "Plan meetings and calls 15 minutes shorter than you think they need." },
  { title: "Block the hobbies", text: "Hobbies and workouts get fixed blocks; never miss a workout two days in a row." },
  { title: "No extra time", text: "Pair two things in one slot: calls while walking, an audiobook at the gym." },
  { title: "Say no often", text: "The planned week shows what to refuse: what has no room in it gets a no." },
]

/**
 * The kind for a block of this name (case and spaces ignored): that of a block
 * with the same name already in the week, else the kind the name spells out
 * ("Deep work", "Rest": alpha prove-eye-05); null otherwise, so the kind is
 * picked, never guessed.
 */
export function kindFor(week: readonly WeekBlock[], what: string): WeekKind | null {
  const name = what.trim().toLowerCase()
  if (!name) return null
  const same = week.find((b) => b.what.trim().toLowerCase() === name)?.kind
  if (same) return same
  return WEEK_KINDS.find((k) => WEEK_KIND_NAMES[k].toLowerCase() === name) ?? null
}

/** A new From moves To with it, keeping the block's length, up to midnight. */
export function shiftedEnd(start: number, end: number, newStart: number): number {
  return Math.min(DAY_MINUTES, newStart + (end - start))
}

/**
 * The block on each chosen day: the block itself stays on its own day if that
 * day is still chosen (else it moves to the first chosen day), and every other
 * day gets a copy with a new id.
 */
export function spreadBlock(block: WeekBlock, days: readonly number[], newId: () => string): WeekBlock[] {
  const chosen = [...new Set(days)].sort((a, b) => a - b)
  if (chosen.length === 0) return []
  const home = chosen.includes(block.day) ? block.day : chosen[0]
  return [{ ...block, day: home }, ...chosen.filter((d) => d !== home).map((day) => ({ ...block, id: newId(), day }))]
}

function hoursList(hours: readonly number[]): string | null {
  if (hours.length === 0) return null
  const names = hours.map(clock)
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

type HourEnergy = { hour: number; energy: number; answers: number }
type WorkHour = HourEnergy & { growth: number; days: number }

/** An hour counts for the hardest work only when answered on at least this many work days: half of the audit's ten. */
export const WORK_DAYS_MIN = 5

/** The rule, in one plain line, as the page shows it under the hours. */
export const BEST_HOURS_RULE = `Best hours are Monday-to-Friday hours where, over at least ${WORK_DAYS_MIN} work days, your energy and your growth both averaged above 4; highest on both first. Low hours are when your energy was lowest, under 4.`

/**
 * Martell's step 2 from the audit: hardest work in your best hours, admin and
 * calls in the low ones. Best: up to three work-day hours (`workHours`, Monday
 * to Friday) where you were both high on energy and doing growth work, both
 * averaging above the neutral 4, seen on at least WORK_DAYS_MIN work days;
 * ranked by energy plus growth, then growth, then the earlier hour. None
 * qualifying is said plainly, never filled with lesser hours (alpha
 * prove-review-02). Low: the three hours with the least energy over all
 * answers, under the neutral 4, apart from the best.
 */
export function planHours(workHours: readonly WorkHour[], allHours: readonly HourEnergy[]): { best: string | null; low: string | null } {
  const best = workHours
    .filter((h) => h.energy > 4 && h.growth > 4 && h.days >= WORK_DAYS_MIN)
    .sort((a, b) => b.energy + b.growth - (a.energy + a.growth) || b.growth - a.growth || a.hour - b.hour)
    .slice(0, 3)
    .map((h) => h.hour)
  const low = [...allHours]
    .filter((h) => h.energy < 4 && !best.includes(h.hour))
    .sort((a, b) => a.energy - b.energy || a.hour - b.hour)
    .slice(0, 3)
    .map((h) => h.hour)
  return { best: hoursList(best), low: hoursList(low) }
}

/** The audit's three most energetic hours, best first, as text ("09:00, 10:00 and 08:00"); null with no hours to go on. */
export function bestHoursText(hours: readonly { hour: number; energy: number; answers: number }[]): string | null {
  return hoursList([...hours].sort((a, b) => b.energy - a.energy || a.hour - b.hour).slice(0, 3).map((h) => h.hour))
}
