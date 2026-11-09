/**
 * QUARTERS: the fixed 15 minutes of the clock the audit asks about
 * (:00, :15, :30, :45; Plans/energy-audit.md, D-QUARTERS and D-RUN-QUARTERS).
 *
 * Pure: no clock, no network. Every function takes the time it needs.
 *
 * A quarter is named by its START, as epoch milliseconds. Every zone in use
 * today is offset from UTC by a whole number of quarters (Kathmandu is +5:45),
 * so a local quarter always starts on a UTC multiple of 15 minutes, and
 * `quarterStart` needs no zone.
 */

import { inQuietHours } from "@/src/notifications/quietHours"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import type { AuditRun, TimeEntryForAudit } from "./types"

export const QUARTER_MS = 900_000

/** The start of the quarter that holds `ms`. */
export function quarterStart(ms: number): number {
  return Math.floor(ms / QUARTER_MS) * QUARTER_MS
}

/** Every quarter start from the quarter holding `fromMs` up to, not including, `toMs`. */
export function quartersBetween(fromMs: number, toMs: number): number[] {
  const out: number[] = []
  for (let q = quarterStart(fromMs); q < toMs; q += QUARTER_MS) out.push(q)
  return out
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The wall-clock hour and minute at `ms` in `tz`, read straight from Intl.
 *
 * Not through `toZonedDate`: that builds a Date in the DEVICE's zone, and a
 * wall time inside the device's spring-forward gap moves an hour, so a phone
 * set to Copenhagen showed a UTC account's 02:30 as 03:30 on 29 March and
 * counted a quiet quarter as awake (clock audit, 2026-11-09).
 */
function wallClock(ms: number, tz: string): { hour: number; minute: number } {
  let f = formatters.get(tz)
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    } catch {
      f = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    }
    formatters.set(tz, f)
  }
  const parts = f.formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { hour: get("hour") % 24, minute: get("minute") }
}

/** Minutes after local midnight at `ms`, in `tz`. */
export function localMinute(ms: number, tz: string): number {
  const { hour, minute } = wallClock(ms, tz)
  return hour * 60 + minute
}

/** A quarter is awake when its START is outside the run's quiet hours (D-QUIET). */
export function isAwake(slotMs: number, run: Pick<AuditRun, "quietStart" | "quietEnd">, tz: string): boolean {
  if (run.quietStart === run.quietEnd) return true
  return !inQuietHours(localMinute(slotMs, tz), run.quietStart, run.quietEnd)
}

/** Where the run stops: "End now", else its 14 days. */
export function runStopMs(run: Pick<AuditRun, "endedAt" | "endsAt">): number {
  return Date.parse(run.endedAt ?? run.endsAt)
}

/** Does this quarter belong to the run (D-RUN-QUARTERS)? Awake or not. */
export function belongsToRun(slotMs: number, run: Pick<AuditRun, "startedAt" | "endedAt" | "endsAt">): boolean {
  return slotMs + QUARTER_MS > Date.parse(run.startedAt) && slotMs < runStopMs(run)
}

/**
 * The run's awake quarters that have ENDED by `nowMs`, oldest first. These
 * are the quarters the audit asks about: the sheet, the "Answer now" count,
 * the Day list and the review all count from here. The quarter still running
 * is left out, because nobody can say yet how it went.
 */
export function runQuarters(run: AuditRun, nowMs: number, tz: string): number[] {
  const last = Math.min(nowMs, runStopMs(run) + QUARTER_MS)
  return quartersBetween(Date.parse(run.startedAt), last)
    .filter((q) => q + QUARTER_MS <= nowMs && belongsToRun(q, run) && isAwake(q, run, tz))
}

/**
 * The quarters to show: the awake ones, plus every answered one. An answer
 * given before quiet hours were changed to cover it stays visible and
 * counted, instead of silently vanishing (code review, 2026-11-09).
 */
export function withAnswered(quarters: readonly number[], answered: Iterable<number>): number[] {
  return [...new Set([...quarters, ...answered])].sort((a, b) => a - b)
}

/** How far back "Answer now" reaches (D-RANGE). */
export const SHEET_WINDOW_MS = 3 * 60 * 60_000

/**
 * The quarters "Answer now" offers: the awake, unanswered quarters of the run
 * that ended in the last 3 hours, plus `asked` (the quarter a ping named) when
 * it belongs to the run, has started and is unanswered, however old it is, so a
 * ping tapped late still answers its own quarter.
 */
export function answerSheetQuarters(run: AuditRun, nowMs: number, tz: string, answered: ReadonlySet<number>, asked?: number | null): number[] {
  const recent = runQuarters(run, nowMs, tz).filter((q) => q + QUARTER_MS > nowMs - SHEET_WINDOW_MS && !answered.has(q))
  if (asked != null && Number.isFinite(asked) && asked % QUARTER_MS === 0 && belongsToRun(asked, run) && asked <= quarterStart(nowMs) && !answered.has(asked)) {
    return withAnswered(recent, [asked])
  }
  return recent
}

const DAY_MS = 24 * 60 * 60_000

/** Whole days from one "YYYY-MM-DD" to another. */
function daysFrom(a: string, b: string): number {
  const utc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(b) - utc(a)) / DAY_MS)
}

/**
 * "Day 2 of 15": calendar days in the person's zone, the start day being
 * Day 1 (alpha fast-audit-10: started at 21:00, the next morning said Day 1).
 * `of` counts every calendar day the run touches, so the last day is the one
 * it ends on: 14 when started at midnight, else 15 (the evening of day 1 and
 * the hours of day 15 together make the fourteen 24-hour days).
 */
export function runDayOf(run: Pick<AuditRun, "startedAt" | "endsAt" | "endedAt">, nowMs: number, tz: string): { day: number; of: number } {
  const first = getTodayInTimezone(tz, new Date(Date.parse(run.startedAt)))
  const last = getTodayInTimezone(tz, new Date(Date.parse(run.endsAt) - 1))
  const today = getTodayInTimezone(tz, new Date(Math.min(nowMs, runStopMs(run) - 1)))
  const of = daysFrom(first, last) + 1
  return { day: Math.min(of, Math.max(1, daysFrom(first, today) + 1)), of }
}

/**
 * When the next ping goes out (alpha picky-eye-12): the end of the next
 * awake quarter of the run, once any mute is over; null when none is left.
 * The same rules as `audit_pings_due`. `ignoreMute`: when the next quarter to
 * answer ends, for a person whose devices get no pings anyway.
 */
export function nextPingAt(run: AuditRun, nowMs: number, tz: string, opts: { ignoreMute?: boolean } = {}): number | null {
  const stop = runStopMs(run)
  const started = Date.parse(run.startedAt)
  const mutedUntil = !opts.ignoreMute && run.mutedUntil ? Date.parse(run.mutedUntil) : null
  for (let t = quarterStart(nowMs) + QUARTER_MS; t < stop && t < nowMs + 3 * DAY_MS; t += QUARTER_MS) {
    const q = t - QUARTER_MS
    if (q + QUARTER_MS <= started || !isAwake(q, run, tz)) continue
    if (mutedUntil !== null && mutedUntil > t) continue
    return t
  }
  return null
}

export interface Prefill {
  text: string
  entryId: string
}

/** What an entry is called: its description, else its project's name. Blank when neither. */
export function entryText(entry: TimeEntryForAudit): string {
  const description = entry.description.trim()
  if (description) return description
  return entry.projectName?.trim() ?? ""
}

const HALF_QUARTER_MS = QUARTER_MS / 2

/**
 * What Time says each quarter was (D-PREFILL). The entry covering most of the
 * quarter wins if it covers at least half of it (7.5 of 15 minutes); a tie goes
 * to the later start. A running entry counts up to `nowMs`; an entry that
 * starts after `nowMs` (planned ahead) never counts. Quarters without one are
 * left out of the map.
 */
export function prefillQuarters(quarters: readonly number[], entries: readonly TimeEntryForAudit[], nowMs: number): Map<number, Prefill> {
  const usable = entries
    .map((e) => ({ e, text: entryText(e), start: Date.parse(e.startedAt), stop: e.stoppedAt ? Date.parse(e.stoppedAt) : nowMs }))
    .filter((x) => x.text && x.start <= nowMs && Number.isFinite(x.start) && Number.isFinite(x.stop))
  const out = new Map<number, Prefill>()
  for (const q of quarters) {
    let best: { overlap: number; start: number; text: string; id: string } | null = null
    for (const x of usable) {
      const overlap = Math.min(q + QUARTER_MS, x.stop, nowMs) - Math.max(q, x.start)
      if (overlap < HALF_QUARTER_MS) continue
      if (!best || overlap > best.overlap || (overlap === best.overlap && x.start > best.start)) {
        best = { overlap, start: x.start, text: x.text, id: x.e.id }
      }
    }
    if (best) out.set(q, { text: best.text, entryId: best.id })
  }
  return out
}

/**
 * THE ORDER OF THE ANSWER SHEET'S CARDS: newest first, and the quarter a ping
 * asked about before all others, so a tapped ping opens on its own quarter
 * (alpha test picky-eye-02). One card per quarter: Martell logs every 15
 * minutes, and covering a stretch with one answer is the person's own choice
 * (`stretchBefore`), never the default (fast-audit-07, picky-eye-03).
 */
export function sheetOrder(quarters: readonly number[], asked: number | null): number[] {
  const newestFirst = [...new Set(quarters)].sort((a, b) => b - a)
  if (asked == null || !newestFirst.includes(asked)) return newestFirst
  return [asked, ...newestFirst.filter((q) => q !== asked)]
}

/**
 * What "Same answer for the N quarters before" covers: the quarters right
 * before `q`, oldest first, each still open (`open` says so) and pre-filled
 * from the same Time entry as `q`, or, like `q`, from none. A quarter that is
 * not open, or a different entry, ends the stretch.
 */
export function stretchBefore(q: number, open: (quarter: number) => boolean, entryOf: (quarter: number) => string | null): number[] {
  const out: number[] = []
  const entry = entryOf(q)
  for (let p = q - QUARTER_MS; open(p) && entryOf(p) === entry; p -= QUARTER_MS) out.unshift(p)
  return out
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "10:00" in the person's zone. */
export function clockLabel(ms: number, tz: string): string {
  const { hour, minute } = wallClock(ms, tz)
  return `${pad(hour)}:${pad(minute)}`
}

/** "10:00–10:15". */
export function quarterLabel(ms: number, tz: string): string {
  return `${clockLabel(ms, tz)}–${clockLabel(ms + QUARTER_MS, tz)}`
}

/**
 * "10:00–11:30" for a stretch of quarters; "05:45–06:00, 06:15–06:30" when an
 * answered quarter splits it; an end at midnight reads "24:00", so a whole day
 * is "00:00–24:00", never "00:00–00:00".
 */
export function stretchLabel(quarters: readonly number[], tz: string): string {
  if (quarters.length === 0) return ""
  const sorted = [...new Set(quarters)].sort((a, b) => a - b)
  const runs: [number, number][] = []
  for (const q of sorted) {
    const last = runs[runs.length - 1]
    if (last && last[1] === q) last[1] = q + QUARTER_MS
    else runs.push([q, q + QUARTER_MS])
  }
  const end = (ms: number) => {
    const label = clockLabel(ms, tz)
    return label === "00:00" ? "24:00" : label
  }
  return runs.map(([a, b]) => `${clockLabel(a, tz)}–${end(b)}`).join(", ")
}
