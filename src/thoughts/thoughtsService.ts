/**
 * THE RULES OF THOUGHT FREQUENCIES, AS PURE FUNCTIONS.
 *
 * Nothing here reads a clock, the network or the database: every input is an
 * argument, so every rule is tested without either. Plans/thought.md.
 */

import { daysBetweenDateKeys, getTodayInTimezone } from "@/src/shared/dateUtils"
import { isUuid } from "@/src/shared/ids"
import { matchPhrases, normalizePhrase } from "@/src/shared/textMatch"
import {
  INTERVAL_CHOICES,
  LOG_SOURCES,
  type LogInput,
  type LogSource,
  type Thought,
  type ThoughtSettings,
} from "./types"

export const MAX_THOUGHT_LENGTH = 280
export const MAX_REFRAME_LENGTH = 500
export const MAX_NOTE_LENGTH = 2000
/** How many buttons the main page shows before "Show all" (8 to 12 in the plan). */
export const TOP_BUTTONS = 10

/** One wording, one thought: the fold lives in `src/shared/textMatch.ts`. */
export const normalizeThought = normalizePhrase

/** The wording as stored: trimmed, inner whitespace collapsed, case kept. */
export function cleanThoughtText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** Existing thoughts that match what is being typed, best first (the rules: `matchPhrases`). */
export function matchThoughts(query: string, thoughts: Thought[], limit = 4): Thought[] {
  return matchPhrases(query, thoughts, (t) => t.text, (t) => [t.counts.week, t.counts.total], limit)
}

/**
 * THE BUTTON ORDER: pinned first, then by how often it came this week, then
 * by all time, then by the most recent. Archived thoughts are left out.
 * Stable for equal thoughts (by wording), so buttons do not jump around
 * between two renders with the same data.
 */
export function sortForButtons(thoughts: Thought[]): Thought[] {
  return thoughts
    .filter((t) => !t.archived)
    .slice()
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.counts.week - a.counts.week ||
        b.counts.total - a.counts.total ||
        (b.counts.lastAt ?? b.createdAt).localeCompare(a.counts.lastAt ?? a.createdAt) ||
        a.text.localeCompare(b.text),
    )
}

/**
 * READY TO REFRAME (Q8): first logged at least `reframeAfterDays` calendar
 * days ago in the person's own calendar, logged more than once, and never
 * reframed. A thought already reframed is offered again only from its own
 * sheet, never nagged about.
 *
 * Calendar days, not elapsed hours: a thought first logged at 23:50 on Monday
 * is three days old on Thursday morning, which is what "after a few days"
 * means to a person.
 */
export function isReadyToReframe(thought: Thought, settings: Pick<ThoughtSettings, "reframeAfterDays">, timezone: string, now: Date): boolean {
  if (thought.archived || thought.reframe !== null) return false
  if (thought.counts.firstAt === null || thought.counts.total < 2) return false
  const first = getTodayInTimezone(timezone, new Date(thought.counts.firstAt))
  const today = getTodayInTimezone(timezone, now)
  return daysBetweenDateKeys(first, today) >= settings.reframeAfterDays
}

/** The thoughts the "Ready to reframe" strip offers, most frequent first. */
export function readyToReframe(thoughts: Thought[], settings: Pick<ThoughtSettings, "reframeAfterDays">, timezone: string, now: Date): Thought[] {
  return thoughts
    .filter((t) => isReadyToReframe(t, settings, timezone, now))
    .sort((a, b) => b.counts.total - a.counts.total)
}

/**
 * WORDS THAT OPEN THE HELP CARD (Q14). Checked on what a person types as a
 * thought, on the device only; nothing is blocked and nothing is sent anywhere
 * because of it. Broad on purpose: showing a help door to someone who did not
 * need it costs a glance; missing someone who did is the failure that matters.
 */
const HELP_PATTERNS = [
  /\b(kill|hurt|harm|cut)(ing)?\s+(my\s*self|myself)\b/,
  /\bsuicid/,
  /\bend\s+(it\s+all|my\s+life)\b/,
  /\b(want|wanna|wish)\s+(to\s+)?(die|be\s+dead|disappear)\b/,
  /\bbetter\s+off\s+dead\b/,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living)\b/,
  /\bself[\s-]?harm/,
]

export function needsHelpCard(text: string): boolean {
  const t = normalizeThought(text)
  return HELP_PATTERNS.some((p) => p.test(t))
}

// ---------------------------------------------------------------------------
// INPUT CHECKS FOR THE ROUTES. Each returns the cleaned value or an error line
// a person could read; the routes turn an error into a 400.
// ---------------------------------------------------------------------------


type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

export function checkThoughtText(value: unknown): Checked<string> {
  if (typeof value !== "string") return { ok: false, error: "Write the thought" }
  const text = cleanThoughtText(value)
  const norm = normalizeThought(text)
  if (norm.length === 0) return { ok: false, error: "Write the thought" }
  // The folded form can be longer than the text (NFKC expands some
  // characters), and the database caps both.
  if (text.length > MAX_THOUGHT_LENGTH || norm.length > MAX_THOUGHT_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_THOUGHT_LENGTH} characters` }
  }
  return { ok: true, value: text }
}

/**
 * A log as sent by a device. The instant may be up to a week old (a phone
 * offline for days still sends its taps) and no more than ten minutes ahead
 * of the server (a phone whose clock runs fast).
 */
export function checkLogInput(value: unknown, now: Date): Checked<LogInput> {
  if (!value || typeof value !== "object") return { ok: false, error: "Send a log" }
  const v = value as Record<string, unknown>
  if (!isUuid(v.id)) return { ok: false, error: "A log needs an id made on the device" }
  if (v.thoughtId !== null && !isUuid(v.thoughtId)) return { ok: false, error: "Unknown thought" }
  if (typeof v.at !== "string" || Number.isNaN(Date.parse(v.at))) return { ok: false, error: "A log needs a time" }
  const at = Date.parse(v.at)
  if (at > now.getTime() + 10 * 60_000) return { ok: false, error: "That time is in the future" }
  if (at < now.getTime() - 7 * 24 * 60 * 60_000) return { ok: false, error: "That log is more than a week old" }
  if (!LOG_SOURCES.includes(v.source as LogSource)) return { ok: false, error: "Unknown log source" }
  const promptId = v.promptId ?? null
  if (promptId !== null && !isUuid(promptId)) return { ok: false, error: "Unknown reminder" }
  if (v.thoughtId === null && promptId === null) return { ok: false, error: "Nothing notable answers a reminder" }
  // A phone whose clock runs a few minutes fast stamps the future. Stored as
  // now: a log after the counts' "now" would be named as stored but left out
  // of every count until the real time caught up, and would push the next
  // reminder later than it should be.
  return {
    ok: true,
    value: {
      id: v.id,
      thoughtId: v.thoughtId as string | null,
      at: new Date(Math.min(at, now.getTime())).toISOString(),
      source: v.source as LogSource,
      promptId,
    },
  }
}

function belief(value: unknown): Checked<number | null> {
  if (value === null || value === undefined) return { ok: true, value: null }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    return { ok: false, error: "How true it feels is 0 to 100" }
  }
  return { ok: true, value }
}

export interface ReframeInput {
  id: string
  thoughtId: string
  text: string
  beliefBefore: number | null
  beliefAfter: number | null
  evidence: string
  friend: string
}

export function checkReframeInput(value: unknown): Checked<ReframeInput> {
  if (!value || typeof value !== "object") return { ok: false, error: "Send a reframe" }
  const v = value as Record<string, unknown>
  if (!isUuid(v.id) || !isUuid(v.thoughtId)) return { ok: false, error: "Unknown reframe" }
  const text = typeof v.text === "string" ? cleanThoughtText(v.text) : ""
  if (text.length === 0) return { ok: false, error: "Write the new sentence" }
  if (text.length > MAX_REFRAME_LENGTH) return { ok: false, error: `Keep it under ${MAX_REFRAME_LENGTH} characters` }
  const before = belief(v.beliefBefore)
  if (!before.ok) return before
  const after = belief(v.beliefAfter)
  if (!after.ok) return after
  const note = (x: unknown) => (typeof x === "string" ? x.trim() : "")
  const evidence = note(v.evidence)
  const friend = note(v.friend)
  if (evidence.length > MAX_NOTE_LENGTH || friend.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Keep each answer under ${MAX_NOTE_LENGTH} characters` }
  }
  return {
    ok: true,
    value: { id: v.id, thoughtId: v.thoughtId, text, beliefBefore: before.value, beliefAfter: after.value, evidence, friend },
  }
}

/** A whole settings object, as the settings sheet sends it. */
export function checkSettings(value: unknown): Checked<ThoughtSettings> {
  if (!value || typeof value !== "object") return { ok: false, error: "Send the settings" }
  const v = value as Record<string, unknown>
  if (typeof v.remindersOn !== "boolean" || typeof v.showThoughts !== "boolean") {
    return { ok: false, error: "Settings are incomplete" }
  }
  if (!INTERVAL_CHOICES.includes(v.intervalMinutes as (typeof INTERVAL_CHOICES)[number])) {
    return { ok: false, error: "Pick one of the listed intervals" }
  }
  const minute = (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 0 && x < 1440
  const quietOff = v.quietStart === null && v.quietEnd === null
  if (!quietOff && !(minute(v.quietStart) && minute(v.quietEnd) && v.quietStart !== v.quietEnd)) {
    return { ok: false, error: "Quiet hours need a start and a different end" }
  }
  if (typeof v.activeDays !== "number" || !Number.isInteger(v.activeDays) || v.activeDays < 1 || v.activeDays > 127) {
    return { ok: false, error: "Pick at least one day" }
  }
  if (v.pausedUntil !== null && (typeof v.pausedUntil !== "string" || Number.isNaN(Date.parse(v.pausedUntil)))) {
    return { ok: false, error: "Pause needs a time" }
  }
  if (typeof v.reframeAfterDays !== "number" || !Number.isInteger(v.reframeAfterDays) || v.reframeAfterDays < 1 || v.reframeAfterDays > 14) {
    return { ok: false, error: "Ready to reframe is 1 to 14 days" }
  }
  return {
    ok: true,
    value: {
      remindersOn: v.remindersOn,
      intervalMinutes: v.intervalMinutes as ThoughtSettings["intervalMinutes"],
      quietStart: quietOff ? null : (v.quietStart as number),
      quietEnd: quietOff ? null : (v.quietEnd as number),
      activeDays: v.activeDays,
      pausedUntil: v.pausedUntil === null ? null : new Date(v.pausedUntil as string).toISOString(),
      showThoughts: v.showThoughts,
      reframeAfterDays: v.reframeAfterDays,
    },
  }
}
