/**
 * One ladder, one rep a day.
 *
 * This replaced a nine-stage setup wizard that asked for about twenty-five
 * written answers before the user did anything. For a person whose problem is
 * not acting, that is a form, and finishing a form while changing nothing is the
 * exact failure the research names.
 *
 * The current rung is **stored, not derived**. Deriving it from the rep count
 * was tidier but made the ladder a one-way conveyor: nobody could enter at the
 * rung that matched where they already were, and nobody could step back down
 * from one that turned out to be too much. Both of those are ordinary, and a
 * design that treats them as impossible is a design that loses the user who is
 * already halfway up, and the one having a bad fortnight.
 *
 * Everything here is pure and date-injected — the caller passes today's date,
 * nothing reads the clock — so behaviour is reproducible and testable.
 */

import {
  CUSTOM_MAX_RUNGS,
  CUSTOM_MIN_RUNGS,
  CUSTOM_RELEASE,
  LADDER_BY_ID,
  REPS_TO_ADVANCE,
  REP_TIMELINE,
  type Ladder,
  type LadderId,
  type LadderRung,
} from "@/src/goals/data/repLadders"

export const REP_SCHEMA_VERSION = 2

// ------------------------------------------------------------------- types

export type RepOutcome = "did" | "missed"

export interface RepEntry {
  /** ISO date, YYYY-MM-DD. One entry per day at most. */
  date: string
  outcome: RepOutcome
  /** Which rung it happened on, so history stays truthful after adjustments. */
  rung: number
}

export interface RepRun {
  v: number
  ladder: LadderId | null
  /** Present only when `ladder` is "custom". The user's own rungs. */
  custom: Ladder | null
  /** 1–7. Any number, because a week is not made of preset shapes. */
  daysPerWeek: number
  startedOn: string
  /** Current rung. Stored so it can be entered at, and moved, deliberately. */
  rung: number
  /** Clean reps banked at the current rung. Reset by a manual move. */
  repsAtRung: number
  entries: RepEntry[]
  /** The letter, written after the first success and read on the second miss. */
  letter: string
  updatedAt: string
}

export interface RungState {
  index: number
  rung: LadderRung
  total: number
  done: number
  toAdvance: number
  isFirst: boolean
  isLast: boolean
}

export interface RunStatus {
  started: boolean
  dayNumber: number
  totalDone: number
  missStreak: number
  loggedToday: RepOutcome | null
  timelineNote: string
  letterDue: boolean
  showLetter: boolean
  /** True on the rep that just earned a promotion, so the UI can say so. */
  justPromoted: boolean
}

// ----------------------------------------------------------------- helpers

function nowIso(): string {
  return new Date().toISOString()
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Whole days between two ISO dates. Date-only, so DST cannot shift it. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

export function emptyRun(now = nowIso()): RepRun {
  return {
    v: REP_SCHEMA_VERSION,
    ladder: null,
    custom: null,
    daysPerWeek: 3,
    startedOn: "",
    rung: 0,
    repsAtRung: 0,
    entries: [],
    letter: "",
    updatedAt: now,
  }
}

// ----------------------------------------------------------------- storage

export function serializeRun(run: RepRun): string {
  return JSON.stringify(run)
}

/**
 * Load, or null when there is nothing usable. Fails closed rather than
 * repairing: a half-understood run quietly "fixed" is worse than a fresh one,
 * because the user cannot see what was dropped.
 */
export function loadRun(raw: string | null): RepRun | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const r = parsed as Partial<RepRun>
  if (r.v !== REP_SCHEMA_VERSION) return null
  const base = emptyRun(typeof r.updatedAt === "string" ? r.updatedAt : nowIso())
  return {
    ...base,
    ...r,
    entries: Array.isArray(r.entries) ? r.entries.filter((e) => e && typeof e.date === "string") : [],
    custom: r.custom ?? null,
    v: REP_SCHEMA_VERSION,
  }
}

// ------------------------------------------------------------------- setup

export function buildCustomLadder(label: string, rungs: { action: string; counts: string }[]): Ladder {
  const cleaned = rungs
    .map((r) => ({ action: r.action.trim(), counts: r.counts.trim() }))
    .filter((r) => r.action.length > 0)
    .slice(0, CUSTOM_MAX_RUNGS)
  return {
    id: "custom",
    label: label.trim() || "My own thing",
    group: "Work",
    aim: "The thing you said you were going to do.",
    rungs: cleaned.map((r) => ({
      action: r.action,
      counts: r.counts || "You did the thing above.",
      release: CUSTOM_RELEASE,
    })),
  }
}

export function customIsUsable(ladder: Ladder | null): boolean {
  return Boolean(ladder && ladder.rungs.length >= CUSTOM_MIN_RUNGS)
}

/**
 * Setup, in one call: which ladder, where on it you already are, and how often.
 *
 * `startRung` is the point of this. Someone who already trains four times a week
 * should not be told to put their training clothes on, and being handed a rung
 * they have obviously outgrown is how a tool loses them in the first minute.
 */
export function startRun(
  run: RepRun,
  ladder: LadderId,
  startRung: number,
  daysPerWeek: number,
  today: string,
  custom: Ladder | null = null,
  now = nowIso(),
): RepRun {
  const resolved = ladder === "custom" ? custom : LADDER_BY_ID[ladder] ?? null
  const top = resolved ? resolved.rungs.length - 1 : 0
  return {
    ...run,
    ladder,
    custom: ladder === "custom" ? custom : null,
    daysPerWeek: clamp(Math.round(daysPerWeek), 1, 7),
    startedOn: today.slice(0, 10),
    rung: clamp(Math.round(startRung), 0, top),
    repsAtRung: 0,
    updatedAt: now,
  }
}

export function ladderOf(run: RepRun): Ladder | null {
  if (!run.ladder) return null
  if (run.ladder === "custom") return run.custom
  return LADDER_BY_ID[run.ladder] ?? null
}

// -------------------------------------------------------------- the ladder

export function rungState(run: RepRun): RungState | null {
  const ladder = ladderOf(run)
  if (!ladder || ladder.rungs.length === 0) return null
  const index = clamp(run.rung, 0, ladder.rungs.length - 1)
  const isLast = index >= ladder.rungs.length - 1
  return {
    index,
    rung: ladder.rungs[index],
    total: ladder.rungs.length,
    done: run.repsAtRung,
    toAdvance: isLast ? 0 : Math.max(0, REPS_TO_ADVANCE - run.repsAtRung),
    isFirst: index === 0,
    isLast,
  }
}

/**
 * Move by hand, in either direction.
 *
 * Stepping down is not a demotion and is not recorded as one — a rung that turns
 * out to be too much on a bad week is information about the rung, not about the
 * person. The banked reps reset because they were earned somewhere else.
 */
export function adjustRung(run: RepRun, delta: number, now = nowIso()): RepRun {
  const ladder = ladderOf(run)
  if (!ladder) return run
  const next = clamp(run.rung + delta, 0, ladder.rungs.length - 1)
  if (next === run.rung) return run
  return { ...run, rung: next, repsAtRung: 0, updatedAt: now }
}

export function setCadence(run: RepRun, daysPerWeek: number, now = nowIso()): RepRun {
  return { ...run, daysPerWeek: clamp(Math.round(daysPerWeek), 1, 7), updatedAt: now }
}

// -------------------------------------------------------------- logging

export function entryFor(run: RepRun, date: string): RepEntry | undefined {
  const d = date.slice(0, 10)
  return run.entries.find((e) => e.date === d)
}

/**
 * Log today. Re-logging the same day replaces it rather than adding a second
 * entry, and rolls back the rep it banked, so a mis-tap cannot inflate progress
 * or push someone up a rung they did not earn.
 */
export function logRep(run: RepRun, date: string, outcome: RepOutcome, now = nowIso()): RepRun {
  const ladder = ladderOf(run)
  if (!ladder) return run
  const d = date.slice(0, 10)
  const previous = entryFor(run, d)

  let rung = run.rung
  let reps = run.repsAtRung

  // Undo whatever the previous entry for this day banked.
  if (previous?.outcome === "did") reps = Math.max(0, reps - 1)

  if (outcome === "did") {
    reps += 1
    if (reps >= REPS_TO_ADVANCE && rung < ladder.rungs.length - 1) {
      rung += 1
      reps = 0
    }
  }

  const entry: RepEntry = { date: d, outcome, rung: run.rung }
  const entries = [...run.entries.filter((e) => e.date !== d), entry].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  )
  return { ...run, entries, rung, repsAtRung: reps, updatedAt: now }
}

export function setLetter(run: RepRun, letter: string, now = nowIso()): RepRun {
  return { ...run, letter, updatedAt: now }
}

// --------------------------------------------------------------- status

function timelineNoteFor(dayNumber: number): string {
  let note = REP_TIMELINE[0].note
  for (const t of REP_TIMELINE) if (dayNumber >= t.fromDay) note = t.note
  return note
}

/**
 * Consecutive misses counting back from the latest entry. Days with no entry are
 * not misses: not opening the app is not the same as deciding not to go, and
 * treating silence as failure is how a tracker becomes a source of guilt.
 */
export function missStreak(run: RepRun): number {
  let n = 0
  for (let i = run.entries.length - 1; i >= 0; i--) {
    if (run.entries[i].outcome === "missed") n += 1
    else break
  }
  return n
}

export function statusOf(run: RepRun, today: string): RunStatus {
  const started = Boolean(run.ladder && run.startedOn)
  const dayNumber = started ? daysBetween(run.startedOn, today) + 1 : 0
  const totalDone = run.entries.filter((e) => e.outcome === "did").length
  const misses = missStreak(run)
  const todays = entryFor(run, today)
  return {
    started,
    dayNumber,
    totalDone,
    missStreak: misses,
    loggedToday: todays?.outcome ?? null,
    timelineNote: timelineNoteFor(dayNumber),
    letterDue: totalDone >= 1 && run.letter.trim().length === 0,
    showLetter: misses >= 2 && run.letter.trim().length > 0,
    // The rep that promoted you logged at the rung below the one you're on now.
    justPromoted: Boolean(todays && todays.outcome === "did" && todays.rung < run.rung),
  }
}

export function missMessage(streak: number): string | null {
  if (streak <= 0) return null
  if (streak === 1) {
    return "One missed day is weather. Nothing resets, and the rung stays where it was."
  }
  return "That's two in a row, which is the one that actually ends things. Same rung tomorrow, and read what you wrote."
}

/** Recent history for the strip, oldest first, one slot per day. */
export function recentDays(run: RepRun, today: string, span = 14): { date: string; outcome: RepOutcome | null }[] {
  const out: { date: string; outcome: RepOutcome | null }[] = []
  const end = Date.parse(`${today.slice(0, 10)}T00:00:00Z`)
  for (let i = span - 1; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10)
    out.push({ date, outcome: entryFor(run, date)?.outcome ?? null })
  }
  return out
}

/** Reps done in the last seven days, against what they said was realistic. */
export function weekPace(run: RepRun, today: string): { done: number; target: number } {
  const done = recentDays(run, today, 7).filter((d) => d.outcome === "did").length
  return { done, target: run.daysPerWeek }
}
