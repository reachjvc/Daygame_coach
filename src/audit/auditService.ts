/**
 * THE AUDIT'S RULES (Plans/energy-audit.md): what an answer may be, what a
 * review may hold, whether a run is open, and when a mute ends.
 *
 * Pure: no clock, no network. The routes call these before the repo, so a
 * refusal names what was wrong in words a person can read, and never echoes
 * what they typed.
 */

import { isUuid } from "@/src/shared/ids"
import { storableText } from "./requestGuard"
import { getTodayInTimezone, localTimeInstant } from "@/src/shared/dateUtils"
import { hhmm, nextDateKey } from "@/src/notifications/quietHours"
import { normalizePhrase } from "@/src/shared/textMatch"
import { belongsToRun, isAwake, localMinute, QUARTER_MS, quarterStart, runQuarters, runStopMs, withAnswered } from "./quarterService"
import { ANSWER_SOURCES, REVIEW_CHOICES, type AuditAnswer, type AuditRun, type AuditSlot, type Review, type ReviewChoice, type ScaleValue } from "./types"

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
  const activity = typeof a.activity === "string" ? storableText(a.activity).trim() : ""
  if (activity.length < 1) return { error: "Say what you did" }
  if (activity.length > ACTIVITY_MAX) return { error: `What you did can be at most ${ACTIVITY_MAX} characters` }
  if (!isScale(a.energy)) return { error: "Energy is a number from 1 to 7" }
  if (!isScale(a.growth)) return { error: "Growth is a number from 1 to 7" }
  if (typeof a.avoiding !== "boolean") return { error: "Avoiding is yes or no" }
  let why: string | null = null
  if (a.why !== null && a.why !== undefined) {
    if (typeof a.why !== "string") return { error: "Why is text" }
    why = storableText(a.why).trim() || null
    if (why && why.length > WHY_MAX) return { error: `Why can be at most ${WHY_MAX} characters` }
  }
  const source = a.source ?? "app"
  if (typeof source !== "string" || !(ANSWER_SOURCES as readonly string[]).includes(source)) return { error: "Unknown source" }
  let timeEntryId: string | null = null
  if (a.timeEntryId !== null && a.timeEntryId !== undefined) {
    if (typeof a.timeEntryId !== "string" || a.timeEntryId.length > 200) return { error: "Bad time entry" }
    timeEntryId = a.timeEntryId
  }
  const quarter = checkQuarter(a.slotAt, run, now)
  if ("error" in quarter) return quarter
  const slotMs = quarter.slotMs
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

export const NOT_STARTED = "That quarter has not started yet"
export const CHANGED_SINCE = "Changed on another device since"

const MAX_CLOCK_CORRECTION_MS = 24 * 60 * 60_000
/**
 * Below this, the gap between the phone's "sent" and the server's "now" is the
 * network, not the phone's clock, and is left alone: counting a slow request's
 * seconds as clock error stamped the first save later than a quick edit after
 * it, and the edit was refused as older (found by the e2e test, 2026-11-09).
 */
const MIN_CLOCK_CORRECTION_MS = 2 * 60_000

/**
 * A time by the phone's clock, put on the server's: `at + (now - sentAt)`, where
 * `sentAt` is when the phone sent the request by the same clock (as Time's Stop
 * does). Never after now; now when `at` is missing or unreadable.
 */
export function correctedTime(at: unknown, sentAt: unknown, now: Date): number {
  const nowMs = now.getTime()
  const atMs = typeof at === "string" ? Date.parse(at) : NaN
  if (!Number.isFinite(atMs)) return nowMs
  const sentMs = typeof sentAt === "string" ? Date.parse(sentAt) : NaN
  const gap = Number.isFinite(sentMs) ? nowMs - sentMs : 0
  const offset = Math.abs(gap) >= MIN_CLOCK_CORRECTION_MS && Math.abs(gap) <= MAX_CLOCK_CORRECTION_MS ? gap : 0
  return Math.min(nowMs, atMs + offset)
}

/**
 * The quarter rules alone (D-RUN-QUARTERS): on :00/:15/:30/:45, inside the
 * run, and already started. Used by `checkAnswer` and by the ping route.
 */
export function checkQuarter(slotAt: unknown, run: AuditRun, now: Date): { slotMs: number } | { error: string } {
  const slotMs = typeof slotAt === "string" ? Date.parse(slotAt) : NaN
  if (!Number.isFinite(slotMs) || slotMs % QUARTER_MS !== 0) return { error: "A quarter starts at :00, :15, :30 or :45" }
  if (!belongsToRun(slotMs, run)) return { error: "That quarter is outside this audit" }
  if (slotMs > quarterStart(now.getTime())) return { error: NOT_STARTED }
  return { slotMs }
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
    choices[storableText(key) || key] = value as ReviewChoice
  }
  for (const [key, value] of noteEntries) {
    if (key.length < 1 || key.length > ACTIVITY_MAX) return { error: "Bad activity key" }
    if (typeof value !== "string" || value.length > REVIEW_NOTE_MAX) return { error: `A note can be at most ${REVIEW_NOTE_MAX} characters` }
    const clean = storableText(value)
    if (clean.trim()) notes[storableText(key) || key] = clean
  }
  return { review: { choices, notes } }
}

export type MuteOption = "30m" | "1h" | "2h" | "morning" | "off"
export const MUTE_OPTIONS: readonly MuteOption[] = ["30m", "1h", "2h", "morning", "off"]

const MORNING_FALLBACK = 8 * 60


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

// ---------------------------------------------------------------------------
// The review (Plans/energy-audit.md, Phase 6)
// ---------------------------------------------------------------------------

/** Martell's four boxes, growth in place of money (D-BOXES). The names are ours. */
export type Box = "more" | "costs" | "cut" | "fun"
export const BOXES: readonly Box[] = ["more", "costs", "cut", "fun"]
export const BOX_NAMES: Record<Box, string> = {
  more: "Do more",
  costs: "Worth it, but it costs me",
  cut: "Cut",
  fun: "Fun that builds nothing",
}

/** Above 4 is high; exactly 4 counts as low. */
export function boxOf(energy: number, growth: number): Box {
  const e = energy > 4
  const g = growth > 4
  return e && g ? "more" : g ? "costs" : e ? "fun" : "cut"
}

export interface ReviewGroup {
  /** `normalizePhrase` of the activity: the key choices and notes are stored under. */
  key: string
  /** The most used spelling. */
  label: string
  answers: number
  minutes: number
  /** Averages, one decimal. */
  energy: number
  growth: number
  avoidingMinutes: number
  box: Box
  /** Newest first. */
  whys: { text: string; slotAt: string }[]
}

export interface BuiltReview {
  possibleQuarters: number
  possibleHours: number
  answered: number
  hours: number
  groups: ReviewGroup[]
  /** Whole percent of the answered time in each box, summing to 100 (all 0 with no answers). */
  shares: Record<Box, number>
  /** Average energy per local hour, only hours with at least 4 answers. */
  bestHours: { hour: number; energy: number; answers: number }[]
}

const oneDecimal = (n: number) => Math.round(n * 10) / 10
const BEST_HOURS_MIN = 4

/** Whole percents that sum to 100: floors, then the largest remainders get +1 (ties in box order). */
function wholeShares(minutes: Record<Box, number>): Record<Box, number> {
  const total = BOXES.reduce((s, b) => s + minutes[b], 0)
  const out: Record<Box, number> = { more: 0, costs: 0, cut: 0, fun: 0 }
  if (total === 0) return out
  const exact = BOXES.map((b) => ({ b, v: (minutes[b] / total) * 100 }))
  for (const x of exact) out[x.b] = Math.floor(x.v)
  let left = 100 - BOXES.reduce((s, b) => s + out[b], 0)
  const order = [...exact].sort((x, y) => y.v - Math.floor(y.v) - (x.v - Math.floor(x.v)) || BOXES.indexOf(x.b) - BOXES.indexOf(y.b))
  for (const x of order) {
    if (left <= 0) break
    if (x.v - Math.floor(x.v) > 0) {
      out[x.b]++
      left--
    }
  }
  return out
}

/**
 * Everything the review shows, from the answers alone. Counts only answers in
 * the run's possible quarters: awake, inside the run, before its end. No cap:
 * the repo read pages past 1,000 rows.
 */
export function buildReview(slots: readonly AuditSlot[], run: AuditRun, tz: string): BuiltReview {
  // The quarters that had ended by the end, as the page offered them, plus every
  // answered quarter of the run: a run ended at 10:07 counts its 10:00 quarter
  // only if it was answered, and an answer stays counted even if quiet hours
  // were changed to cover it later.
  const stopMs = runStopMs(run)
  const answeredInRun = slots.map((s) => Date.parse(s.slotAt)).filter((q) => belongsToRun(q, run))
  const possible = new Set(withAnswered(runQuarters(run, stopMs, tz), answeredInRun))
  const counted = slots.filter((s) => possible.has(Date.parse(s.slotAt)))

  const byKey = new Map<string, AuditSlot[]>()
  for (const s of counted) {
    const key = normalizePhrase(s.activity) || s.activity.trim().toLowerCase()
    const list = byKey.get(key) ?? []
    list.push(s)
    byKey.set(key, list)
  }

  const groups: ReviewGroup[] = [...byKey.entries()].map(([key, list]) => {
    const spellings = new Map<string, number>()
    for (const s of list) spellings.set(s.activity.trim(), (spellings.get(s.activity.trim()) ?? 0) + 1)
    const label = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    const energy = oneDecimal(list.reduce((sum, s) => sum + s.energy, 0) / list.length)
    const growth = oneDecimal(list.reduce((sum, s) => sum + s.growth, 0) / list.length)
    return {
      key,
      label,
      answers: list.length,
      minutes: list.length * 15,
      energy,
      growth,
      avoidingMinutes: list.filter((s) => s.avoiding).length * 15,
      box: boxOf(energy, growth),
      whys: list
        .filter((s) => s.why && s.why.trim())
        .sort((a, b) => b.slotAt.localeCompare(a.slotAt))
        .map((s) => ({ text: s.why!.trim(), slotAt: s.slotAt })),
    }
  })
  groups.sort((a, b) => b.answers - a.answers || a.label.localeCompare(b.label))

  const boxMinutes: Record<Box, number> = { more: 0, costs: 0, cut: 0, fun: 0 }
  for (const g of groups) boxMinutes[g.box] += g.minutes

  const perHour = new Map<number, { sum: number; n: number }>()
  for (const s of counted) {
    const hour = Math.floor(localMinute(Date.parse(s.slotAt), tz) / 60)
    const h = perHour.get(hour) ?? { sum: 0, n: 0 }
    h.sum += s.energy
    h.n++
    perHour.set(hour, h)
  }
  const bestHours = [...perHour.entries()]
    .filter(([, h]) => h.n >= BEST_HOURS_MIN)
    .sort((a, b) => a[0] - b[0])
    .map(([hour, h]) => ({ hour, energy: oneDecimal(h.sum / h.n), answers: h.n }))

  return {
    possibleQuarters: possible.size,
    possibleHours: possible.size * 0.25,
    answered: counted.length,
    hours: counted.length * 0.25,
    groups,
    shares: wholeShares(boxMinutes),
    bestHours,
  }
}
