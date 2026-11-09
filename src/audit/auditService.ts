/**
 * THE AUDIT'S RULES (Plans/energy-audit.md): what an answer may be, what a
 * review may hold, whether a run is open, and when a mute ends.
 *
 * Pure: no clock, no network. The routes call these before the repo, so a
 * refusal names what was wrong in words a person can read, and never echoes
 * what they typed.
 */

import { isUuid } from "@/src/shared/ids"
import { getTodayInTimezone, localTimeInstant } from "@/src/shared/dateUtils"
import { belongsToRun, isAwake, localMinute, QUARTER_MS, quarterStart } from "./quarterService"
import { ANSWER_SOURCES, REVIEW_CHOICES, type AuditAnswer, type AuditRun, type Review, type ReviewChoice, type ScaleValue } from "./types"

export const ACTIVITY_MAX = 200
export const WHY_MAX = 2000
export const REVIEW_KEYS_MAX = 300
export const REVIEW_NOTE_MAX = 2000

const isScale = (v: unknown): v is ScaleValue => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7

/** The run is open: not ended, and its 14 days not over. */
export function runIsOpen(run: Pick<AuditRun, "endedAt" | "endsAt">, now: Date): boolean {
  return run.endedAt === null && now.getTime() < Date.parse(run.endsAt)
}

/**
 * One answer, checked against its run (D-REQUIRED, D-RUN-QUARTERS). Returns
 * the answer to store, trimmed, or the reason it is refused.
 */
export function checkAnswer(input: unknown, run: AuditRun, now: Date): { answer: AuditAnswer } | { error: string } {
  const a = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  if (!isUuid(a.id)) return { error: "Each answer needs an id" }
  if (a.runId !== run.id) return { error: "That answer is for another audit" }
  const activity = typeof a.activity === "string" ? a.activity.trim() : ""
  if (activity.length < 1) return { error: "Say what you did" }
  if (activity.length > ACTIVITY_MAX) return { error: `What you did can be at most ${ACTIVITY_MAX} characters` }
  if (!isScale(a.energy)) return { error: "Energy is a number from 1 to 7" }
  if (!isScale(a.growth)) return { error: "Growth is a number from 1 to 7" }
  if (typeof a.avoiding !== "boolean") return { error: "Avoiding is yes or no" }
  let why: string | null = null
  if (a.why !== null && a.why !== undefined) {
    if (typeof a.why !== "string") return { error: "Why is text" }
    why = a.why.trim() || null
    if (why && why.length > WHY_MAX) return { error: `Why can be at most ${WHY_MAX} characters` }
  }
  const source = a.source ?? "app"
  if (typeof source !== "string" || !(ANSWER_SOURCES as readonly string[]).includes(source)) return { error: "Unknown source" }
  let timeEntryId: string | null = null
  if (a.timeEntryId !== null && a.timeEntryId !== undefined) {
    if (typeof a.timeEntryId !== "string" || a.timeEntryId.length > 200) return { error: "Bad time entry" }
    timeEntryId = a.timeEntryId
  }
  const slotMs = typeof a.slotAt === "string" ? Date.parse(a.slotAt) : NaN
  if (!Number.isFinite(slotMs) || slotMs % QUARTER_MS !== 0) return { error: "A quarter starts at :00, :15, :30 or :45" }
  if (!belongsToRun(slotMs, run)) return { error: "That quarter is outside this audit" }
  if (slotMs > quarterStart(now.getTime())) return { error: "That quarter has not started yet" }
  return {
    answer: {
      id: a.id,
      runId: run.id,
      slotAt: new Date(slotMs).toISOString(),
      activity,
      energy: a.energy,
      growth: a.growth,
      avoiding: a.avoiding,
      why,
      source: source as AuditAnswer["source"],
      timeEntryId,
    },
  }
}

/** The review's choices and notes (D-CHOICES). Anything else is refused. */
export function checkReview(input: unknown): { review: Review } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "A review is an object" }
  const r = input as Record<string, unknown>
  const extra = Object.keys(r).filter((k) => k !== "choices" && k !== "notes")
  if (extra.length > 0) return { error: "A review holds choices and notes only" }
  const choices: Record<string, ReviewChoice> = {}
  const notes: Record<string, string> = {}
  const rawChoices = r.choices ?? {}
  const rawNotes = r.notes ?? {}
  if (typeof rawChoices !== "object" || rawChoices === null || Array.isArray(rawChoices)) return { error: "Choices are an object" }
  if (typeof rawNotes !== "object" || rawNotes === null || Array.isArray(rawNotes)) return { error: "Notes are an object" }
  const choiceEntries = Object.entries(rawChoices as Record<string, unknown>)
  const noteEntries = Object.entries(rawNotes as Record<string, unknown>)
  if (choiceEntries.length > REVIEW_KEYS_MAX || noteEntries.length > REVIEW_KEYS_MAX) return { error: "Too many activities" }
  for (const [key, value] of choiceEntries) {
    if (key.length < 1 || key.length > ACTIVITY_MAX) return { error: "Bad activity key" }
    if (typeof value !== "string" || !(REVIEW_CHOICES as readonly string[]).includes(value)) return { error: "Unknown choice" }
    choices[key] = value as ReviewChoice
  }
  for (const [key, value] of noteEntries) {
    if (key.length < 1 || key.length > ACTIVITY_MAX) return { error: "Bad activity key" }
    if (typeof value !== "string" || value.length > REVIEW_NOTE_MAX) return { error: `A note can be at most ${REVIEW_NOTE_MAX} characters` }
    if (value.trim()) notes[key] = value
  }
  return { review: { choices, notes } }
}

export type MuteOption = "30m" | "1h" | "2h" | "morning" | "off"
export const MUTE_OPTIONS: readonly MuteOption[] = ["30m", "1h", "2h", "morning", "off"]

const MORNING_FALLBACK = 8 * 60

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

function nextDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/**
 * When a mute ends (D-MUTE). "morning" is the end of the quiet hours: the end
 * of the ones running now, else of the next ones (tonight's, ending tomorrow).
 * With no quiet hours, 08:00. Null means unmuted.
 */
export function muteUntil(option: MuteOption, run: Pick<AuditRun, "quietStart" | "quietEnd">, now: Date, tz: string): Date | null {
  const ms = now.getTime()
  switch (option) {
    case "off":
      return null
    case "30m":
      return new Date(ms + 30 * 60_000)
    case "1h":
      return new Date(ms + 60 * 60_000)
    case "2h":
      return new Date(ms + 120 * 60_000)
    case "morning": {
      const end = run.quietStart === run.quietEnd ? MORNING_FALLBACK : run.quietEnd
      const today = getTodayInTimezone(tz, now)
      // The first local `end` that is after now: today's, else tomorrow's. When
      // the quiet hours have not begun yet today and they run past midnight,
      // tomorrow's is the next one anyway, because today's is already behind.
      for (const day of [today, nextDateKey(today), nextDateKey(nextDateKey(today))]) {
        const at = new Date(localTimeInstant(day, hhmm(end), tz))
        if (at.getTime() > ms) return at
      }
      return new Date(ms + 24 * 60 * 60_000)
    }
  }
}

/** Quiet hours sent from the settings sheet: minutes 0–1439, on a quarter. */
export function checkQuiet(start: unknown, end: unknown): { quietStart: number; quietEnd: number } | { error: string } {
  const ok = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1439 && v % 15 === 0
  if (!ok(start) || !ok(end)) return { error: "Quiet hours are times on the quarter hour" }
  return { quietStart: start, quietEnd: end }
}

export { isAwake, localMinute }
