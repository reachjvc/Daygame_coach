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

/** The audit's three most energetic hours, best first, as text ("09:00, 10:00 and 08:00"); null with no hours to go on. */
export function bestHoursText(hours: readonly { hour: number; energy: number; answers: number }[]): string | null {
  const top = [...hours].sort((a, b) => b.energy - a.energy || a.hour - b.hour).slice(0, 3)
  if (top.length === 0) return null
  const names = top.map((h) => clock(h.hour))
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}
