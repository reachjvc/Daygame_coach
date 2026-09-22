/**
 * THE ONLY THING THAT READS OR WRITES THE BLACK BOX.
 *
 * Today it is `localStorage`. It is written as a repo — load the whole record,
 * hand back a new one, persist it — because the record's whole value is that it
 * accumulates for years, and the platform move off Supabase (decided
 * 2026-09-17) has to be a change to this file and nothing else.
 *
 * That is the same rule the rest of the app already lives by: nothing outside
 * `src/db/` talks to the database, which is why the migration rewrites twelve
 * files instead of the app. `localStorage` is not the risk here. Data born in a
 * shape that cannot move is the risk, and a record scattered across twelve
 * components that each write their own key cannot move at all.
 *
 * Rules this file keeps, so the move stays cheap:
 *   - append-only: nothing is ever mutated in place or reordered;
 *   - stable ids on every row;
 *   - ISO dates, never a Date object and never a timestamp;
 *   - nothing derived is ever stored — `blackboxService` computes it on read.
 */

import type { BlackBoxRecord, ViceAttempt, ViceEndingId, ViceReport } from "../types"
import { ENDING_FAMILIES } from "../data/blackbox"
import { toDateISO } from "@/src/shared/dateUtils"

/**
 * Its own key. `quit-vice-v1` is NOT read, written or migrated by this file —
 * the old module keeps working untouched, and nothing already in somebody's
 * browser is rewritten by this feature arriving.
 */
export const BLACKBOX_KEY = "vice-blackbox-v1"

export function emptyRecord(): BlackBoxRecord {
  return { version: 1, attempts: [], reports: [] }
}

/**
 * The person's own calendar day.
 *
 * This module is client-only, so the browser's wall clock IS the user's
 * calendar — which is exactly what `toDateISO` reads. The rule this dodges by
 * spelling it out is about taking a day from the SERVER's clock, where "now"
 * is UTC and a late evening becomes tomorrow. Here there is no server.
 */
export function todayInBrowser(at: Date = new Date()): string {
  return toDateISO(at)
}

/**
 * The moment, in the person's own wall clock, with NO timezone suffix.
 *
 * `new Date().toISOString()` is UTC, and a report filed at 23:30 in Berlin
 * comes back dated tomorrow — so a run ended the evening of the 19th was
 * recorded as ending on the 20th and every length was a day out west of UTC.
 * That is the exact bug `toDateISO` exists to prevent, reintroduced one layer
 * up by taking the instant instead of the day.
 *
 * Local wall-clock text sorts correctly for one person's own record, which is
 * all this is ever compared within, and `slice(0, 10)` gives their day.
 */
export function nowInBrowser(at: Date = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${toDateISO(at)}T${p(at.getHours())}:${p(at.getMinutes())}:${p(at.getSeconds())}`
}

/** A calendar day, or nothing. Anything else is refused rather than stored. */
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const at = new Date(Date.UTC(y, m - 1, d))
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d
}

/** A stable id. Crypto where it exists, because two entries a second apart must not collide. */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `bb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Parse whatever is in storage.
 *
 * Anything unreadable returns an empty record rather than throwing: a corrupted
 * key must not take the page down, because the page is the only way to reach
 * the rest of the record. It does NOT silently discard a readable record with
 * an unknown version — that would delete somebody's history to avoid an error.
 */
export function parseRecord(raw: string | null): BlackBoxRecord {
  if (!raw) return emptyRecord()
  try {
    const parsed = JSON.parse(raw) as Partial<BlackBoxRecord>
    if (!parsed || typeof parsed !== "object") return emptyRecord()
    const attempts = Array.isArray(parsed.attempts) ? (parsed.attempts as ViceAttempt[]) : []
    const reports = Array.isArray(parsed.reports) ? (parsed.reports as ViceReport[]) : []
    return { version: 1, attempts, reports }
  } catch {
    return emptyRecord()
  }
}

export function serializeRecord(record: BlackBoxRecord): string {
  return JSON.stringify(record)
}

export function loadRecord(storage: Storage | null): BlackBoxRecord {
  if (!storage) return emptyRecord()
  try {
    return parseRecord(storage.getItem(BLACKBOX_KEY))
  } catch {
    return emptyRecord()
  }
}

export function saveRecord(storage: Storage | null, record: BlackBoxRecord): void {
  if (!storage) return
  try {
    storage.setItem(BLACKBOX_KEY, serializeRecord(record))
  } catch {
    // A full or blocked storage must not break the screen. The record stays in
    // memory for this session; the export door is how it gets out.
  }
}

// ---------------------------------------------------------------- writes
// Every one returns a NEW record. Nothing is mutated, so a caller cannot
// accidentally persist half a change.

export function startAttempt(
  record: BlackBoxRecord,
  input: { viceId: string; label: string; startedOn: string; startedBy: string; structure: string[] },
): BlackBoxRecord {
  // A free-typed "16/08/2026" used to go straight in, and every length, bar
  // width and total downstream became NaN — persisted, so reloading did not
  // clear it. The screen also validates; this is the one that cannot be skipped.
  if (!isCalendarDay(input.startedOn)) return record

  const attempt: ViceAttempt = {
    id: newId(),
    viceId: input.viceId,
    label: input.label,
    startedOn: input.startedOn,
    startedBy: input.startedBy,
    structure: input.structure,
    endedOn: null,
    endedByReportId: null,
  }
  return { ...record, attempts: [...record.attempts, attempt] }
}

/**
 * Record a run that is already over.
 *
 * THE TOOL IS WORTH NOTHING EMPTY, and the first thing it asks of somebody is
 * four years of history they have to remember. Until this existed there was no
 * way to enter any of it: `startAttempt` always made a live run and an ending
 * was always dated now, so "I quit in February 2025 and it ended that May" was
 * unrepresentable. The feature's entire premise was unreachable from its own
 * screen.
 *
 * The attempt and the report that ended it are written together, so a past run
 * can never exist without the reason it ended — the same guarantee a live run
 * gets from `fileReport`.
 *
 * The time of day is midday, the convention `middayInstant` already uses in
 * this codebase for a day with no clock time. Nobody remembers what time they
 * gave in three years ago, and midnight would sort a remembered ending before
 * close calls filed on the same day.
 */
export function recordPastRun(
  record: BlackBoxRecord,
  input: {
    viceId: string
    label: string
    startedOn: string
    endedOn: string
    startedBy: string
    structure: string[]
    ending: ViceEndingId
    thought: string
  },
): BlackBoxRecord {
  if (!isCalendarDay(input.startedOn) || !isCalendarDay(input.endedOn)) return record
  // A run cannot end before it started. Accepting it would draw a bar with a
  // negative width and a negative day count into the lifetime total.
  if (input.endedOn < input.startedOn) return record
  // Nor can two runs cover the same day. "Across every run" is a sum of run
  // lengths, so an overlap counts those days twice: a 16-day run entered
  // inside a live 31-day one took the headline total to 47 days for a stretch
  // in which 31 days had passed. The screen refuses it too; this is the guard
  // that cannot be skipped.
  if (overlapsExisting(record, input.startedOn, input.endedOn)) return record

  const report: ViceReport = {
    id: newId(),
    attemptId: "",
    at: `${input.endedOn}T12:00:00`,
    wentThrough: true,
    thought: input.thought,
    ending: input.ending,
    closeness: null,
    withWhom: "",
    where: "",
    factors: [],
    didInstead: "",
  }
  const attempt: ViceAttempt = {
    id: newId(),
    viceId: input.viceId,
    label: input.label,
    startedOn: input.startedOn,
    startedBy: input.startedBy,
    structure: input.structure,
    endedOn: input.endedOn,
    endedByReportId: report.id,
  }
  return {
    ...record,
    attempts: [...record.attempts, attempt],
    reports: [...record.reports, { ...report, attemptId: attempt.id }],
  }
}

/**
 * Does this stretch of days touch a run that is already on the record?
 *
 * Inclusive on both ends, matching `runDays`: a run that ended on the 5th and
 * one that started on the 5th share a day, and that day would be counted twice
 * in the lifetime total. A live run is treated as running up to `endedOn` of
 * the stretch being added, because "still going" covers every day since it
 * started.
 */
export function overlapsExisting(record: BlackBoxRecord, startedOn: string, endedOn: string): boolean {
  return record.attempts.some((a) => {
    const aEnd = a.endedOn ?? endedOn
    return a.startedOn <= endedOn && startedOn <= aEnd
  })
}

/**
 * File a report.
 *
 * When `wentThrough` is true the run it belongs to ends, dated by the report —
 * which is why an ending is never entered separately. A run's ending IS a
 * report, so the two can never disagree about why it ended.
 */
export function fileReport(
  record: BlackBoxRecord,
  input: {
    attemptId: string
    at: string
    wentThrough: boolean
    thought: string
    ending: ViceEndingId
    closeness: number | null
    withWhom: string
    where: string
    factors: string[]
    didInstead: string
  },
): BlackBoxRecord {
  const report: ViceReport = { id: newId(), ...input }
  const reports = [...record.reports, report]
  if (!input.wentThrough) return { ...record, reports }

  const endedOn = input.at.slice(0, 10)
  const attempts = record.attempts.map((a) =>
    a.id === input.attemptId && a.endedOn === null
      ? { ...a, endedOn, endedByReportId: report.id }
      : a,
  )
  return { ...record, attempts, reports }
}

// ---------------------------------------------------------------- portability

/**
 * The record as a file.
 *
 * Not only insurance against a cleared browser. A record of your own attempts
 * that you can hold as a file is a different object from a log trapped in an
 * app — the reason Engineers Without Borders publishes a Failure Report and the
 * reason a "CV of failures" reads as an asset rather than a confession.
 */
export function exportRecord(record: BlackBoxRecord): string {
  return JSON.stringify(record, null, 2)
}

/**
 * Import replaces wholesale, and checks every row before it does.
 *
 * Checking only that two arrays exist was worse than not checking: one
 * malformed row was accepted, written to storage, and then crashed the page on
 * every load — with the only door back to a good import sitting on the page
 * that would no longer render. A bad file must bounce off, not brick the tool.
 */
export function importRecord(raw: string): BlackBoxRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BlackBoxRecord>
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.attempts) || !Array.isArray(parsed.reports)) return null
    if (!parsed.attempts.every(isAttempt)) return null
    if (!parsed.reports.every(isReport)) return null
    return { version: 1, attempts: parsed.attempts, reports: parsed.reports }
  } catch {
    return null
  }
}

function isAttempt(row: unknown): row is ViceAttempt {
  if (!row || typeof row !== "object") return false
  const a = row as Partial<ViceAttempt>
  if (typeof a.id !== "string" || a.id === "") return false
  if (typeof a.startedOn !== "string" || !isCalendarDay(a.startedOn)) return false
  if (a.endedOn !== null && (typeof a.endedOn !== "string" || !isCalendarDay(a.endedOn))) return false
  if (!Array.isArray(a.structure) || !a.structure.every((x) => typeof x === "string")) return false
  return typeof a.label === "string" && typeof a.viceId === "string"
}

function isReport(row: unknown): row is ViceReport {
  if (!row || typeof row !== "object") return false
  const r = row as Partial<ViceReport>
  if (typeof r.id !== "string" || r.id === "") return false
  if (typeof r.attemptId !== "string") return false
  if (typeof r.at !== "string" || !isCalendarDay(r.at.slice(0, 10))) return false
  if (typeof r.wentThrough !== "boolean") return false
  if (!Array.isArray(r.factors) || !r.factors.every((x) => typeof x === "string")) return false
  // The ending must be one the app knows, not merely a string. `ViceEndingId`
  // is a closed union of six, and a cast at the import boundary launders
  // anything past it: an unrecognised id then renders as "something else" on
  // every bar AND drops out of the cost ranking entirely — because that panel
  // walks ENDING_FAMILIES — while its days stay in "Across every run". Two
  // panels disagreeing, with nothing on screen saying why.
  if (typeof r.ending !== "string" || !ENDING_FAMILIES.some((f) => f.id === r.ending)) return false
  return typeof r.thought === "string"
}
