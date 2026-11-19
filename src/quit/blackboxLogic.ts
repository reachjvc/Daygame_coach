import type { BlackBoxRecord, ViceEndingId } from "@/src/vice/types"
import { living, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import { VICES } from "@/src/vice/data/vices"
import type { QuitBelief, QuitEnding } from "./types"
import { localDate } from "./tools/common"

/** The Black Box ending of a thought: the belief's `blackBoxEnding`, else "other". */
export function endingForBelief(beliefId: string | null, beliefs: Pick<QuitBelief, "id" | "blackBoxEnding">[]): ViceEndingId {
  if (!beliefId) return "other"
  return beliefs.find((b) => b.id === beliefId)?.blackBoxEnding ?? "other"
}

/** The Black Box ending of an `endings` entry picked on the slip tool, else "other". */
export function endingForEnding(endingId: string | null, endings: Pick<QuitEnding, "id" | "blackBoxEnding">[]): ViceEndingId {
  if (!endingId) return "other"
  return endings.find((e) => e.id === endingId)?.blackBoxEnding ?? "other"
}

/** A local day moved by whole days. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number)
  return localDate(new Date(y, m - 1, d + delta))
}

export type SlipWhen = "today" | "yesterday" | "week"

/** The day of a slip: today, yesterday, or two days ago for "earlier this week". */
export function slipDay(when: SlipWhen, today: string): string {
  return when === "today" ? today : shiftDay(today, when === "yesterday" ? -1 : -2)
}

/** The later of two calendar days (a lapse may not predate what the run already holds). */
export function laterDay(a: string, b: string): string {
  return a >= b ? a : b
}

/** A report moment: today keeps the real time, any other day is filed at noon. */
export function reportAt(day: string, today: string, nowText: string): string {
  return day === today ? nowText : `${day}T12:00:00`
}

/** The thought text of a slip: the belief line, or the reader's own words (at most 80 characters). */
export function slipThought(short: string | null, own: string): string {
  const text = short ?? own.trim()
  return text.slice(0, 80)
}

/**
 * Starts a living run for `viceId` on `startedOn` (today or a past day; a
 * future day starts nothing). Returns the same record when a run already
 * lives or the Black Box refuses the days (they touch a run it holds).
 */
export function startRunOn(record: BlackBoxRecord, viceId: string, startedOn: string, today: string): BlackBoxRecord {
  if (startedOn > today) return record
  if (living(record.attempts).some((a) => a.viceId === viceId && a.endedOn === null)) return record
  const label = VICES.find((v) => v.id === viceId)?.label ?? viceId
  return startAttempt(record, { viceId, label, startedOn, startedBy: "", structure: [], acknowledgedRisk: false, today })
}
