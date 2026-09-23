/**
 * WHAT THE BLACK BOX ADDS UP TO.
 *
 * Pure: a record and a day go in, numbers come out. No clock, no storage, no
 * React. The day is a parameter because a function that asks what day it is
 * cannot be tested against the interesting cases — a run that ends today, a run
 * that started today, a record with nothing in it.
 *
 * Nothing in here is ever stored. Every number on the screen is computed from
 * the two flat lists on read, so there is no second copy to fall out of date.
 */

import type {
  BlackBoxRecord,
  BlackBoxStats,
  RunLane,
  ThoughtAnswer,
  ThoughtCost,
  ViceAttempt,
  ViceEndingId,
} from "./types"
import { ENDING_FAMILIES, familyFor } from "./data/blackbox"

/**
 * Whole days between two calendar days.
 *
 * Both sides are parsed as UTC midnight from their own Y-M-D fields, so the
 * difference is a count of calendar days and no timezone can shift it. Parsing
 * `new Date("2024-03-31")` and subtracting would give the same answer here, but
 * only because both sides shift together; doing it explicitly means a reader
 * does not have to know that.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const at = (iso: string): number => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
  }
  return Math.round((at(toISO) - at(fromISO)) / 86400000)
}

/** The run still going, or null. There is at most one per vice. */
export function currentAttempt(record: BlackBoxRecord): ViceAttempt | null {
  return record.attempts.find((a) => a.endedOn === null) ?? null
}

// ---------------------------------------------------------------- one vice

/**
 * ONE RECORD, SEVERAL THINGS BEING QUIT — AND THE SCREEN SHOWS ONE AT A TIME.
 *
 * `ViceAttempt.viceId` has carried the vice since day one, and every read in
 * this file used to ignore it. Everything above answered for the whole record
 * and every screen named it with `viceLabelOf`, which is the MOST RECENT run's
 * vice — so a record holding a 100-day run off smoking and a live one off porn
 * rendered "Lit is time without porn" over both bars, added them into "Across
 * every run: 215 days", and ranked the smoking run's ending in a cost list
 * headed by the other vice. Nothing on the screen said they were different
 * things, including the per-run detail.
 *
 * The fix is a filter rather than a second record: attempts of one vice, plus
 * only the reports filed against them. Every function above then answers for
 * that vice without knowing the concept exists, which is why `stats`,
 * `runLanes`, `thoughtCosts`, `answerFor` and `chartSpan` are untouched.
 */
export function forVice(record: BlackBoxRecord, viceId: string | null): BlackBoxRecord {
  // TOMBSTONES ARE DROPPED HERE, FOR EVERY SCREEN AT ONCE.
  //
  // A removal is a row with `deletedAt` set, not a gap, so that a device which
  // was offline when it happened learns about it rather than helpfully putting
  // the row back. That is right for the record and wrong for every number on
  // the page: a removed run left in would still be drawn, still counted in
  // "Across every run", and still ranked in the cost list.
  //
  // One place decides it, and it is this one, because `forVice` is what the
  // page computes everything from. `vicesOn` below is the only other read of
  // the raw record and filters the same way; `tests/unit/vice/` asserts that no
  // read surface returns a removed row.
  const attempts = record.attempts.filter(
    (a) => a.deletedAt === null && (viceId === null || a.viceId === viceId),
  )
  const ids = new Set(attempts.map((a) => a.id))
  return {
    ...record,
    attempts,
    reports: record.reports.filter((r) => r.deletedAt === null && ids.has(r.attemptId)),
  }
}

/** One vice on this record, and what it holds. */
export interface ViceOnRecord {
  viceId: string
  /** The person's own catalogue words for it, from its most recent run. */
  label: string
  runs: number
  /** Whether a run off this one is still going. */
  live: boolean
  /** The most recent start, which is what the list is ordered by. */
  lastStartedOn: string
}

/**
 * Which things this record is about, most recently started first.
 *
 * The label is taken from the newest run rather than the oldest, so renaming a
 * custom vice on the next run renames it everywhere rather than leaving the
 * switcher on a name the person has stopped using.
 */
export function vicesOn(record: BlackBoxRecord): ViceOnRecord[] {
  const by = new Map<string, ViceOnRecord>()
  const alive = record.attempts.filter((a) => a.deletedAt === null)
  for (const a of [...alive].sort((x, y) => x.startedOn.localeCompare(y.startedOn))) {
    const seen = by.get(a.viceId)
    by.set(a.viceId, {
      viceId: a.viceId,
      label: a.label,
      runs: (seen?.runs ?? 0) + 1,
      live: (seen?.live ?? false) || a.endedOn === null,
      lastStartedOn: a.startedOn,
    })
  }
  return [...by.values()].sort((a, b) => b.lastStartedOn.localeCompare(a.lastStartedOn))
}

/**
 * What this record is about, for every screen that names it.
 *
 * The most recently STARTED run, alive or not — one owner, so the header, the
 * chart and the remembered-run form cannot disagree. Two things went wrong
 * without it: the header read the LIVE run only, so a record whose runs had all
 * ended named no vice anywhere; and the chart said "Lit is not smoking" under a
 * header that said "Betting", for eight of the nine vices on offer.
 */
export function latestAttempt(record: BlackBoxRecord): ViceAttempt | null {
  return [...record.attempts].sort((a, b) => a.startedOn.localeCompare(b.startedOn)).pop() ?? null
}

export function viceLabelOf(record: BlackBoxRecord): string | null {
  return latestAttempt(record)?.label ?? null
}

/**
 * How long a run lasted, counting both the first day and the last.
 *
 * INCLUSIVE ON BOTH ENDS, WHETHER OR NOT THE RUN IS STILL ALIVE, and the two
 * must match. The first version counted a live run inclusively and an ended run
 * exclusively, which looked like a rounding choice and was not: the total clean
 * days across the record DROPPED BY ONE at the moment a run ended. A number
 * that ticks down when you lapse is the small betrayal the whole "nothing ever
 * resets" rule exists to prevent, and a test caught it rather than a reading.
 *
 * So a run that started and ended the same day is 1 day, and a run started
 * four days ago is on day 5 today — which is also how people say it.
 */
export function runDays(attempt: ViceAttempt, today: string): number {
  const end = attempt.endedOn ?? today
  return Math.max(1, daysBetween(attempt.startedOn, end) + 1)
}

/** One row per run, oldest first, so the chart reads downwards like a timeline. */
export function runLanes(record: BlackBoxRecord, today: string): RunLane[] {
  return [...record.attempts]
    .sort((a, b) => a.startedOn.localeCompare(b.startedOn))
    .map((attempt) => {
      const ended = record.reports.find((r) => r.id === attempt.endedByReportId) ?? null
      return {
        attempt,
        days: runDays(attempt, today),
        closeCallDays: record.reports
          .filter((r) => r.attemptId === attempt.id && !r.wentThrough)
          .map((r) => r.at.slice(0, 10))
          .sort(),
        ending: ended ? ended.ending : null,
        live: attempt.endedOn === null,
      }
    })
}

/**
 * The three numbers at the top.
 *
 * `totalCleanDays` sums every run, including the ones that ended. That is the
 * arithmetic version of the rule that nothing ever resets: a run ending removes
 * nothing from the record, because the days happened.
 */
export function stats(record: BlackBoxRecord, today: string): BlackBoxStats {
  const lanes = runLanes(record, today)
  const live = lanes.find((l) => l.live) ?? null
  return {
    longestDays: lanes.reduce((max, l) => Math.max(max, l.days), 0),
    totalCleanDays: lanes.reduce((sum, l) => sum + l.days, 0),
    currentDays: live ? live.days : null,
    runs: lanes.length,
    closeCallsSurvived: record.reports.filter((r) => !r.wentThrough).length,
  }
}

/**
 * What each thought has cost, ranked by the clean time it ended.
 *
 * Ranked by cost rather than by frequency, which is the one idea worth taking
 * from a trading journal: the mistake you make most often is rarely the mistake
 * that costs you most, and ranking by count hides that completely.
 *
 * Grouped by FAMILY rather than by the text somebody typed. Matching free text
 * would mean guessing that two sentences are the same thought, and a wrong
 * guess here invents a pattern in somebody's own history — so the person picks
 * the family and their own words ride along as the label.
 */
export function thoughtCosts(record: BlackBoxRecord, today: string): ThoughtCost[] {
  const lanes = runLanes(record, today)
  const rows: ThoughtCost[] = []

  for (const family of ENDING_FAMILIES) {
    const filed = record.reports.filter((r) => r.ending === family.id)
    if (filed.length === 0) continue

    const endedLanes = lanes.filter((l) => l.ending === family.id)
    const latestOwnWords = [...filed]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((r) => r.thought.trim())
      .find((t) => t.length > 0)

    rows.push({
      ending: family.id,
      label: family.label,
      ownWords: latestOwnWords ?? "",
      runsEnded: endedLanes.length,
      daysEnded: endedLanes.reduce((sum, l) => sum + l.days, 0),
      survived: filed.filter((r) => !r.wentThrough).length,
    })
  }

  return rows.sort((a, b) => b.daysEnded - a.daysEnded || b.runsEnded - a.runsEnded)
}

/**
 * The answer the "I'm having a thought" door gives back.
 *
 * `empty` is a real state and is reported rather than papered over. With
 * nothing filed, the honest output is "this is the first time you have written
 * this down" — a screen that manufactures a pattern from one data point teaches
 * somebody to distrust every number it shows them afterwards.
 */
export function answerFor(record: BlackBoxRecord, ending: ViceEndingId, today: string): ThoughtAnswer {
  const family = familyFor(ending)
  const history = record.reports
    .filter((r) => r.ending === ending)
    .sort((a, b) => b.at.localeCompare(a.at))
  const endedLanes = runLanes(record, today).filter((l) => l.ending === ending)

  return {
    ending,
    label: family.label,
    history,
    runsEnded: endedLanes.length,
    daysEnded: endedLanes.reduce((sum, l) => sum + l.days, 0),
    survived: history.filter((r) => !r.wentThrough).length,
    empty: history.length === 0,
  }
}

// ---------------------------------------------------------------- the chart

/** One run positioned on a shared calendar axis, as percentages of the whole span. */
export interface LaneGeometry {
  lane: RunLane
  /** Left edge, 0–100. */
  left: number
  /** Width, 0–100, never so small the run is invisible. */
  width: number
  /** Whether the label has to sit on the left of the bar to stay inside. */
  flip: boolean
  /**
   * Where each close call goes, 0–100 on the same axis as the bar.
   *
   * One entry per close call, at the day it was actually filed. They are
   * deliberately NOT spread evenly: two dots landing on the same pixel is a
   * fortnight when it kept coming back, and that is the thing worth seeing.
   */
  dots: number[]
}

/**
 * Where every bar goes.
 *
 * `minWidth` and `flipAfter` are parameters rather than constants because they
 * are properties of the space the chart is drawn in, not of the data. The first
 * version hard-coded a flip at 62% and the label ran off the edge the moment the
 * chart was narrower than a laptop.
 */
export function laneGeometry(
  lanes: RunLane[],
  span: { from: string; to: string },
  today: string,
  options: { minWidth?: number; flipAfter?: number } = {},
): LaneGeometry[] {
  const minWidth = options.minWidth ?? 1.1
  const flipAfter = options.flipAfter ?? 62
  const total = Math.max(1, daysBetween(span.from, span.to))
  const pct = (iso: string): number => (daysBetween(span.from, iso) / total) * 100

  return lanes.map((lane) => {
    const left = Math.max(0, pct(lane.attempt.startedOn))
    const rawRight = pct(lane.attempt.endedOn ?? today)
    const width = Math.max(minWidth, Math.min(100 - left, rawRight - left))
    // Held inside its own bar rather than dropped. A close call belongs to the
    // run it was filed against, so a date outside the run's span is bad data,
    // not a reason to make somebody's dot disappear without saying so.
    const dots = lane.closeCallDays.map((day) => Math.min(left + width, Math.max(left, pct(day))))
    return { lane, left, width, flip: left + width > flipAfter, dots }
  })
}

/**
 * The span the chart covers: the first run to today, padded so nothing touches
 * the edge. Returns null when there is nothing to draw.
 */
export function chartSpan(record: BlackBoxRecord, today: string): { from: string; to: string } | null {
  if (record.attempts.length === 0) return null
  const first = record.attempts.reduce((min, a) => (a.startedOn < min ? a.startedOn : min), record.attempts[0].startedOn)
  const last = record.attempts.reduce((max, a) => {
    const end = a.endedOn ?? today
    return end > max ? end : max
  }, today)
  return { from: addDays(first, -14), to: addDays(last, 14) }
}

/** Shift a calendar day, in UTC so no offset can move it. */
export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const at = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + delta))
  return at.toISOString().slice(0, 10)
}
