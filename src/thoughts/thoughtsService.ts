/**
 * THE RULES OF THOUGHT FREQUENCIES, AS PURE FUNCTIONS.
 *
 * Nothing here reads a clock, the network or the database: every input is an
 * argument, so every rule is tested without either. Plans/thought.md.
 */

import { daysBetweenDateKeys, getTodayInTimezone } from "@/src/shared/dateUtils"
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

/**
 * ONE WORDING, ONE THOUGHT.
 *
 * "I am bad", "i am bad." and "  I   am BAD!! " are the same thought, so they
 * fold to the same key. The database holds one live wording per key per person
 * (`thoughts_one_wording_per_person`), so this function is the definition of
 * "the same": lower case, curly quotes made straight, whitespace collapsed,
 * and punctuation at either end dropped. Punctuation inside is kept: "I'm" and
 * "Im" are close, not equal, and the suggestions handle close.
 */
export function normalizeThought(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s.,!?;:…"'()\-–—]+/u, "")
    .replace(/[\s.,!?;:…"'()\-–—]+$/u, "")
}

/** The wording as stored: trimmed, inner whitespace collapsed, case kept. */
export function cleanThoughtText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** Folded further, for "close" rather than "equal": apostrophes and inner punctuation gone. */
function looseKey(text: string): string {
  return normalizeThought(text).replace(/['".,!?;:…()\-–—]/g, "").replace(/\s+/g, " ").trim()
}

/** Edit distance, capped: anything beyond `cap` is reported as `cap + 1`. */
function boundedDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (row[j] < best) best = row[j]
    }
    if (best > cap) return cap + 1
    prev = row
  }
  return prev[b.length]
}

/**
 * EXISTING THOUGHTS THAT MATCH WHAT IS BEING TYPED, best first.
 *
 * Typing "im bad" must offer "I am bad" before a near-copy is created
 * (Plans/thought.md, "The habit"). Three kinds of match, in this order:
 *   1. the same thought once folded (it would be refused as a duplicate);
 *   2. every typed word starts a word of the thought, in order ("i am b");
 *   3. a small spelling distance from the whole thought ("im bad", "i am bda").
 * Within a kind, the more frequent thought first. Archived thoughts match too:
 * typing one again is how it comes back.
 */
export function matchThoughts(query: string, thoughts: Thought[], limit = 4): Thought[] {
  const q = looseKey(query)
  if (q.length === 0) return []
  const qWords = q.split(" ")

  const scored: { thought: Thought; kind: number }[] = []
  for (const thought of thoughts) {
    const key = looseKey(thought.text)
    if (key === q) {
      scored.push({ thought, kind: 0 })
      continue
    }
    const words = key.split(" ")
    let at = 0
    let prefixes = true
    for (const w of qWords) {
      while (at < words.length && !words[at].startsWith(w)) at++
      if (at === words.length) {
        prefixes = false
        break
      }
      at++
    }
    if (prefixes) {
      scored.push({ thought, kind: 1 })
      continue
    }
    const cap = q.length < 5 ? 1 : q.length < 12 ? 2 : 3
    const squashedQ = q.replace(/ /g, "")
    const squashedKey = key.replace(/ /g, "")
    if (boundedDistance(squashedQ, squashedKey, cap) <= cap) scored.push({ thought, kind: 2 })
  }

  return scored
    .sort((a, b) => a.kind - b.kind || b.thought.counts.week - a.thought.counts.week || b.thought.counts.total - a.thought.counts.total)
    .slice(0, limit)
    .map((s) => s.thought)
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value)
}

type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

export function checkThoughtText(value: unknown): Checked<string> {
  if (typeof value !== "string") return { ok: false, error: "Write the thought" }
  const text = cleanThoughtText(value)
  if (normalizeThought(text).length === 0) return { ok: false, error: "Write the thought" }
  if (text.length > MAX_THOUGHT_LENGTH) return { ok: false, error: `Keep it under ${MAX_THOUGHT_LENGTH} characters` }
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
  return {
    ok: true,
    value: { id: v.id, thoughtId: v.thoughtId as string | null, at: new Date(at).toISOString(), source: v.source as LogSource, promptId },
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
