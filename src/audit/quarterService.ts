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
import { toZonedDate } from "@/src/shared/dateUtils"
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

/** Minutes after local midnight at `ms`, in `tz`. */
export function localMinute(ms: number, tz: string): number {
  const local = toZonedDate(new Date(ms), tz)
  return local.getHours() * 60 + local.getMinutes()
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

export interface QuarterGroup {
  quarters: number[]
  /** Blank when Time knows nothing for these quarters. */
  text: string
  entryId: string | null
}

/**
 * Neighbouring quarters with the same pre-filled text are one card: "Gym,
 * 08:30–10:00". A blank merges with a blank; a gap in time always splits.
 */
export function groupQuarters(quarters: readonly number[], prefill: ReadonlyMap<number, Prefill>): QuarterGroup[] {
  const groups: QuarterGroup[] = []
  for (const q of [...quarters].sort((a, b) => a - b)) {
    const p = prefill.get(q)
    const text = p?.text ?? ""
    const last = groups[groups.length - 1]
    if (last && last.text === text && last.quarters[last.quarters.length - 1] + QUARTER_MS === q) {
      last.quarters.push(q)
      continue
    }
    groups.push({ quarters: [q], text, entryId: p?.entryId ?? null })
  }
  return groups
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "10:00" in the person's zone. */
export function clockLabel(ms: number, tz: string): string {
  const local = toZonedDate(new Date(ms), tz)
  return `${pad(local.getHours())}:${pad(local.getMinutes())}`
}

/** "10:00–10:15". */
export function quarterLabel(ms: number, tz: string): string {
  return `${clockLabel(ms, tz)}–${clockLabel(ms + QUARTER_MS, tz)}`
}

/** "10:00–11:30" for a stretch of quarters. */
export function stretchLabel(quarters: readonly number[], tz: string): string {
  if (quarters.length === 0) return ""
  const sorted = [...quarters].sort((a, b) => a - b)
  return `${clockLabel(sorted[0], tz)}–${clockLabel(sorted[sorted.length - 1] + QUARTER_MS, tz)}`
}
