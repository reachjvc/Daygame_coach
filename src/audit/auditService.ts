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
import { checkWeek } from "./weekService"
import { getTodayInTimezone, localTimeInstant } from "@/src/shared/dateUtils"
import { hhmm, nextDateKey } from "@/src/notifications/quietHours"
import { normalizePhrase } from "@/src/shared/textMatch"
import { belongsToRun, isAwake, localMinute, QUARTER_MS, quarterStart, runQuarters, runStopMs, withAnswered } from "./quarterService"
import { ANSWER_SOURCES, REVIEW_CHOICES, type AuditAnswer, type AuditRun, type AuditSlot, type Review, type ReviewChoice, type ScaleValue, type WeekBlock } from "./types"

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
 * What an answer card still lacks, in words naming the fields ("Pick Energy
 * and Growth."), or null when it is complete (alpha picky-eye-20: the old line
 * listed all three whatever was missing).
 */
export function missingAnswerLine(a: { activity: string; energy: ScaleValue | number | null; growth: ScaleValue | number | null }): string | null {
  const write = !a.activity.trim()
  const picks = [a.energy === null && "Energy", a.growth === null && "Growth"].filter((p): p is string => p !== false)
  const pick = picks.length > 0 ? `pick ${picks.join(" and ")}` : null
  if (write && pick) return `Write what you did and ${pick}.`
  if (write) return "Write what you did."
  if (pick) return `P${pick.slice(1)}.`
  return null
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

/** What is stored for a quarter: its answer, and when it was last answered. */
export interface StoredAnswer {
  id: string
  at: number
  activity: string
  energy: number
  growth: number
  why: string | null
}

/** The same answer: same id and the same words and scores. An edit on another device keeps the id, so the id alone is not enough. */
const sameAnswer = (a: AuditAnswer, held: StoredAnswer) =>
  held.id === a.id && held.activity === a.activity && held.energy === a.energy && held.growth === a.growth && (held.why ?? null) === (a.why ?? null)

/**
 * WHICH ANSWERS TO STORE, given what each quarter holds now (`<run>:<slotAt>`).
 *
 * An answer older than another device's answer for its quarter is refused
 * (CHANGED_SINCE): the newer one stays. But the SAME answer (id, words and
 * scores) is this answer again — the page and Log Out both sent it, or two tabs did — and the
 * clock correction can stamp the first copy later than the second. Refusing
 * that told the phone "not kept" about an answer the server held (code review,
 * 2026-11-09). It is taken as stored, and not written over the newer copy.
 */
export function splitByStored(
  answers: readonly AuditAnswer[],
  stored: ReadonlyMap<string, StoredAnswer>,
): { fresh: AuditAnswer[]; alreadyStored: AuditAnswer[]; refused: { id: string; error: string; retry: false }[] } {
  const fresh: AuditAnswer[] = []
  const alreadyStored: AuditAnswer[] = []
  const refused: { id: string; error: string; retry: false }[] = []
  for (const a of answers) {
    const held = stored.get(`${a.runId}:${a.slotAt}`)
    if (held === undefined || held.at <= Date.parse(a.answeredAt ?? "")) fresh.push(a)
    else if (sameAnswer(a, held)) alreadyStored.push(a)
    else refused.push({ id: a.id, error: CHANGED_SINCE, retry: false })
  }
  return { fresh, alreadyStored, refused }
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

/** The review's choices and notes (D-CHOICES) and the perfect week (`checkWeek`). Anything else is refused. */
export function checkReview(input: unknown): { review: Review } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "A review is an object" }
  const r = input as Record<string, unknown>
  const extra = Object.keys(r).filter((k) => k !== "choices" && k !== "notes" && k !== "week")
  if (extra.length > 0) return { error: "A review holds choices, notes and a week only" }
  const checkedWeek = checkWeek(r.week ?? [])
  if ("error" in checkedWeek) return { error: checkedWeek.error }
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
  return { review: { choices, notes, week: checkedWeek.week } }
}

/**
 * One change to a review, as a device sends it:
 *   { activity, choice?, choiceWas?, note, noteWas? }
 *                                         one activity's choice and note (null / blank clears);
 *                                         no `choice`: the stored choice stays (a note-only save);
 *                                         `choiceWas` / `noteWas`: what the sheet opened with
 *   { block, edit?, copies? }             add a block, or change the one with its id (`edit`: it must still be there);
 *                                         `copies`: new blocks on other days, added in the same write
 *   { removeBlock }                       remove one block by id (already gone: no change)
 */
export type ReviewChange =
  | { activity: string; choice?: ReviewChoice | null; choiceWas?: ReviewChoice | null; note: string; noteWas?: string }
  | { block: WeekBlock; edit?: boolean; copies?: WeekBlock[] }
  | { removeBlock: string }

/** Said when another device changed the note after this sheet opened; the page then shows the newer note. */
export const NOTE_CHANGED = "This note was changed on another device. The newer note is shown now; change it and save again"
/** Said when another device changed the choice after this sheet opened; the page then shows the newer choice. */
export const CHOICE_CHANGED = "This choice was changed on another device. The newer choice is shown now; change it and save again"
/** Both at once: one refusal, so the page shows the newer choice and note together. */
export const CHOICE_AND_NOTE_CHANGED = "This choice and note were changed on another device. The newer ones are shown now; change them and save again"
/** Said when the block being changed was removed on another device; saving would bring it back. */
export const BLOCK_GONE = "This block was removed on another device"
/** Said when part of the stored review is in a shape this version cannot read: nothing is written over it. */
export const REVIEW_UNREADABLE = "Part of this review was saved in a shape this page cannot read, so nothing was changed"

/**
 * Apply one change to the review AS STORED, so two devices on one review never
 * erase each other's saves (alpha findings fast-review-01/02: each device sent
 * its own stale copy of the whole review). The result is checked as a whole
 * (`checkReview`), so a block that overlaps one saved from the other device is
 * refused with both names.
 */
export function applyReviewChange(stored: Review, input: unknown): { review: Review } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Send one change" }
  const c = input as Record<string, unknown>
  const keys = Object.keys(c).filter((k) => k !== "noteWas" && k !== "edit" && k !== "choiceWas").sort().join(",")
  const next: Review = { choices: { ...stored.choices }, notes: { ...stored.notes }, week: [...stored.week] }
  if ((keys === "activity,choice,note" || (keys === "activity,note" && !("choiceWas" in c))) && !("edit" in c)) {
    const { activity, choice, choiceWas, note, noteWas } = c
    if (typeof activity !== "string" || activity.length < 1 || activity.length > ACTIVITY_MAX) return { error: "Bad activity key" }
    const isChoice = (v: unknown) => v === null || (typeof v === "string" && (REVIEW_CHOICES as readonly string[]).includes(v))
    if (choiceWas !== undefined && !isChoice(choiceWas)) return { error: "Bad choice" }
    if (choice !== undefined && choice !== null && (typeof choice !== "string" || !(REVIEW_CHOICES as readonly string[]).includes(choice))) return { error: "Unknown choice" }
    if (typeof note !== "string" || note.length > REVIEW_NOTE_MAX) return { error: `A note can be at most ${REVIEW_NOTE_MAX} characters` }
    if (noteWas !== undefined && typeof noteWas !== "string") return { error: "Bad note" }
    const key = storableText(activity) || activity
    const noteChanged = typeof noteWas === "string" && (stored.notes[key] ?? "") !== noteWas
    const choiceChanged = choiceWas !== undefined && (stored.choices[key] ?? null) !== choiceWas
    if (noteChanged && choiceChanged) return { error: CHOICE_AND_NOTE_CHANGED }
    if (noteChanged) return { error: NOTE_CHANGED }
    if (choiceChanged) return { error: CHOICE_CHANGED }
    // Sent only when changed in the sheet: a note-only save never writes the pre-filled "Do more" over a choice saved elsewhere.
    if (choice) next.choices[key] = choice as ReviewChoice
    else if (choice === null) delete next.choices[key]
    if (storableText(note).trim()) next.notes[key] = note
    else delete next.notes[key]
  } else if ((keys === "block" || keys === "block,copies") && !("noteWas" in c) && !("choiceWas" in c)) {
    if (c.edit !== undefined && typeof c.edit !== "boolean") return { error: "Bad edit" }
    const one = checkWeek([c.block])
    if ("error" in one) return one
    const block = one.week[0]
    const at = next.week.findIndex((b) => b.id === block.id)
    if (at >= 0) next.week[at] = block
    else if (c.edit === true) return { error: BLOCK_GONE }
    else next.week.push(block)
    // The same block on other days (alpha picky-eye-07): all or none, checked with the rest of the week below.
    if ("copies" in c) {
      const copies = checkWeek(c.copies)
      if ("error" in copies) return copies
      for (const copy of copies.week) {
        if (next.week.some((b) => b.id === copy.id)) return { error: "Two blocks share an id" }
        next.week.push(copy)
      }
    }
  } else if (keys === "removeBlock" && !("noteWas" in c) && !("edit" in c) && !("choiceWas" in c)) {
    if (typeof c.removeBlock !== "string") return { error: "Bad block id" }
    next.week = next.week.filter((b) => b.id !== c.removeBlock)
  } else {
    return { error: "Send one change" }
  }
  return checkReview(next)
}

/**
 * A page from before `reviewChange` sends whole parts (`{ choices?, notes?, week? }`).
 * Only the parts sent replace what is stored; a part left out keeps what is
 * stored at the moment of writing, not what the route read earlier.
 */
export function applyReviewParts(stored: Review, input: unknown): { review: Review } | { error: string } {
  const checked = checkReview(input)
  if ("error" in checked) return checked
  const sent = input as Record<string, unknown>
  return {
    review: {
      choices: "choices" in sent ? checked.review.choices : stored.choices,
      notes: "notes" in sent ? checked.review.notes : stored.notes,
      week: "week" in sent ? checked.review.week : stored.week,
    },
  }
}

type ReviewPart = keyof Review
const REVIEW_PARTS: readonly ReviewPart[] = ["choices", "notes", "week"]
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

/**
 * The review as stored, for showing and changing it, and which parts could not
 * be read (present, but in a shape this version refuses). An unreadable part
 * reads as empty, so the screen still opens; `reviewToStore` makes sure it is
 * never written over.
 */
export function readStoredReview(raw: unknown): { review: Review; unreadable: ReviewPart[] } {
  const r = isPlainObject(raw) ? raw : {}
  const unreadable: ReviewPart[] = []
  const week = checkWeek(r.week ?? [])
  if ("error" in week) unreadable.push("week")
  if (r.choices !== undefined && !isPlainObject(r.choices)) unreadable.push("choices")
  if (r.notes !== undefined && !isPlainObject(r.notes)) unreadable.push("notes")
  return {
    review: {
      choices: (isPlainObject(r.choices) ? r.choices : {}) as Review["choices"],
      notes: (isPlainObject(r.notes) ? r.notes : {}) as Review["notes"],
      week: "week" in week ? week.week : [],
    },
    unreadable: unreadable.sort((a, b) => REVIEW_PARTS.indexOf(a) - REVIEW_PARTS.indexOf(b)),
  }
}

/**
 * What to write after a change: the changed review, with every part that could
 * not be read carried through exactly as stored (and anything else stored
 * beside the three parts kept). A change to an unreadable part is refused.
 */
export function reviewToStore(raw: unknown, before: Review, after: Review): { value: Record<string, unknown> } | { error: string } {
  const { unreadable } = readStoredReview(raw)
  const value: Record<string, unknown> = { ...(isPlainObject(raw) ? raw : {}) }
  for (const part of REVIEW_PARTS) {
    if (unreadable.includes(part)) {
      if (JSON.stringify(after[part]) !== JSON.stringify(before[part])) return { error: REVIEW_UNREADABLE }
    } else {
      value[part] = after[part]
    }
  }
  return { value }
}

/**
 * The review's next version stamp (`updated_at`): now, but always at least a
 * millisecond after the one read, so two saves in one millisecond (or a server
 * clock behind the last writer's) still change it and the next writer's check sees it.
 */
export function nextReviewVersion(read: string, now: Date): string {
  const readMs = Math.floor(Date.parse(read))
  return new Date(Math.max(now.getTime(), Number.isFinite(readMs) ? readMs + 1 : 0)).toISOString()
}

export type MuteOption = "30m" | "1h" | "2h" | "morning" | "off"
export const MUTE_OPTIONS: readonly MuteOption[] = ["30m", "1h", "2h", "morning", "off"]

const MORNING_FALLBACK = 8 * 60


/**
 * When a mute ends (D-MUTE). "morning" is the end of the quiet hours: the end
 * of the ones running now, else of the next ones (tonight's, ending tomorrow).
 * With no quiet hours, 08:00. Null means unmuted.
 *
 * A timed mute ends on the quarter at or before "now + N": the quarter the
 * label "Muted until 19:30" names. Tap + exactly 1 h (19:30:34) kept the
 * 19:30:00 tick muted, and that ping came at 19:31 (alpha slow-pass-05).
 */
export function muteUntil(option: MuteOption, run: Pick<AuditRun, "quietStart" | "quietEnd">, now: Date, tz: string): Date | null {
  const ms = now.getTime()
  switch (option) {
    case "off":
      return null
    case "30m":
      return new Date(quarterStart(ms + 30 * 60_000))
    case "1h":
      return new Date(quarterStart(ms + 60 * 60_000))
    case "2h":
      return new Date(quarterStart(ms + 120 * 60_000))
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
/**
 * Each box says what its activities are like, never what to do with them:
 * "Do more" and "Cut" are choices (CHOICE_NAMES), and a box that used the
 * same words read as a choice already made (alpha fast-review-04, picky-eye-05).
 */
export const BOX_NAMES: Record<Box, string> = {
  more: "Lifts you and builds your life",
  costs: "Worth it, but it costs me",
  cut: "Drains you, builds nothing",
  fun: "Fun that builds nothing",
}

/** What you will do with an activity (plan Part 1 step 7). */
export const CHOICE_NAMES: Record<ReviewChoice, string> = {
  more: "Do more",
  keep: "Keep",
  handoff: "Hand off",
  cut: "Cut",
  change: "Change how",
}

/**
 * The choice an activity shows: the one made, or "Do more" pre-filled for an
 * activity in the top box until another is made, so the perfect week starts
 * from what the boxes already show (alpha fast-review-04).
 */
export function choiceFor(g: Pick<ReviewGroup, "key" | "box">, choices: Record<string, ReviewChoice>): ReviewChoice | null {
  return choices[g.key] ?? (g.box === "more" ? "more" : null)
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
  /**
   * The same, counting only answers with growth above 4: the hours to put the
   * hardest work in are the ones you had energy while building something, not
   * the evening hours of a favourite series (alpha fast-review-05).
   */
  workHours: { hour: number; energy: number; answers: number }[]
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

  const energyByHour = (from: readonly AuditSlot[]) => {
    const perHour = new Map<number, { sum: number; n: number }>()
    for (const s of from) {
      const hour = Math.floor(localMinute(Date.parse(s.slotAt), tz) / 60)
      const h = perHour.get(hour) ?? { sum: 0, n: 0 }
      h.sum += s.energy
      h.n++
      perHour.set(hour, h)
    }
    return [...perHour.entries()]
      .filter(([, h]) => h.n >= BEST_HOURS_MIN)
      .sort((a, b) => a[0] - b[0])
      .map(([hour, h]) => ({ hour, energy: oneDecimal(h.sum / h.n), answers: h.n }))
  }
  const bestHours = energyByHour(counted)
  const workHours = energyByHour(counted.filter((s) => s.growth > 4))

  return {
    possibleQuarters: possible.size,
    possibleHours: possible.size * 0.25,
    answered: counted.length,
    hours: counted.length * 0.25,
    groups,
    shares: wholeShares(boxMinutes),
    bestHours,
    workHours,
  }
}
