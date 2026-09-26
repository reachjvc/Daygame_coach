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
import { VICES } from "../data/vices"
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

/**
 * A true UTC instant, for the two sync fields and nothing else.
 *
 * `nowInBrowser` above is deliberately NOT this: a report's `at` is the
 * person's own night and must not shift zones. `updatedAt` and `deletedAt` are
 * the opposite question — which of two versions of a row is newer, asked across
 * devices — and local wall-clock text stops being comparable the moment a phone
 * and a laptop are in different places. See `SyncStamps` in types.ts.
 */
let lastStamp = ""

export function nowUtc(at: Date = new Date()): string {
  // MONOTONIC, BECAUSE A TIE PICKS THE STALE COPY.
  //
  // `toISOString` has millisecond precision, and two writes in the same
  // millisecond are ordinary: starting a run and ending it in a test, or any
  // two actions on a fast machine. The merge keeps the copy it already holds
  // when stamps are equal — it has to, or an unsent local edit would lose to
  // the server's older answer — so two rows stamped alike means the SECOND one
  // silently loses on the other device.
  //
  // Found by a test that merged a lapse onto a second device and got back a run
  // still going with the report that ended it sitting underneath.
  //
  // The rule this keeps: a row's stamp is always strictly greater than the
  // stamp of the version it was derived from. Within one device that is exact.
  // Across two devices an identical millisecond is a genuine simultaneous edit
  // by one person in two places, which does not happen.
  const now = at.toISOString()
  const stamp = now > lastStamp ? now : new Date(Date.parse(lastStamp) + 1).toISOString()
  lastStamp = stamp
  return stamp
}

/** Only for tests, which need each case to start from a known clock. */
export function resetStampClock(): void {
  lastStamp = ""
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
  // UUID-SHAPED, BECAUSE THE COLUMN IS `UUID` AND THE DATABASE REFUSES
  // ANYTHING ELSE.
  //
  // This fallback used to return `bb-<base36>-<random>`, which was fine for
  // years of a record that never left the browser and is now the difference
  // between syncing and not: every insert carrying one is rejected, so a
  // browser without `crypto.randomUUID` would write happily to its own storage
  // and silently never reach the account. `randomUUID` needs a secure context,
  // so plain http on a phone on the local network is exactly where this bites.
  //
  // v4-shaped rather than random text for the same reason: the shape is what
  // the column accepts. `Math.random` is not a cryptographic source and does
  // not need to be — these ids identify rows within one person's own record,
  // and nothing is secured by their unpredictability.
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  const variant = "89ab"[Math.floor(Math.random() * 4)]
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`
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
    return { version: 1, attempts: attempts.map(stamped), reports: reports.map(stamped) }
  } catch {
    return emptyRecord()
  }
}

/**
 * A row read back, with the two sync fields guaranteed present.
 *
 * Rows written before this existed have neither. They are not invalid and they
 * are not old — they are somebody's four years — so they are filled in on read
 * rather than refused. `updatedAt` falls back to the row's own moment where it
 * has one, so a record imported onto a second device does not arrive claiming
 * every run changed at once; `startedOn` is a day and midday is the convention
 * this file already uses for a day with no clock time.
 */
function stamped<T extends { updatedAt?: string; deletedAt?: string | null }>(row: T): T {
  if (typeof row.updatedAt === "string" && row.updatedAt !== "") {
    return row.deletedAt === undefined ? { ...row, deletedAt: null } : row
  }
  const own = row as { at?: string; startedOn?: string }
  const moment = own.at ?? (own.startedOn ? `${own.startedOn}T12:00:00` : null)
  const parsed = moment ? Date.parse(`${moment}Z`) : Number.NaN
  return {
    ...row,
    updatedAt: Number.isNaN(parsed) ? new Date(0).toISOString() : new Date(parsed).toISOString(),
    deletedAt: row.deletedAt ?? null,
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
  input: {
    viceId: string
    label: string
    startedOn: string
    startedBy: string
    structure: string[]
    /** Whether they confirmed reading the withdrawal note. Only read for a vice that carries one. */
    acknowledgedRisk: boolean
    /** The person's own today, so "still going" has an end to be measured against. */
    today: string
  },
): BlackBoxRecord {
  // THE SAFETY GATE, AT THE LAYER THAT CANNOT BE SKIPPED.
  //
  // Alcohol and benzodiazepine withdrawal can kill; every other vice on the
  // list is only unpleasant. The old module gates date-setting in
  // `viceService.dateIsBlocked` AND on the button, deliberately, because a
  // gate that lives only in a component is one refactor from being gone and
  // nothing would fail. The Black Box shipped with the button half only.
  if (riskGateBlocks(input.viceId, input.acknowledgedRisk)) return record
  // A free-typed "16/08/2026" used to go straight in, and every length, bar
  // width and total downstream became NaN — persisted, so reloading did not
  // clear it. The screen also validates; this is the one that cannot be skipped.
  if (!isCalendarDay(input.startedOn)) return record
  // THE SAME OVERLAP RULE THE REMEMBERED-RUN FORM KEEPS. It was on that form
  // only, so the identical double-count was reachable from this one: a run
  // backdated into a run already on the record, or a second live run off a vice
  // that already has one, both went straight in and both counted their shared
  // days twice in "Across every run". A live run covers every day up to today,
  // which is what the stretch is measured against.
  if (overlapsExisting(record, input.startedOn, input.today, input.viceId)) return record

  const attempt: ViceAttempt = {
    id: newId(),
    viceId: input.viceId,
    label: input.label,
    startedOn: input.startedOn,
    startedBy: input.startedBy,
    structure: input.structure,
    endedOn: null,
    endedByReportId: null,
    updatedAt: nowUtc(),
    deletedAt: null,
  }
  return { ...record, attempts: [...record.attempts, attempt] }
}

/**
 * The last day anything was filed against a run, or its own start.
 *
 * Exported so the form and the store ask one question rather than each deciding
 * what "already on the record" means.
 */
export function latestReportDay(record: BlackBoxRecord, attemptId: string): string {
  const start = living(record.attempts).find((a) => a.id === attemptId)?.startedOn ?? ""
  return living(record.reports)
    .filter((r) => r.attemptId === attemptId)
    .reduce((latest, r) => (r.at.slice(0, 10) > latest ? r.at.slice(0, 10) : latest), start)
}

/**
 * Whether starting this run is blocked by the withdrawal note.
 *
 * Exported so the screen and the store ask the same question of the same
 * catalogue, rather than each deciding what "risky" means.
 */
export function riskGateBlocks(viceId: string, acknowledgedRisk: boolean): boolean {
  const vice = VICES.find((v) => v.id === viceId)
  return (vice?.medicalRisk ?? false) && !acknowledgedRisk
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
  // Nor can two runs OFF THE SAME VICE cover the same day. "Across every run"
  // is a sum of run lengths, so an overlap counts those days twice: a 16-day
  // run entered inside a live 31-day one took the headline total to 47 days
  // for a stretch in which 31 days had passed. The screen refuses it too; this
  // is the guard that cannot be skipped.
  if (overlapsExisting(record, input.startedOn, input.endedOn, input.viceId)) return record

  const stamp = nowUtc()
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
    updatedAt: stamp,
    deletedAt: null,
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
    updatedAt: stamp,
    deletedAt: null,
  }
  return {
    ...record,
    attempts: [...record.attempts, attempt],
    reports: [...record.reports, { ...report, attemptId: attempt.id }],
  }
}

/**
 * Does this stretch of days touch a run OFF THE SAME VICE already on the record?
 *
 * Inclusive on both ends, matching `runDays`: a run that ended on the 5th and
 * one that started on the 5th share a day, and that day would be counted twice
 * in the lifetime total.
 *
 * PER VICE, because the total it protects is per vice. Without the vice this
 * refused the most ordinary thing a person does — stopping two things over the
 * same months — and it refused it silently at the store as well as on the
 * screen, so "Add it" simply did nothing. Quitting smoking in March and porn in
 * March are not the same days counted twice; they are two records.
 *
 * A live run is treated as running up to `endedOn` of the stretch being added,
 * because "still going" covers every day since it started.
 */
export function overlapsExisting(
  record: BlackBoxRecord,
  startedOn: string,
  endedOn: string,
  viceId: string,
): boolean {
  return living(record.attempts).some((a) => {
    if (a.viceId !== viceId) return false
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
 *
 * `at` USED TO BE THE MOMENT OF FILING AND NOTHING ELSE, and the form had no
 * way to say otherwise. Almost nobody files at the moment: they file the next
 * morning. So a run that ended on Friday night was recorded as ending on
 * Saturday, one day longer than it was, permanently and with no way to correct
 * it — in the one number the whole screen is built on. The form now asks which
 * day, and this refuses a day before the run it is filed against, because a
 * report predating its own run would give the run a negative length.
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
  if (!isCalendarDay(input.at.slice(0, 10))) return record
  const against = living(record.attempts).find((a) => a.id === input.attemptId)
  if (!against || input.at.slice(0, 10) < against.startedOn) return record
  // A LAPSE ENDS THE RUN, SO IT CANNOT PREDATE WHAT THE RUN ALREADY HOLDS.
  // Dating one before a close call already filed against the same run leaves
  // the record saying you nearly went on the 5th during a run that ended on
  // the 2nd — and the chart hides it, because `laneGeometry` clamps a dot that
  // falls outside its bar back onto the end of it. The close call is the thing
  // to remove first, which the run's own panel now allows.
  if (input.wentThrough && input.at.slice(0, 10) < latestReportDay(record, input.attemptId)) {
    return record
  }

  const stamp = nowUtc()
  const report: ViceReport = { id: newId(), ...input, updatedAt: stamp, deletedAt: null }
  const reports = [...record.reports, report]
  if (!input.wentThrough) return { ...record, reports }

  const endedOn = input.at.slice(0, 10)
  // THE RUN CHANGED TOO, SO THE RUN'S STAMP MOVES TOO. A lapse writes one new
  // row and edits one existing one, and the edit is the half a sync would miss:
  // another device would take the new report, keep its own copy of the attempt,
  // and show a run still going with the report that ended it sitting under it.
  const attempts = record.attempts.map((a) =>
    a.id === input.attemptId && a.endedOn === null
      ? { ...a, endedOn, endedByReportId: report.id, updatedAt: stamp }
      : a,
  )
  return { ...record, attempts, reports }
}

// ---------------------------------------------------------------- corrections

/**
 * TAKING SOMETHING BACK.
 *
 * Until these existed the record was append-only in the strongest sense: there
 * was no delete, no edit and no undo anywhere in the module. One tap on "I did
 * it" followed by "File it" ended a 207-day run for good, and the whole control
 * surface left on the page afterwards was the door, the bar, "Start a run",
 * "Add a run you already had" and the export. A run entered from memory with a
 * mistyped year was equally permanent, and it went on blocking every
 * overlapping run entered after it.
 *
 * That is not austerity, it is a record nobody can trust. The rule the module
 * actually keeps — the one from the research — is that **a lapse never
 * subtracts anything**, and no counter here resets on a lapse whether or not a
 * mistake can be undone. Confusing "your days are never taken away from you"
 * with "you may never correct what you typed" is how a log stops being written
 * in.
 *
 * Both are surgical and neither cascades further than it must: removing a
 * report that ended a run brings the run back alive, and removing a run takes
 * the reports filed against it with it, because a report against a run that no
 * longer exists would be counted by `thoughtCosts` and drawn nowhere.
 */

/**
 * Whether removing this report would leave two runs alive off one vice.
 *
 * Removing the report that ended a run revives that run. If a later run off the
 * same vice has since been started and is still going, reviving would produce
 * two live runs covering the same days — which `overlapsExisting` refuses on
 * the way in, so it must be refused on the way back too. Exported so the screen
 * can say WHY the control is not offered rather than taking a tap that does
 * nothing.
 */
export function revivalClashes(record: BlackBoxRecord, reportId: string): boolean {
  const ended = living(record.attempts).find((a) => a.endedByReportId === reportId)
  if (!ended) return false
  return living(record.attempts).some(
    (a) =>
      a.id !== ended.id &&
      a.viceId === ended.viceId &&
      // AN ENDED RUN COUNTS TOO, AND LEAVING IT OUT WAS A BACK DOOR INTO THE
      // ONE STATE THIS MODULE REFUSES.
      //
      // This used to ask only whether another run was still LIVE. So the screen
      // said "end the newer run first", which is followable — and following it
      // produced exactly what `overlapsExisting` exists to prevent: end the live
      // run, undo the older ending, and the older run goes live again covering
      // every day since it started, straight across two runs that ended inside
      // that span. Driven on 2026-09-25 with a real four-run record: "Longest
      // run" became 998 days containing two recorded relapses, and "Across every
      // run" counted about 330 days twice. A fabricated streak is the worst
      // number this tool can produce, and it took three taps.
      //
      // No `today` is needed to see it. The revived run goes live, so it covers
      // its start through today, and every other run ends at today or earlier —
      // so "overlaps" is just "was still running on or after the day this one
      // started". A live run (no end date) always is; an ended one is whenever
      // it ended on or after that day. Same day at each edge counts, because
      // that day would be counted twice, which is `overlapsExisting`'s own rule.
      (a.endedOn === null || a.endedOn >= ended.startedOn),
  )
}

/**
 * Remove one report.
 *
 * If it is the one that ended a run, the run goes back to being alive — the
 * ending and the report are the same fact, so removing one and leaving the
 * other would be a run that ended for no recorded reason.
 */
export function removeReport(record: BlackBoxRecord, reportId: string): BlackBoxRecord {
  if (!living(record.reports).some((r) => r.id === reportId)) return record
  if (revivalClashes(record, reportId)) return record
  const stamp = nowUtc()
  return {
    ...record,
    attempts: record.attempts.map((a) =>
      a.endedByReportId === reportId
        ? { ...a, endedOn: null, endedByReportId: null, updatedAt: stamp }
        : a,
    ),
    reports: record.reports.map((r) =>
      r.id === reportId ? { ...r, deletedAt: stamp, updatedAt: stamp } : r,
    ),
  }
}

/** Remove one run, and every report filed against it. */
export function removeAttempt(record: BlackBoxRecord, attemptId: string): BlackBoxRecord {
  if (!living(record.attempts).some((a) => a.id === attemptId)) return record
  const stamp = nowUtc()
  return {
    ...record,
    attempts: record.attempts.map((a) =>
      a.id === attemptId ? { ...a, deletedAt: stamp, updatedAt: stamp } : a,
    ),
    reports: record.reports.map((r) =>
      r.attemptId === attemptId && r.deletedAt === null
        ? { ...r, deletedAt: stamp, updatedAt: stamp }
        : r,
    ),
  }
}

/** The rows that still exist. A tombstone is a row, and it is not one of them. */
export function living<T extends { deletedAt: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => r.deletedAt === null)
}

/**
 * Does this browser hold nothing the person wrote?
 *
 * NOT THE SAME QUESTION AS `recordIsEmpty` IN `viceSyncService`, and the
 * difference is a tombstone. That one asks "does this record carry any ROWS",
 * which is the right question for "was the account empty before this load" —
 * a deletion is a row, and an account holding only tombstones is not a new one.
 * This asks "is there anything ON SCREEN", which is what every read in the
 * module answers through `living()`.
 *
 * THEY DISAGREE ON A RECORD WHOSE RUNS HAVE ALL BEEN DELETED, and that gap put
 * the same fault back the day it was fixed. The banner that tells somebody
 * their account could not be reached was gated on `record.attempts.length === 0`
 * — tombstones included — so a browser holding one deleted run got no banner,
 * while the page above it said "Start with what already happened" because the
 * heading asks `living()`. Two predicates for one question, disagreeing, and
 * the loud half lost. Measured: the warning survived only as 12px grey text
 * 415px further down.
 *
 * A peer session hit the identical trap in the Life Mastery plan on the same
 * day — `planIsUntouched` counted SEEDED areas, so it answered false for a
 * browser holding nothing of the person's. If a predicate like this grows a
 * second caller, check which question that caller is actually asking.
 */
export function holdsNothingWritten(record: BlackBoxRecord): boolean {
  return living(record.attempts).length === 0 && living(record.reports).length === 0
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
export function importRecord(
  raw: string,
  /**
   * The person's own day, so a file cannot carry a run that has not happened.
   *
   * Defaulted rather than required because fifteen test call sites and one
   * product call site would otherwise churn for a rule that is about the
   * calendar; `nowInBrowser` and `todayInBrowser` in this file take their clock
   * the same way. The page passes its own `today` explicitly.
   */
  today: string = todayInBrowser(),
): BlackBoxRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BlackBoxRecord>
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.attempts) || !Array.isArray(parsed.reports)) return null
    if (!parsed.attempts.every(isAttempt)) return null
    if (!parsed.reports.every(isReport)) return null
    // AND EVERY REPORT MUST BELONG TO A RUN THAT IS IN THE FILE.
    // Reads are filtered to the vice on screen by way of the attempt a report
    // is filed against, so an orphan is not merely wrong — it is invisible,
    // on a screen whose whole claim is that it shows you your own record. It
    // bounces the file rather than dropping the rows quietly.
    const runs = new Set(parsed.attempts.map((a) => a.id))
    if (!parsed.reports.every((r) => runs.has(r.attemptId))) return null
    // The same for an ending that names a report the file does not carry.
    const rows = new Set(parsed.reports.map((r) => r.id))
    if (!parsed.attempts.every((a) => a.endedByReportId === null || rows.has(a.endedByReportId))) {
      return null
    }
    // AND NO RUN HAPPENS IN THE FUTURE. Both doors into a run already refuse
    // this — `AttemptStart` and `PastRun` put `max={today}` on their date
    // inputs — and the import did not, so a hand-edited or corrupted file was
    // the one way in. Driven on 2026-09-26: a file with `startedOn: "2099-01-01"`
    // was accepted, and the chart then positioned a lane label at
    // `right: calc(-1300% + 14px)` — 1300% outside its own container, because
    // every width on that chart is a fraction of a span that now runs to the
    // next century.
    //
    // A rule enforced at one door and not the other is the same fault as
    // `revivalClashes` above, which refused two live runs on the way in and
    // allowed them on the way back.
    if (!parsed.attempts.every((a) => a.startedOn <= today && (a.endedOn === null || a.endedOn <= today))) {
      return null
    }
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
  // A RUN CANNOT END BEFORE IT STARTS. `PastRun` computes exactly this as
  // `ordered` and will not submit without it; the import accepted it, and the
  // record then held a run of negative length that `runLanes` clamps to one day
  // — so the screen showed "1 day ·" with no ending and the impossible row sat
  // there permanently. Checked here rather than in `importRecord` because it
  // needs no clock: it is a fact about the two dates on this row.
  if (a.endedOn !== null && a.endedOn < a.startedOn) return false
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
