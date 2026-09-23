/**
 * Programs progression ENGINE — pure, no I/O, unit-tested.
 *
 * Two public operations:
 *   - computePrescription(program, enrollment) → today's session (read).
 *   - applyLog(program, enrollment, log)        → next enrollment state + changes.
 *
 * Plus calibration helpers (1RM estimate, training-max, plate rounding, units).
 *
 * M1 implements the LOAD metric type only. Any other metric type throws an
 * explicit error — no silent fallback (CLAUDE.md §3 / §15).
 */

import {
  DEFAULT_SESSION_TYPE,
  DEFAULT_PLATES,
  FREE_PRECISION,
  LOAD_TOLERANCE,
  PLATES,
  REST_SECONDS,
  WEEKDAY_SHORT,
} from "./config"
import { libraryByName } from "./data/exerciseLibrary"
import { CUSTOM_PROGRAM_ID } from "./data/customProgram"
import { enrollmentName } from "./data/catalog"
import { readReturn } from "@/src/shared/returnTo"
import { typedNumber } from "@/src/shared/typedNumber"
/**
 * The wire bounds, imported rather than restated: the row's refusal and the
 * server's must be the same numbers or the row is a decoration.
 */
import { SET_LIMITS } from "./schemas"
import type {
  AlsoRunning,
  TrainingDoorFacts,
  LiftProgress,
  PlateLoad,
  TrainingCardState,
  ApplyLogResult,
  DayTemplate,
  EnduranceBlock,
  EnduranceSet,
  EnrollmentCursor,
  ExerciseState,
  LoadExercise,
  LoadJudgement,
  LoadPoint,
  LoggedExercise,
  LoggedSet,
  PlateSetup,
  ProgramSchedule,
  ReplayEvent,
  StoredSet,
  WorkoutAdjustments,
  LiveWorkoutSet,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramsLocation,
  MissRule,
  MissOutcome,
  WeekSoFar,
  ProgramSessionLogInput,
  PrescribedExercise,
  PrescribedSet,
  ProgressionChange,
  LiftRow,
  SessionPrescription,
  SetEntry,
  SetEntryProblem,
  UnitSystem,
} from "./types"
import { clampCursorDay, effectiveProgram, scheduleDays, scheduleDaysOrNone } from "./customize"

// ============================================================================
// Units, rounding, 1RM
// ============================================================================

/**
 * Re-exported, not reimplemented. `src/shared/weight.ts` is the one owner of the
 * conversion — this slice and the health slice each had their own, with
 * constants that disagreed in the sixth decimal. Kept exported from here so the
 * nineteen existing call sites did not all have to move in one commit.
 */
import { toKg, fromKg, MAX_WEIGHT_KG } from "@/src/shared/weight"
import {
  getTodayInTimezone,
  isoWeekdayInTimezone,
  periodStartInTimezone,
} from "@/src/shared/dateUtils"
export { toKg, fromKg, MAX_WEIGHT_KG }

/**
 * WHICH UNIT TO SHOW, decided once.
 *
 * Two places decided this and they disagreed. `TrainingScreen.tsx` read the
 * running enrollment and fell back to kilograms — so a lifter who trains in
 * pounds and has no program running read their whole history converted, with no
 * warning and no way to say otherwise. `unitFor` in `workoutRepo.ts` read the
 * account instead. Same question, two answers.
 *
 * `null` means NOT KNOWN YET, and callers must show that rather than picking
 * one. That is the whole point: kilograms is a real answer for somebody who
 * trains in kilograms, and a lie for everybody else.
 */
export function unitForDisplay(
  enrollmentUnit: UnitSystem | null | undefined,
  accountUnit: UnitSystem | null | undefined
): UnitSystem | null {
  return enrollmentUnit ?? accountUnit ?? null
}

/**
 * Round to a weight that can actually be loaded.
 *
 * BARBELL (the default, and what every catalog program gets): floored at the
 * bar, because you cannot squat 15 kg on a 20 kg bar.
 *
 * FREE (dumbbells, cables, machines, bodyweight): no floor. The bar minimum
 * applied to everything used to turn a 6 kg lateral raise into a 20 kg one and
 * a bodyweight push-up into 20 kg of nothing. It rarely showed while the only
 * lifts in the app were a catalog of barbell programs; a self-designed week is
 * mostly accessories, and it showed immediately.
 */
export function roundToLoadable(
  weight: number,
  unit: UnitSystem,
  style: "barbell" | "free" | "bodyweight" = "barbell",
  setup?: PlateSetup,
  /**
   * "down" never asks for more than intended — which is what a PRESCRIPTION
   * needs, and what Wendler says to do with a percentage. "nearest" is for a
   * number somebody typed, where the intent is the number itself.
   */
  mode: "nearest" | "down" = "nearest"
): number {
  if (style === "free" || style === "bodyweight") {
    // Rounded to a number a person would write down, and allowed all the way
    // to nothing. It used to be snapped to the BARBELL's 2.5 kg step, which
    // turned a 6 kg dumbbell into 5 and a 12 kg one into 12.5, and made a 1 kg
    // increment move nothing while the app said "+1 kg". We do not know what a
    // given gym's dumbbells or cable stack go up in, so the increment decides
    // the step and this only keeps the number sane.
    const precision = FREE_PRECISION[unit]
    const steps = mode === "down" ? Math.floor(weight / precision) : Math.round(weight / precision)
    return Math.max(0, round2(steps * precision))
  }
  const plates = setup ?? DEFAULT_PLATES[unit]
  const step = plates.smallestPlate * 2
  if (weight <= plates.barWeight) return plates.barWeight
  // Measured from the BAR, not from zero: with a 15 kg bar and 1.25 kg plates
  // the loadable weights are 15, 17.5, 20 — not the multiples of 2.5 that
  // rounding the absolute number would give.
  const steps = (weight - plates.barWeight) / step
  const rounded = plates.barWeight + (mode === "down" ? Math.floor(steps + 1e-9) : Math.round(steps)) * step
  return Math.max(plates.barWeight, round2(rounded))
}

/**
 * How a lift is loaded — declared by the author, or DERIVED from the library.
 *
 * IT USED TO DEFAULT TO BARBELL FOR EVERYTHING. Fourteen lifts across the
 * catalogue — every lat pulldown, leg press, cable fly, lateral raise — were
 * therefore floored at the 20 kg bar and told the lifter "just the bar", which
 * is both a weight they cannot use and, once at the floor, one they can never
 * move off. Hand-writing `loadStyle` on every row would be a hundred chances to
 * file a lift wrongly; the library already knows which lifts have a bar under
 * them, so it is asked. An explicit value still wins, for the lifts the library
 * has never heard of.
 */
export function loadStyleOf(
  ex: Pick<LoadExercise, "name" | "loadStyle">
): "barbell" | "free" | "bodyweight" {
  if (ex.loadStyle) return ex.loadStyle
  const lib = libraryByName(ex.name)
  if (!lib) return "barbell"
  return lib.barbell ? "barbell" : "free"
}

/**
 * Whether this schedule runs on a calendar or in sequence.
 *
 * Deliberately all-or-nothing. A week where three days have weekdays and two do
 * not has no coherent answer to "what is today's session" on the days nobody
 * assigned, and every way of resolving it is a guess. `designProblems` reports
 * the half-assigned state so it is fixed rather than interpreted.
 *
 * Lives here, with the engine, because it decides what gets prescribed. It was
 * in `builder.ts` next to the editor that sets the weekdays, which is where you
 * look to change one, not where you look to find out what today is.
 */
export function isWeekdayAnchored(schedule: ProgramSchedule): boolean {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return false
  return schedule.days.length > 0 && schedule.days.every((d) => d.weekday != null)
}

/**
 * WHAT THIS WEEK LOOKS LIKE, ON THE ACCOUNT'S OWN CALENDAR.
 *
 * THE BUG THIS REPLACES. The week strip worked out today's weekday from the
 * phone's clock (`isoWeekday(new Date())`) and which days had been trained
 * from the phone's zone, while the server decided which session was due from
 * the account's zone. Two answers to "what day is it" on one screen, and on a
 * phone whose zone differs from the account's they disagree: the strip lit
 * Wednesday while the card prescribed Tuesday's session.
 *
 * The answer belongs to whoever owns the account's clock, so it is computed on
 * the server and handed down. This function is the pure half so it can be
 * tested at a fixed instant in two zones — the class of bug it fixes is
 * invisible to any test that runs in one.
 *
 * "This week" is Monday-based, like every other period in the app.
 */
export function weekSoFar(
  logs: { logged_at: string }[],
  timezone: string,
  now: Date
): WeekSoFar {
  const weekStart = periodStartInTimezone("weekly", timezone, now)
  const trained = new Set<number>()
  for (const log of logs) {
    const at = new Date(log.logged_at)
    if (Number.isNaN(at.getTime())) continue
    // The DAY the session was filed under where the person is — not the UTC
    // date, which moves a late-evening session east of London into tomorrow.
    if (getTodayInTimezone(timezone, at) < weekStart) continue
    trained.add(isoWeekdayInTimezone(timezone, at))
  }
  const todayWeekday = isoWeekdayInTimezone(timezone, now)
  return {
    timezone,
    weekStartedOn: weekStart,
    todayWeekday,
    trainedWeekdays: [...trained].sort((a, b) => a - b),
    // Derived HERE so that nothing downstream derives it a second time from
    // the phone's idea of which weekday today is.
    trainedToday: trained.has(todayWeekday),
  }
}

/**
 * THE WEEKDAY AN INSTANT FELL ON, where the person is.
 *
 * "Finish or discard Monday's workout" has to say the day the lifter thinks
 * it was. `toLocaleDateString(undefined, { weekday: "long" })` reads the
 * PHONE's zone, so a workout started 23:30 Monday in Copenhagen was offered
 * as Tuesday's to a phone still on UTC.
 *
 * Both cards need this — the Tracking door and the session card — which is
 * why it is here rather than private to one of them.
 */
export function weekdayNameIn(iso: string, timezone: string): string {
  return WEEKDAY_SHORT[isoWeekdayInTimezone(timezone, new Date(iso))]
}

/**
 * A `YYYY-MM-DD` printed for a person, without a zone anywhere near it.
 *
 * Every "started 3 Feb" and "last Fri" on these screens was
 * `new Date(instant).toLocaleDateString()` — the browser's zone applied to a
 * fact the server already decided, so the same session read as two different
 * days depending on where the phone was. A date-only string has nothing left
 * to convert, which is the whole point of passing one.
 */
export function formatDateOnly(iso: string, style: "weekday" | "short"): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  // Noon UTC: far enough from either midnight that no formatter's own zone
  // handling can move the date, which is the bug this function exists to stop.
  const at = new Date(Date.UTC(y, m - 1, d, 12))
  return at.toLocaleDateString(undefined, {
    timeZone: "UTC",
    ...(style === "weekday" ? { weekday: "short" } : { day: "numeric", month: "short" }),
  })
}

/**
 * IS THE WEEK IN THE BUILDER ALREADY RUNNING?
 *
 * The builder's "started" state was component state, so it returned to "idle"
 * the moment anything remounted it — and the design saved in the browser was
 * never marked as started at all. Come back the next day, press the armed
 * green Start again, and you have silently paused the copy you were three
 * weeks into and begun a fresh one from your typed weights.
 *
 * TWO WAYS TO MATCH, in order. The design records the enrollment it started,
 * which is exact. Failing that — a design saved before the id was recorded, or
 * one restored on another device — the week is compared STRUCTURALLY against
 * every running self-built program.
 *
 * Weights are deliberately not compared: after one session the enrollment's
 * weights have moved on, so any comparison including them would stop matching
 * exactly when it mattered most. Nor is `JSON.stringify` used — it would make
 * the answer depend on key order, which is luck, not equality.
 */
export function runningCopyOf(
  design: { enrollmentId: string | null; schedule: ProgramSchedule },
  active: ProgramEnrollment[]
): ProgramEnrollment | null {
  if (design.enrollmentId) {
    const byId = active.find((e) => e.id === design.enrollmentId)
    if (byId) return byId
  }
  return (
    active.find(
      (e) => e.program_id === CUSTOM_PROGRAM_ID && e.customSchedule && sameWeek(e.customSchedule, design.schedule)
    ) ?? null
  )
}

/**
 * Two weeks are the same week when their days and lifts are, in order.
 *
 * Day ids, labels and weekday pins; each day's lifts by id, name and scheme.
 * Not the weights, and not the progression rules — a week you edited the
 * increment on is still the week you started.
 */
export function sameWeek(a: ProgramSchedule, b: ProgramSchedule): boolean {
  const left = scheduleDaysOrNone(a)
  const right = scheduleDaysOrNone(b)
  if (left.length === 0 || left.length !== right.length) return false

  return left.every((day, i) => {
    const other = right[i]
    if (day.id !== other.id || day.label !== other.label) return false
    if ((day as DayTemplate).weekday !== (other as DayTemplate).weekday) return false
    if (day.exercises.length !== other.exercises.length) return false
    return day.exercises.every((ex, j) => {
      const mine = other.exercises[j]
      if (ex.id !== mine.id || ex.name !== mine.name) return false
      return JSON.stringify(sortedScheme(ex)) === JSON.stringify(sortedScheme(mine))
    })
  })
}

/** A scheme with its keys in a fixed order, so equality is not key-order luck. */
function sortedScheme(exercise: unknown): unknown {
  const scheme = (exercise as { scheme?: Record<string, unknown> }).scheme
  if (!scheme) return null
  return Object.keys(scheme)
    .sort()
    .map((k) => [k, scheme[k]])
}

/**
 * ONE SENTENCE FOR "WHAT DOES YOUR TRAINING WEEK LOOK LIKE".
 *
 * Four places invented this from the plan's own copy of the program, and each
 * got it wrong in its own way. The worst was "2 days a week" for StrongLifts —
 * two day TEMPLATES, trained three times a week — and "1×/wk" for the
 * Recommended Routine, which has one template and is trained three times. The
 * number of named days is not the number of training days and never was.
 *
 * READ FROM THE ENROLLMENT'S OWN SCHEDULE, not from the catalogue's. Somebody
 * who swapped Bench for Dip on their copy of a program was still told they were
 * benching — the copies never heard about the swap.
 *
 * A per-week count is deliberately never given for a program worked through in
 * turn: there is no honest one. A/B alternating is three sessions one week and
 * two the next, and both are correct.
 */
export function describeTrainingWeek(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): string {
  const schedule = effectiveProgram(program, enrollment.customSchedule).schedule

  if (schedule.kind === "endurance_weeks") {
    const week = Math.max(1, enrollment.cursor.week)
    const total = schedule.weeks.length
    const sessions = schedule.weeks[week - 1]?.sessions.length ?? 0
    return `Week ${week} of ${total} · ${sessions} ${sessions === 1 ? "session" : "sessions"} this week`
  }

  const days = scheduleDaysOrNone(schedule)
  if (days.length === 0) return "No days set yet"

  if (isWeekdayAnchored(schedule)) {
    // `isWeekdayAnchored` is only true for the two kinds whose days carry a
    // weekday, and only when every one of them does — so the cast is what that
    // check has already established.
    const pinned = [...(days as DayTemplate[])].sort((a, b) => (a.weekday ?? 0) - (b.weekday ?? 0))
    // In WEEKDAY order, not schedule order: a week reads Monday first, whatever
    // order the days happened to be typed in.
    const names = pinned.map((d) => WEEKDAY_SHORT[d.weekday as number]).join(" · ")
    return `${names} — ${pinned.map((d) => d.label).join(" / ")}`
  }

  return `${days.map((d) => d.label).join(" · ")}, in turn`
}

/**
 * WHY SKIP IS NOT ALWAYS A THING YOU CAN DO.
 *
 * "Skip session" moves the program's cursor on one. That is meaningful for a
 * program you work through in order: skip leg day and tomorrow is push day
 * instead of leg day again.
 *
 * On a week pinned to weekdays it means nothing, because nothing reads the
 * cursor — `getTodaySession` picks the day by what day of the week it actually
 * is. So the button advanced a number nobody looks at, wrote a "skipped" mark
 * into the program's history, and the screen came back showing the same
 * session. Tap it three times and you have three phantom skips and no change.
 *
 * One function decides, so the button that offers it and the server that
 * performs it cannot disagree: a non-null answer is the reason, written as a
 * sentence to show, and also the refusal the server sends back.
 */
export function skipRefusal(schedule: ProgramSchedule): string | null {
  if (!isWeekdayAnchored(schedule)) return null
  return "This week runs by the calendar, so there is nothing to skip. Wednesday's session is Wednesday's whether or not you did it."
}

/**
 * WHAT RESET ACTUALLY DOES — one fact, and the words follow it.
 *
 * The button said "Your current weights go back to where you began. This
 * cannot be undone." It does not touch the weights. `resetEnrollment` rewinds
 * the cursor to cycle 1, week 1, day 1 and leaves `exercise_state` exactly as
 * it was, which is also what the replay does with a `reset` event.
 *
 * So somebody who had worked a squat from 60 to 110 was told, in a confirm box
 * with no way back, that the 110 was about to be destroyed. Either they cancel
 * a harmless action out of fear, or they accept and spend the next session
 * confused about why the weight is still 110.
 *
 * The effect is declared once here, the confirm text is derived from it, and
 * the repo writes this same object into the replay event — so if the product
 * ever decides reset should take the weights back too, `weights: true` changes
 * the database write, the replay and the words on the button together, and it
 * is impossible to change one without the others.
 */
export const RESET_EFFECT = { cursor: true, weights: false } as const

export function resetConfirmText(effect: { cursor: boolean; weights: boolean } = RESET_EFFECT): string {
  return effect.weights
    ? "Start again from week 1? Your weights go back to where you began. This cannot be undone."
    : "Start again from week 1? Your weights stay where they are — to start from your original weights, end this program and start it again."
}

/**
 * Names the session being skipped AND the one it moves to.
 *
 * "Skip session?" does not tell you what you end up doing tomorrow, which is
 * the only thing worth knowing before pressing it. Here rather than in a
 * component because two screens ask it now, and a second copy of a sentence
 * about what a write does is how the reset box came to promise a weight reset
 * that never happened.
 */
export function skipConfirmText(schedule: ProgramSchedule, dayIndex: number): string {
  const days = scheduleDaysOrNone(schedule)
  const here = days[dayIndex]
  const next = days.length > 0 ? days[(dayIndex + 1) % days.length] : undefined
  const moves = next && next !== here ? ` The program moves on to ${next.label}` : " The program moves on"
  return `Skip ${here ? here.label : "this session"}?${moves} as if today's session had happened. Your weights do not change.`
}

/** The day to do on a given ISO weekday, if this schedule is anchored. */
export function dayForWeekday(schedule: ProgramSchedule, weekday: number) {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return undefined
  return schedule.days.find((d) => d.weekday === weekday)
}

/**
 * Which day of an anchored week is today's, and whether today is a rest day.
 *
 * PURE, AND HERE, because it decides what a person is shown. It used to live in
 * `programRepo` — inside the database layer, reachable by no unit test and by
 * no integration test either (that harness runs raw SQL and never calls a repo
 * function), so the single rule that answers "am I training today" was the one
 * rule nobody could check. It also read the SERVER's clock; the weekday is now
 * an argument, so the caller has to say whose today it means.
 *
 * Returns null when the program is not on a calendar at all — StrongLifts is
 * A/B/A three times a week and its author never said which days — and the
 * caller then walks the cursor, which is the behaviour those programs have
 * always had.
 */
export function pickTodaysDay(
  schedule: ProgramSchedule,
  todayWeekday: number
): { dayIndex: number; restDay: boolean; scheduledWeekday?: number } | null {
  if (!isWeekdayAnchored(schedule)) return null
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return null
  const days = schedule.days

  const today = dayForWeekday(schedule, todayWeekday)
  // A REST DAY IS A REAL ANSWER. The next session is still resolved so the
  // screen can say what is coming, but it is flagged rather than served as
  // today's work — otherwise a three-day week silently becomes a seven-day one.
  const target =
    today ??
    [...days]
      .filter((d) => d.weekday != null)
      .sort(
        (a, b) => ((a.weekday! - todayWeekday + 7) % 7) - ((b.weekday! - todayWeekday + 7) % 7)
      )[0]
  if (!target) return null

  const dayIndex = days.findIndex((d) => d.id === target.id)
  if (dayIndex < 0) return null
  return {
    dayIndex,
    restDay: !today,
    ...(target.weekday != null ? { scheduledWeekday: target.weekday } : {}),
  }
}

/**
 * Is this day id actually part of this program?
 *
 * ONE OWNER, BECAUSE THE TWO SHAPES ANSWER DIFFERENTLY. A running plan is a
 * list of weeks each holding sessions; everything else is a list of days. Code
 * that reached for `scheduleDays()` to answer this THREW for a running plan
 * rather than saying no, so the check could not be written where it was needed.
 * Ask here instead, and an unknown day is refused the same way whatever kind of
 * program it is.
 */
export function isSessionOf(program: ProgramDefinition, dayId: string): boolean {
  const schedule = program.schedule
  if (schedule.kind === "endurance_weeks") {
    return schedule.weeks.some((w) => w.sessions.some((s) => s.id === dayId))
  }
  return scheduleDays(schedule).some((d) => d.id === dayId)
}

/**
 * What a logged lift did, measured against what it asked for.
 *
 * THE WEIGHT USED TO BE IGNORED IN BOTH DIRECTIONS. Only reps were compared, so
 * five sets of five at 60 kg when 80 was prescribed counted as a clean session
 * and earned +2.5 kg on a weight that had not been touched; and five sets at 85
 * when 80 was asked for ratcheted to 82.5, less than had just been demonstrated.
 *
 * Three outcomes, because "did you do it" has three honest answers and the old
 * boolean had two. Missing reps at the prescribed weight is the only one that
 * counts as a failure — training lighter on purpose is a decision, not a miss,
 * and deloading somebody for it (three sessions at 60 of 80 used to take 10%
 * off the 80) punishes the one person who was being sensible.
 *
 * ASSISTANCE LIFTS RUN THE OTHER WAY. On an assisted pull-up the machine takes
 * weight off you, so less of it is progress and "at least the prescribed
 * weight" is exactly backwards.
 */
export function judgeLoadEntry(
  prescribed: { sets: number; reps: number; weight: number },
  entry: LoggedExercise | undefined,
  opts: { direction?: "up" | "down"; tolerance?: number } = {}
): LoadJudgement {
  const tol = opts.tolerance ?? LOAD_TOLERANCE
  const down = opts.direction === "down"
  const done = entry?.sets ?? []

  const atWeight = (set: LoggedSet) =>
    down ? set.weight <= prescribed.weight + tol : set.weight >= prescribed.weight - tol
  const madeReps = done.filter((set) => set.reps >= prescribed.reps)
  const counted = madeReps.filter(atWeight)

  /**
   * The heaviest weight at which ALL the prescribed sets were made.
   *
   * Not the heaviest single set: four sets at 80 and a last one at 85 is a
   * session at 80 with one heavy single on the end. Sorting and taking the
   * n-th is the whole rule.
   */
  const achievedFrom = (sets: LoggedSet[]): number => {
    const weights = sets.map((set) => set.weight).sort((a, b) => (down ? a - b : b - a))
    return weights[prescribed.sets - 1] ?? prescribed.weight
  }

  if (counted.length >= prescribed.sets)
    return { verdict: "advance", achieved: achievedFrom(counted), setsDone: done.length }
  if (madeReps.length >= prescribed.sets)
    return { verdict: "hold_lighter", achieved: achievedFrom(madeReps), setsDone: done.length }

  /**
   * WHICH KIND OF SHORT, because they are not the same session and must not
   * read as the same sentence. Stopping after one good set because the gym
   * closed is not the same as grinding out five sets and missing reps on three
   * of them, and only one of them is "missed reps".
   */
  const shortOnReps = madeReps.length < done.length
  const shortOnSets = done.length < prescribed.sets
  return {
    verdict: "fail",
    achieved: prescribed.weight,
    setsDone: done.length,
    shortfall: shortOnReps && shortOnSets ? "both" : shortOnReps ? "reps" : "sets",
  }
}

/**
 * How long to rest after a set, and whether the number is ours or the author's.
 *
 * IT USED TO BE PICKED BY SET COUNT — four or more sets meant "compound" — so a
 * 3×5 squat got ninety seconds and 4×12 curls got three minutes, which is
 * exactly wrong in both directions. What decides rest is the LIFT.
 *
 * `ours` is returned rather than assumed because most of this catalogue's
 * authors never specified rest, and presenting our guess as their instruction
 * would be putting our numbers into somebody else's cited program. Where a
 * source does specify it (StrongLifts), the exercise carries `restSec` and this
 * says so.
 */
export function restSecondsFor(
  exercise: Pick<LoadExercise, "name" | "restSec" | "loadStyle">,
  opts: { setRestSec?: number; warmup?: boolean } = {}
): { seconds: number; ours: boolean } {
  if (opts.warmup) return { seconds: REST_SECONDS.warmup, ours: true }
  if (opts.setRestSec != null) return { seconds: opts.setRestSec, ours: false }
  if (exercise.restSec != null) return { seconds: exercise.restSec, ours: false }
  // A dip and a pull-up have no bar under them and still need three minutes, so
  // the question is whether the lift is COMPOUND, not whether it is barbell.
  const lib = libraryByName(exercise.name)
  const compound = lib ? lib.compound : (exercise.loadStyle ?? "barbell") === "barbell"
  return { seconds: compound ? REST_SECONDS.compound : REST_SECONDS.accessory, ours: true }
}

/**
 * WHAT THE REST CLOCK SHOULD COUNT DOWN FROM — the only answer.
 *
 * Three things can decide it and they have an order: what you edited on this
 * workout, then what the program's author asked for, then our own guess. The
 * screen used to ask `restSecondsFor({ name })` — dropping both of the first
 * two — so a program specifying three minutes got our ninety seconds, under a
 * caption reading "our suggestion".
 *
 * `edited` is separate from `ours` because they answer different questions:
 * `ours` means nobody but us chose this number, and `edited` means YOU did.
 */
export function restTargetFor(
  ex: Pick<PrescribedExercise, "exerciseId" | "name" | "restSec">,
  adjustments: { rest?: Record<string, number> } | null | undefined,
  opts: { warmup?: boolean } = {}
): { seconds: number; ours: boolean; edited: boolean } {
  const yours = adjustments?.rest?.[ex.exerciseId]
  // An edited rest beats the warm-up default too: you changed it on this lift,
  // on this workout, which is as specific as an instruction gets.
  if (yours != null) return { seconds: yours, ours: false, edited: true }
  const { seconds, ours } = restSecondsFor(
    { name: ex.name, restSec: ex.restSec },
    { warmup: opts.warmup }
  )
  return { seconds, ours, edited: false }
}

/**
 * The rest map with one lift changed, clamped to what a rest can be.
 *
 * Returns the WHOLE map rather than the one entry, because the write is a
 * whole-map PATCH: building it at the call site is how one lift's edit comes
 * to wipe another's.
 */
export function withRest(
  adjustments: { rest?: Record<string, number> } | null | undefined,
  exerciseId: string,
  seconds: number
): Record<string, number> {
  const clamped = Math.max(MIN_REST_SEC, Math.min(MAX_REST_SEC, Math.round(seconds)))
  return { ...(adjustments?.rest ?? {}), [exerciseId]: clamped }
}

/** Fifteen seconds is not a rest; ten minutes is a different workout. */
export const MIN_REST_SEC = 15
export const MAX_REST_SEC = 600

/**
 * WHICH ONE OF ITS PAIR A LIFT IS — A1, A2, B1, B2.
 *
 * The screen printed the lift's position in the WHOLE list, so the second
 * pair of a Push day read "B4" and "B5". A superset tag whose number is not
 * the number within the superset is worse than no tag: it reads as a set
 * count, or as a mistake.
 */
export function groupOrdinal(
  exercises: readonly { supersetGroup?: string }[],
  index: number
): number {
  const group = exercises[index]?.supersetGroup
  if (!group) return index + 1
  let n = 0
  for (let i = 0; i <= index; i++) if (exercises[i]?.supersetGroup === group) n++
  return n
}

/**
 * A SET ENTRY, READ ONCE — the one rule for whether the ✓ may fire.
 *
 * BLANK IS NOT ZERO, and this is where that is decided. `Number("")` is 0, so
 * an empty weight box on a bench press saved the set as 0 kg. The server
 * accepts 0 because 0 is legitimate — a pull-up with nothing added really is
 * zero — so nothing downstream could ever tell "unweighted" from "forgot to
 * type it", and the zero then hid inside every volume total and every personal
 * best.
 *
 * The conversion lives here WITH the check, rather than being two lines at the
 * call site, because the call site is where the 0 came from: a caller that
 * asks "is this ok?" and then does its own `Number(weight)` is one edit away
 * from the original bug. The row renders; it decides nothing.
 *
 * The bounds are the SERVER's bounds (`SET_LIMITS`), so this is never looser
 * than the request it is about to make. It is checked here as well because the
 * server's 400 arrives after the tick has gone green and the rest clock has
 * started.
 */
export function readSetEntry(entry: {
  weight: string
  reps: string
  /** No weight box at all — a plank, a bodyweight squat. 0 is the truth. */
  bodyweight?: boolean
  /** Has a weight box, and an empty one means "just me": a pull-up, a dip. */
  unweightedOk?: boolean
}): SetEntry {
  const weight = typedNumber(entry.weight)
  const reps = typedNumber(entry.reps)
  const weightRequired = !entry.bodyweight && !entry.unweightedOk

  /**
   * A NUMBER THAT CANNOT BE STORED IS NAMED FIRST, even when the other box is
   * still empty. A missing number needs no sentence — the box is visibly empty
   * — but 5000 looks like a good answer until something names the ceiling, and
   * greying the ✓ out without saying why is how people conclude it is broken.
   */
  const outOfRange = (n: number | null, max: number, whole: boolean) =>
    n !== null && (n < 0 || n > max || (whole && !Number.isInteger(n)))

  let problem: SetEntryProblem | null = null
  if (!entry.bodyweight && outOfRange(weight, SET_LIMITS.weightMax, false)) {
    problem = { field: "weight", reason: "out-of-range" }
  } else if (outOfRange(reps, SET_LIMITS.repsMax, true)) {
    problem = { field: "reps", reason: "out-of-range" }
  } else if (weightRequired && weight === null) {
    problem = { field: "weight", reason: "missing" }
  } else if (reps === null) {
    problem = { field: "reps", reason: "missing" }
  }

  return {
    problem,
    // `?? 0` is reachable only on a lift that can be done with nothing added,
    // where it is a fact and not a stand-in for a number nobody typed.
    weight: entry.bodyweight ? 0 : (weight ?? 0),
    reps: reps ?? 0,
  }
}

/** A stable id for a lift added on the day, derived from its name. */
export function addedLiftId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `added_${slug || "lift"}`
}

/**
 * Moved here from `AddLift` so there is ONE derivation of an on-the-day
 * lift's id. Swapping a lift needs the same id the add path produces — two
 * copies of this rule would mean a swapped lift's sets landing under an id
 * nothing else recognises.
 */

/** Epley 1RM estimate: w · (1 + reps/30). reps=1 → w. (Epley 1985.) */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

/** 5/3/1 training max = 90% of 1RM, rounded loadable. (Wendler, 5/3/1.) */
export function trainingMaxFromOneRepMax(
  oneRepMax: number,
  unit: UnitSystem,
  plates?: PlateSetup
): number {
  return roundToLoadable(oneRepMax * 0.9, unit, "barbell", plates)
}

// ============================================================================
// Seeding (called by repo at enroll time)
// ============================================================================

/**
 * Build the initial per-exercise state + cursor for a new enrollment.
 * - linear programs seed working weights from the level (kg → unit, rounded).
 * - percentage programs require a 1RM per exercise (in the enrollment unit);
 *   throws if any is missing — no guessed numbers (CLAUDE.md no-fallback).
 */
export function seedEnrollment(
  program: ProgramDefinition,
  level: ProgramDefinition["levels"][number]["id"],
  unitSystem: UnitSystem,
  oneRepMaxesByExerciseId?: Record<string, number>,
  workingWeightOverrides?: Record<string, number>, // in unitSystem; overrides linear seeds
  plates?: PlateSetup
): { exerciseState: Record<string, ExerciseState>; cursor: EnrollmentCursor } {
  const levelSeed = program.levels.find((l) => l.id === level)
  if (!levelSeed) throw new Error(`Program ${program.id} has no level ${level}`)
  if (levelSeed.structuralVariantOf) {
    throw new Error(
      `Level ${level} of ${program.id} routes to program ${levelSeed.structuralVariantOf}; enroll there instead`
    )
  }

  const startCursor: EnrollmentCursor = { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 }

  // Endurance plans are fully prescribed by week — no per-exercise state to seed.
  if (program.metricType === "endurance") return { exerciseState: {}, cursor: startCursor }

  if (program.schedule.kind === "skill_routine") {
    const exerciseState: Record<string, ExerciseState> = {}
    for (const d of program.schedule.days) for (const ex of d.exercises) exerciseState[ex.id] = { tierIndex: 0 }
    return { exerciseState, cursor: startCursor }
  }

  if (program.schedule.kind === "hold_routine") {
    const exerciseState: Record<string, ExerciseState> = {}
    for (const d of program.schedule.days) for (const ex of d.exercises) exerciseState[ex.id] = { currentHoldSec: ex.startSec }
    return { exerciseState, cursor: startCursor }
  }

  const exerciseState: Record<string, ExerciseState> = {}
  for (const ex of allExercises(program)) {
    if (ex.progression.kind === "percentage_tm") {
      const oneRm = oneRepMaxesByExerciseId?.[ex.id]
      if (oneRm == null) {
        throw new Error(`Program ${program.id} requires a 1RM for ${ex.id} to compute training max`)
      }
      exerciseState[ex.id] = { trainingMax: trainingMaxFromOneRepMax(oneRm, unitSystem, plates) }
    } else {
      // linear_load and double_progression both ratchet an absolute working weight.
      const override = workingWeightOverrides?.[ex.id]
      const seedKg = levelSeed.seedWorkingWeightKg?.[ex.id]
      // An override of 0 is bodyweight and counts as an answer; only an absent
      // one falls through to the level's seed.
      if (override == null && seedKg == null) {
        throw new Error(`Level ${level} of ${program.id} missing seed weight for ${ex.id}`)
      }
      const workingWeight =
        override != null
          ? roundToLoadable(override, unitSystem, loadStyleOf(ex), plates)
          : roundToLoadable(fromKg(seedKg!, unitSystem), unitSystem, loadStyleOf(ex), plates)
      exerciseState[ex.id] = { workingWeight, consecutiveFails: 0 }
    }
  }

  return { exerciseState, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } }
}

// ============================================================================
// Prescription (read side)
// ============================================================================

export function computePrescription(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): SessionPrescription {
  if (program.metricType === "endurance") return computeEndurancePrescription(program, enrollment)
  if (program.metricType === "skill_tier") return computeSkillPrescription(program, enrollment)
  if (program.metricType === "hold_range") return computeHoldPrescription(program, enrollment)
  const day = dayAt(program, enrollment.cursor.dayIndex)
  const week = enrollment.cursor.week
  const unit = enrollment.unitSystem

  const levelSeed = program.levels.find((l) => l.id === enrollment.level)

  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    /**
     * A PROGRAM THAT GAINS A LIFT MUST NOT BRICK THE PEOPLE ON IT.
     *
     * `exerciseState` is written at enrolment, so a lift added to a cited
     * program afterwards has no entry and every session on that program threw —
     * the whole screen, not just the new lift. Correcting a catalogue program is
     * supposed to reach everybody on the next deploy; that only works if adding
     * to one degrades gracefully. The level's own starting weight is the honest
     * answer when there is one, and when there is not, the error names the lift
     * and what to do rather than an enrollment id.
     */
    let state = enrollment.exerciseState[ex.id]
    if (!state) {
      const seedKg = levelSeed?.seedWorkingWeightKg?.[ex.id]
      if (seedKg == null) {
        throw new Error(
          `${ex.name} was added to ${program.name} after you started it, and it has no starting weight. Open "Change this program" and give it one.`
        )
      }
      state = {
        workingWeight: roundToLoadable(
          fromKg(seedKg, unit),
          unit,
          loadStyleOf(ex),
          enrollment.plates
        ),
        consecutiveFails: 0,
      }
    }

    if (ex.scheme.kind === "linear") {
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
      const sets = Array.from({ length: ex.scheme.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: (ex.scheme as { reps: number }).reps,
        amrap: false,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex) }
    }

    if (ex.scheme.kind === "rep_range") {
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
      const { sets: nSets, repMin, repMax } = ex.scheme
      const sets = Array.from({ length: nSets }, (_, i) => ({
        setNumber: i + 1,
        reps: repMin,
        repRangeMax: repMax,
        amrap: false,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      // NO SYNTHETIC NOTE. This used to default to "6–8 reps", from back when
      // every set was its own row and the range was worth repeating up top.
      // `describeSets` now says "4 × 6–8 reps @ 40 kg" on the line itself, so
      // the default turned into "· 6–8 reps" appended to a line that had just
      // said exactly that. The note is the author's or it is nothing.
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex), ...(ex.note ? { note: ex.note } : {}) }
    }

    /**
     * STRAIGHT SETS WITH AN AMRAP LAST SET — "4×5, then 1×5+".
     *
     * The shape the r/Fitness PPL and StrongLifts-style "5+" work actually
     * have, and one the engine could not say before: `linear` has no AMRAP set
     * and `percentage_tm` is a weekly table rather than one lift's setting. The
     * last set carries the floor as its rep target and `amrap`, which is what
     * makes the session refuse to be logged closed (`needsInput`) — logging a
     * "5+" as five would record a number nobody chose.
     */
    if (ex.scheme.kind === "straight_amrap") {
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
      const { sets: nSets, reps } = ex.scheme
      const sets = Array.from({ length: nSets }, (_, i) => ({
        setNumber: i + 1,
        reps,
        amrap: i === nSets - 1,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex) }
    }

    // percentage_tm
    const tm = state.trainingMax!
    const weekSpec = ex.scheme.setsByWeek[week]
    if (!weekSpec) throw new Error(`${ex.id} has no sets for week ${week}`)
    const sets = weekSpec.map((s, i) => {
      const weight = roundToLoadable(tm * s.pctTM, unit, loadStyleOf(ex), enrollment.plates, "down")
      return {
        setNumber: i + 1,
        reps: s.reps,
        amrap: Boolean(s.amrap),
        weight,
        weightKg: round2(toKg(weight, unit)),
      }
    })
    return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex), note: ex.note ?? `TM ${tm}${unit}` }
  })

  return {
    programId: program.id,
    dayId: day.id,
    dayLabel: day.label,
    cycle: enrollment.cursor.cycle,
    week,
    sessionCount: enrollment.cursor.sessionCount,
    periodised: program.schedule.kind !== "linear_rotation",
    exercises,
  }
}

/**
 * The weight to actually put on the bar for a stored working weight.
 *
 * THE WORKING WEIGHT IS EXACT; THE PRESCRIPTION IS LOADABLE. Keeping them the
 * same number broke any program whose increment is finer than the plates in
 * your gym: with only 2.5 kg plates, a 2.5 kg increment on a 20 kg bench
 * rounded to the nearest loadable weight and landed on 25, so the bench climbed
 * FIVE kilos a session — twice the program's rate — and with rounding the other
 * way it would have sat on 20 for ever.
 *
 * Holding the intent exactly and flooring only what is asked for fixes both:
 * 20 → 22.5 stored, 20 asked; 22.5 → 25 stored, 25 asked. The lifter adds a
 * full step every second session, which is what a person with those plates
 * actually does, and nothing stalls or doubles.
 */
function prescribedWeight(
  workingWeight: number,
  ex: LoadExercise,
  unit: UnitSystem,
  plates?: PlateSetup
): number {
  return roundToLoadable(workingWeight, unit, loadStyleOf(ex), plates, "down")
}

/**
 * The parts of a lift that are the author's, not the engine's.
 *
 * A superset tag, a drop-set count and a hand-written note mean nothing to the
 * progression maths,
 * but they are the whole difference between "Bench Press 3×8" and what the
 * person actually intended to do on Tuesday, so the prescription has to carry
 * them through to the session widget rather than compute them away.
 */
function carried(ex: LoadExercise): {
  supersetGroup?: string
  dropSets?: number
  note?: string
  perSide?: boolean
  repUnit?: "reps" | "sec"
  restSec?: number
} {
  return {
    ...(ex.supersetGroup ? { supersetGroup: ex.supersetGroup } : {}),
    // Drops are the author's too. The maths ignores them; the person doing it
    // on Tuesday must not have to.
    ...(ex.dropSets ? { dropSets: ex.dropSets } : {}),
    ...(ex.note ? { note: ex.note } : {}),
    // "3×8 lunges" is eight each leg or four each, and only the author knows.
    ...(ex.perSide ? { perSide: true } : {}),
    // The author's rest. Dropped here, the screen fell back to our own guess
    // and called it "our suggestion" on a program that had specified one.
    ...(ex.restSec != null ? { restSec: ex.restSec } : {}),
    // A plank logged as "3 reps" is not a plank.
    ...(ex.repUnit ? { repUnit: ex.repUnit } : {}),
  }
}

// ============================================================================
// Apply log (progression + cursor advance)
// ============================================================================

export function applyLog(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  log: ProgramSessionLogInput
): ApplyLogResult {
  // Endurance has no per-exercise progression — logging just advances the plan.
  if (program.metricType === "endurance") {
    return { enrollment: { ...enrollment, cursor: advanceCursor(program, enrollment.cursor) }, changes: [] }
  }
  if (program.metricType === "skill_tier") return applySkillLog(program, enrollment, log)
  if (program.metricType === "hold_range") return applyHoldLog(program, enrollment, log)

  /**
   * THE DAY THAT WAS ACTUALLY DONE, not the one the cursor was pointing at.
   *
   * These are the same thing right up until somebody is allowed to say "I did
   * Pull today, not Push" — and then reading the cursor progresses the wrong
   * lifts: bench goes up because you rowed. The log names its day, so the log
   * decides. An unrecognised or absent dayId (the skip path sends "") falls
   * back to the cursor, which is the only case where there is nothing better.
   */
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = dayAt(program, dayIndex)
  const unit = enrollment.unitSystem
  const nextState: Record<string, ExerciseState> = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []

  for (const ex of day.exercises) {
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const prev = enrollment.exerciseState[ex.id]
    if (!prev) throw new Error(`Enrollment ${enrollment.id} missing state for ${ex.id}`)

    /**
     * A LIFT YOU DID NOT DO IS NOT A LIFT YOU FAILED.
     *
     * The machine was broken, the rack was taken, the gym shut. The engine used
     * to read "no entry" as "missed every rep", so three skipped leg presses
     * deloaded the leg press by ten per cent off a weight nobody had attempted
     * — and a skipped session (which sends no entries at all) did it to every
     * lift in the program at once. Skipping holds, and does not touch the fail
     * counter, so coming back finds the weight exactly where it was left.
     */
    if (!entry || entry.skipped) {
      nextState[ex.id] = prev
      changes.push({
        exerciseId: ex.id,
        name: ex.name,
        kind: "hold",
        ...(prev.workingWeight != null
          ? { fromWeight: prev.workingWeight, toWeight: prev.workingWeight }
          : {}),
        reason:
          entry && entry.sets.length > 0
            ? "You said not to count this one — the weight is waiting where you left it."
            : "Skipped — nothing changed, it is waiting where you left it.",
      })
      continue
    }

    if (ex.progression.kind === "none") {
      // Held on purpose. Carried into nextState unchanged so the weight
      // survives, and reported as no change rather than omitted, so a custom
      // program's session summary does not look like the lift was skipped.
      nextState[ex.id] = prev
      changes.push({
        exerciseId: ex.id,
        name: ex.name,
        kind: "hold",
        fromWeight: prev.workingWeight ?? 0,
        toWeight: prev.workingWeight ?? 0,
        reason: "You set this one to hold — change the weight yourself when you are ready.",
      })
    } else if (ex.progression.kind === "linear_load") {
      changes.push(progressLinear(ex, prev, entry, unit, nextState, enrollment.plates))
    } else if (ex.progression.kind === "double_progression") {
      changes.push(progressDouble(ex, prev, entry, unit, nextState, enrollment.plates))
    } else {
      const change = progressPercentage(
        program,
        ex,
        prev,
        entry,
        enrollment.cursor.week,
        unit,
        nextState,
        enrollment.plates
      )
      if (change) changes.push(change)
    }
  }

  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      // Advance from the day that was DONE, so logging out of order continues
      // from there rather than resuming a sequence nobody is following.
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
}

/**
 * Index of a day by id, or -1.
 *
 * Covers skill and hold routines too. It used to narrow to load programs only,
 * which is why the calisthenics and mobility engines had no choice but to
 * progress whatever day the CURSOR pointed at — the same bug that was fixed for
 * lifting in August and left in place for the other two.
 */
function dayIndexOf(program: ProgramDefinition, dayId: string): number {
  const s = program.schedule
  if (s.kind === "endurance_weeks") return -1
  return s.days.findIndex((d) => d.id === dayId)
}

function progressLinear(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange {
  if (
    (ex.scheme.kind !== "linear" && ex.scheme.kind !== "straight_amrap") ||
    ex.progression.kind !== "linear_load"
  ) {
    throw new Error(`progressLinear called on non-linear ${ex.id}`)
  }
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const down = rule.direction === "down"
  const unitLabel = unit

  /**
   * The smaller jump, once this lift has stalled once.
   *
   * StrongLifts runs the deadlift at 5 kg a workout "until 5 kg stops working",
   * then 2.5; Starting Strength halves the press and bench jump at the first
   * stall. Every other lift here has one increment for ever, which is what an
   * absent `stallIncrement` means.
   */
  const stalled = prev.stalled === true
  const baseIncrement = unit === "kg" ? rule.incrementKg : rule.incrementLb
  const stallIncrement = unit === "kg" ? rule.stallIncrementKg : rule.stallIncrementLb
  const increment = stalled && stallIncrement != null ? stallIncrement : baseIncrement

  // JUDGED AGAINST WHAT WAS ASKED FOR, which is the working weight floored to
  // something the gym can load — not the exact number held behind it.
  const asked = prescribedWeight(fromWeight, ex, unit, setup)
  const judged = judgeLoadEntry(
    { sets: ex.scheme.sets, reps: ex.scheme.reps, weight: asked },
    entry,
    { direction: rule.direction }
  )

  if (judged.verdict === "advance") {
    // Ratchet from what was actually DONE when that is ahead of what was
    // stored: somebody who put 85 on the bar when 80 was asked for should not
    // be prescribed 82.5 next time. `achieved` is the heaviest weight all the
    // prescribed sets were made at, never a single heavy set on the end.
    const base = down
      ? Math.min(fromWeight, judged.achieved)
      : Math.max(fromWeight, judged.achieved)
    const toWeight = round2(down ? Math.max(0, base - increment) : base + increment)
    const nextAsked = prescribedWeight(toWeight, ex, unit, setup)
    // When the increment is finer than your plates the bar does not move this
    // time; the intent is kept and it moves next session. Saying "+2.5" while
    // the number on screen is unchanged is the app claiming something it did
    // not do.
    const note =
      nextAsked === asked
        ? ` — your plates cannot make that step yet, so it is the same weight again and moves next session`
        : ""
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: down
        ? `Hit all reps → ${increment}${unitLabel} less help${note}`
        : `Hit all reps → +${increment}${unitLabel}${note}`,
    }
  }

  if (judged.verdict === "hold_lighter") {
    // Every rep, at a weight you chose. That is a decision, not a miss, so it
    // holds and the fail counter is not touched — three of these in a row used
    // to deload a weight that had never been attempted.
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(judged.achieved)} ${unitLabel} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const dropped = down
      ? fromWeight * (1 + rule.deloadPct)
      : fromWeight * (1 - rule.deloadPct)
    const toWeight = roundToLoadable(dropped, unit, loadStyleOf(ex), setup)
    // At the bar with nowhere left to go. Saying "deloaded" when the number did
    // not move is the app telling you it did something it did not do.
    const atFloor = !down && toWeight >= fromWeight
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} misses, but this is already the lightest your bar can be — use a lighter bar, or change the weight yourself.`
        : `${fails} misses → back off ${Math.round(rule.deloadPct * 100)}%${stallIncrement != null ? `, then ${stallIncrement}${unitLabel} a session` : ""}`,
    }
  }

  nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: fails }
  /**
   * SAY WHAT HAPPENED, IN WORDS.
   *
   * This line used to read "Missed reps (1/3)", which was wrong twice over. It
   * said "missed reps" for a session where every rep was made and only the sets
   * ran out, and the "(1/3)" — meant as "the first of three misses before the
   * weight drops" — reads as one rep out of three.
   */
  const askedSets = ex.scheme.sets
  const short =
    judged.shortfall === "sets"
      ? `Only ${judged.setsDone} of ${askedSets} ${askedSets === 1 ? "set" : "sets"}`
      : judged.shortfall === "both"
        ? `Only ${judged.setsDone} of ${askedSets} sets, and short on reps`
        : `Short on reps`
  const left = rule.deloadAfterFails - fails
  const warning =
    left <= 0
      ? ""
      : left === 1
        ? " One more like this and the weight comes down."
        : ` ${left} more like this and the weight comes down.`
  return {
    exerciseId: ex.id,
    name: ex.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `${short} → same weight next time.${warning}`,
  }
}

function progressDouble(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange {
  if (ex.scheme.kind !== "rep_range" || ex.progression.kind !== "double_progression") {
    throw new Error(`progressDouble called on non-rep_range ${ex.id}`)
  }
  const { sets: nSets, repMin, repMax } = ex.scheme
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const increment = unit === "kg" ? rule.incrementKg : rule.incrementLb

  // Top of the range on every set, AT THE WEIGHT ASKED FOR. The weight used to
  // be ignored, so a whole session taken lighter still earned the increment on
  // a number that had not been touched.
  const asked = prescribedWeight(fromWeight, ex, unit, setup)
  const top = judgeLoadEntry({ sets: nSets, reps: repMax, weight: asked }, entry)
  const floor = judgeLoadEntry({ sets: nSets, reps: repMin, weight: asked }, entry)

  if (top.verdict === "advance") {
    const base = Math.max(fromWeight, top.achieved)
    const toWeight = round2(base + increment)
    const nextAsked = prescribedWeight(toWeight, ex, unit, setup)
    const note =
      nextAsked === asked
        ? " — your plates cannot make that step yet, so it is the same weight again and moves next session"
        : ""
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: `Hit ${repMax} on all sets → +${increment}${unit}${note}`,
    }
  }

  // Hit the top of the range, but lighter than asked. Nothing to add to.
  if (top.verdict === "hold_lighter") {
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(top.achieved)} ${unit} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  if (floor.verdict !== "fail" || !rule.deloadAfterFails) {
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `In range → hold ${formatLoad(fromWeight)}${unit}, chase ${repMax}`,
    }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const toWeight = roundToLoadable(fromWeight * (1 - (rule.deloadPct ?? 0.1)), unit, loadStyleOf(ex), setup)
    const atFloor = toWeight >= fromWeight
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} sessions under ${repMin}, and this is already as light as your bar goes.`
        : `${fails} sessions under ${repMin} → back off`,
    }
  }
  nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: fails }
  return {
    exerciseId: ex.id,
    name: ex.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `Below ${repMin} (${fails}/${rule.deloadAfterFails})`,
  }
}

function progressPercentage(
  program: ProgramDefinition,
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  week: number,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange | null {
  if (ex.scheme.kind !== "percentage_tm" || ex.progression.kind !== "percentage_tm") {
    throw new Error(`progressPercentage called on non-percentage ${ex.id}`)
  }
  if (program.schedule.kind !== "weekly_waved") {
    throw new Error(`percentage_tm requires weekly_waved schedule (${program.id})`)
  }
  const rule = ex.progression
  const fromTM = prev.trainingMax!
  const increment = unit === "kg" ? rule.tmIncrementKg : rule.tmIncrementLb

  /**
   * THE TOP SET IS JUDGED EVERY WEEK, AND BY ITS FLAG.
   *
   * Wendler checks the "+" set in every working week. The engine only looked in
   * week 3, so a blown week-1 or week-2 top set raised the training max as if
   * it had gone fine. And it took "the top set" to mean the LAST logged set,
   * which stops being true the moment somebody adds a back-off set or a set
   * beyond the prescription — a 1+ judged against a 60% back-off single reads
   * as a miss and cuts the max ten per cent. The prescription says which set is
   * the AMRAP; that is the one that counts.
   */
  const weekSpec = ex.scheme.setsByWeek[week]
  const amrapIndex = weekSpec?.findIndex((set) => set.amrap) ?? -1
  const topSpec = amrapIndex >= 0 ? weekSpec![amrapIndex] : undefined
  const logged = entry?.sets.find((set) => set.setNumber === amrapIndex + 1)
  const missedThisWeek = topSpec && logged ? logged.reps < topSpec.reps : false
  const missedTopSet = prev.missedTopSet === true || missedThisWeek

  /**
   * THE MAX MOVES WHEN THE CYCLE IS OVER, NOT BEFORE THE DELOAD.
   *
   * It used to bump at the end of week 3, so week 4 — the deload, whose whole
   * job is to be light — was computed from the already-raised number. Wendler
   * deloads off the max you just finished the cycle with. Holding the change
   * until the final week is logged also means a miss anywhere in the wave is
   * still in hand when the decision is made.
   */
  if (week !== program.schedule.weeks) {
    // Nothing changes yet, but a miss has to be remembered until it does.
    if (missedTopSet !== (prev.missedTopSet === true)) {
      nextState[ex.id] = { ...prev, missedTopSet }
    }
    return null
  }

  if (missedTopSet && rule.missTmReductionPct != null) {
    const toTM = roundToLoadable(fromTM * (1 - rule.missTmReductionPct), unit, loadStyleOf(ex), setup)
    nextState[ex.id] = { trainingMax: toTM, missedTopSet: false }
    return { exerciseId: ex.id, name: ex.name, kind: "tm_reset", fromWeight: fromTM, toWeight: toTM, reason: `Missed a top set this cycle → training max −${Math.round(rule.missTmReductionPct * 100)}%` }
  }

  const toTM = roundToLoadable(fromTM + increment, unit, loadStyleOf(ex), setup)
  nextState[ex.id] = { trainingMax: toTM, missedTopSet: false }
  return { exerciseId: ex.id, name: ex.name, kind: "tm_increase", fromWeight: fromTM, toWeight: toTM, reason: `Cycle complete → training max +${increment}${unit}` }
}

// ============================================================================
// Cursor advance (hybrid scheduling — load is log-driven sequential)
// ============================================================================

export function advanceCursor(program: ProgramDefinition, cursor: EnrollmentCursor): EnrollmentCursor {
  const next: EnrollmentCursor = { ...cursor, sessionCount: cursor.sessionCount + 1 }

  // Endurance: walk sessions within the week, then weeks; clamp at the final
  // session once the plan is finished (a fixed-length plan graduates, no loop).
  if (program.schedule.kind === "endurance_weeks") {
    const weeks = program.schedule.weeks
    const sessionsThisWeek = weeks[cursor.week - 1]?.sessions.length ?? 1
    next.dayIndex = cursor.dayIndex + 1
    if (next.dayIndex >= sessionsThisWeek) {
      if (cursor.week >= weeks.length) {
        // Finished — hold at the last session of the last week.
        next.dayIndex = cursor.dayIndex
        return next
      }
      next.dayIndex = 0
      next.week = cursor.week + 1
    }
    return next
  }

  const days = program.schedule.days
  next.dayIndex = cursor.dayIndex + 1
  if (next.dayIndex >= days.length) {
    next.dayIndex = 0
    if (program.schedule.kind === "weekly_waved") {
      next.week = cursor.week + 1
      if (next.week > program.schedule.weeks) {
        next.week = 1
        next.cycle = cursor.cycle + 1
      }
    } else {
      next.cycle = cursor.cycle + 1
    }
  }
  return next
}

// ============================================================================
// Skill-tier prescription + progression (calisthenics)
// ============================================================================

function computeSkillPrescription(program: ProgramDefinition, enrollment: ProgramEnrollment): SessionPrescription {
  if (program.schedule.kind !== "skill_routine") throw new Error(`${program.id} is not skill_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    const idx = Math.min(enrollment.exerciseState[ex.id]?.tierIndex ?? 0, ex.tiers.length - 1)
    const tier = ex.tiers[idx]
    const top = idx >= ex.tiers.length - 1
    /**
     * WHAT THE SESSION ASKS FOR IS NOT THE UNLOCK THRESHOLD.
     *
     * Every set used to be seeded with `unlockReps`, so pressing "I did this"
     * cleared the bar by definition and promoted you to a harder variation on
     * every single session, whatever you had actually managed. The routine this
     * cites works in a range and moves on at the top of it: the ask is the
     * bottom, the unlock is the top, and they are different numbers.
     */
    const reps = tier.workReps ?? tier.unlockReps
    const sets = Array.from({ length: tier.sets }, (_, i) => ({
      setNumber: i + 1,
      reps,
      repRangeMax: tier.workReps != null ? tier.unlockReps : undefined,
      amrap: false,
      weight: 0,
      weightKg: 0,
    }))
    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      note: top ? `${tier.name} — top tier` : `${tier.name} — ${tier.unlockReps}+ on every set unlocks the next one`,
      bodyweight: true,
      repUnit: "reps" as const,
      // THE AUTHOR'S OWN INSTRUCTIONS. This path built its exercise by hand
      // and dropped both: Bodyweight Foundations pairs its lifts and asks for
      // three minutes between pairs, and neither reached the screen — so the
      // rest clock used our guess and the pairs were never treated as pairs.
      ...(ex.supersetGroup ? { supersetGroup: ex.supersetGroup } : {}),
      ...(ex.restSec != null ? { restSec: ex.restSec } : {}),
    }
  })
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, sessionCount: enrollment.cursor.sessionCount, periodised: false, exercises }
}

function applySkillLog(program: ProgramDefinition, enrollment: ProgramEnrollment, log: ProgramSessionLogInput): ApplyLogResult {
  if (program.schedule.kind !== "skill_routine") throw new Error(`${program.id} is not skill_routine`)
  // The day that was actually done, not the one the cursor happened to be on.
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = program.schedule.days[dayIndex] ?? program.schedule.days[0]
  const nextState = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []
  for (const ex of day.exercises) {
    const idx = Math.min(enrollment.exerciseState[ex.id]?.tierIndex ?? 0, ex.tiers.length - 1)
    const tier = ex.tiers[idx]
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const hit = (entry?.sets.filter((s) => s.reps >= tier.unlockReps).length ?? 0) >= tier.sets
    if (hit && idx < ex.tiers.length - 1) {
      nextState[ex.id] = { tierIndex: idx + 1 }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "tier_up", reason: `Unlocked: ${ex.tiers[idx + 1].name}` })
    } else {
      nextState[ex.id] = { tierIndex: idx }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold", reason: hit ? `Top tier — keep adding reps` : `Keep working ${tier.name}` })
    }
  }
  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
}

// ============================================================================
// Hold/range prescription + progression (flexibility / mobility)
// ============================================================================

function computeHoldPrescription(program: ProgramDefinition, enrollment: ProgramEnrollment): SessionPrescription {
  if (program.schedule.kind !== "hold_routine") throw new Error(`${program.id} is not hold_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    const hold = enrollment.exerciseState[ex.id]?.currentHoldSec ?? ex.startSec
    const atTarget = hold >= ex.targetSec
    const sets = Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: hold, amrap: false, weight: 0, weightKg: 0 }))
    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      note: `${hold}s${ex.perSide ? " each side" : ""}${atTarget ? " — target reached" : ` → ${ex.targetSec}s goal`}`,
      bodyweight: true,
      repUnit: "sec" as const,
      // A hold routine's own rest would be carried here too, the way the
      // skill path above does — but `HoldExercise` has no `restSec` or
      // `supersetGroup` to carry, because no author has asked for either.
      // Adding the fields to the type for a case that does not exist would be
      // speculative; the day one appears, this is where it goes.
      ...(ex.perSide ? { perSide: true } : {}),
    }
  })
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, sessionCount: enrollment.cursor.sessionCount, periodised: false, exercises }
}

function applyHoldLog(program: ProgramDefinition, enrollment: ProgramEnrollment, log: ProgramSessionLogInput): ApplyLogResult {
  if (program.schedule.kind !== "hold_routine") throw new Error(`${program.id} is not hold_routine`)
  // The day that was actually done, not the one the cursor happened to be on.
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = program.schedule.days[dayIndex] ?? program.schedule.days[0]
  const nextState = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []
  for (const ex of day.exercises) {
    const current = enrollment.exerciseState[ex.id]?.currentHoldSec ?? ex.startSec
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const held = (entry?.sets.filter((s) => s.reps >= current).length ?? 0) >= ex.sets
    if (held && current < ex.targetSec) {
      const next = Math.min(ex.targetSec, current + ex.incrementSec)
      nextState[ex.id] = { currentHoldSec: next }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold_up", fromWeight: current, toWeight: next, reason: `Held ${current}s → ${next}s` })
    } else {
      nextState[ex.id] = { currentHoldSec: current }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold", reason: held ? `At target ${current}s` : `Keep working ${current}s` })
    }
  }
  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function allExercises(program: ProgramDefinition): LoadExercise[] {
  const s = program.schedule
  if (s.kind === "linear_rotation" || s.kind === "weekly_waved") return s.days.flatMap((d) => d.exercises)
  return []
}

function dayAt(program: ProgramDefinition, dayIndex: number): DayTemplate {
  const s = program.schedule
  if (s.kind !== "linear_rotation" && s.kind !== "weekly_waved") throw new Error(`${program.id} has no load day templates`)
  const day = s.days[dayIndex]
  if (!day) throw new Error(`Program ${program.id} has no day at index ${dayIndex}`)
  return day
}

// ============================================================================
// Endurance prescription (cardio — fully prescribed by week/session)
// ============================================================================

function computeEndurancePrescription(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): SessionPrescription {
  if (program.schedule.kind !== "endurance_weeks") throw new Error(`${program.id} is not endurance_weeks`)
  const { week, dayIndex } = enrollment.cursor
  const weekPlan = program.schedule.weeks[week - 1]
  if (!weekPlan) throw new Error(`${program.id} has no week ${week}`)
  const session = weekPlan.sessions[dayIndex] ?? weekPlan.sessions[weekPlan.sessions.length - 1]

  const isFinalSession =
    week >= program.schedule.weeks.length && dayIndex >= weekPlan.sessions.length - 1
  /**
   * Every session in the plan has been logged.
   *
   * `isFinalSession` cannot answer this: the cursor HOLDS at the last session
   * once it gets there, so "this is the last one" stays true forever and looks
   * identical before and after you do it. Counting what has been logged against
   * what the program contains is the only thing that can tell them apart.
   */
  const totalSessions = program.schedule.weeks.reduce((n, w) => n + w.sessions.length, 0)
  const isComplete = enrollment.cursor.sessionCount >= totalSessions

  return {
    programId: program.id,
    dayId: session.id,
    dayLabel: weekPlan.label ? `${weekPlan.label} · ${session.label}` : session.label,
    cycle: enrollment.cursor.cycle,
    week,
    sessionCount: enrollment.cursor.sessionCount,
    periodised: true,
    exercises: [],
    enduranceSets: session.sets,
    summary: summarizeEndurance(session.sets),
    isFinalSession,
    isComplete,
  }
}

/** One-line human summary, e.g. "5 min walk · 8×(jog 60s / walk 90s) · 5 min walk". */
function summarizeEndurance(sets: EnduranceSet[]): string {
  const fmt = (b: EnduranceBlock) => {
    const amount = b.durationSec != null ? `${Math.round(b.durationSec / 60) || b.durationSec / 60}m` : b.distanceKm != null ? `${b.distanceKm}km` : ""
    return `${b.label}${amount ? ` ${amount}` : ""}`
  }
  return sets
    .map((s) => {
      const inner = s.blocks.map(fmt).join(" / ")
      return s.repeat > 1 ? `${s.repeat}×(${inner})` : inner
    })
    .join(" · ")
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// One record, read as a session
// ---------------------------------------------------------------------------

/**
 * The engine's view of a workout, DERIVED from the rows that were stored.
 *
 * THERE USED TO BE TWO COPIES OF EVERY SESSION. `program_session_logs.entries`
 * held what the engine replayed from, and `workout_sets` held what the
 * dashboard, the calendar, the personal records and the export read — with
 * nothing joining them. Deleting a session left its twin behind; editing one
 * reached neither. Now there is one set of rows and this is how the engine
 * reads them, so the two can no longer disagree: there is nothing to disagree
 * with.
 *
 * Warm-ups and drop sets are excluded, because they are not what the
 * progression rule is about — a warm-up counted as a working set reads as a
 * collapse. Weights are converted out of the stored kilograms into whatever
 * unit the enrollment is in.
 */
export function entriesFromSets(
  sets: StoredSet[],
  adjustments: WorkoutAdjustments | null | undefined,
  unit: UnitSystem
): LoggedExercise[] {
  const byExercise = new Map<string, LoggedSet[]>()
  for (const row of sets) {
    // The progression rule is about work sets. `backoff` counts: it is work,
    // just lighter, and the judge compares weights anyway.
    if (row.set_kind !== "working" && row.set_kind !== "amrap" && row.set_kind !== "backoff") continue
    const key = row.exercise_id ?? row.exercise
    const list = byExercise.get(key) ?? []
    list.push({
      setNumber: row.set_number,
      reps: row.reps,
      weight: round2(fromKg(row.weight_kg, unit)),
      ...(row.side ? { side: row.side as "left" | "right" } : {}),
    })
    byExercise.set(key, list)
  }

  const entries: LoggedExercise[] = []
  for (const [exerciseId, list] of byExercise) {
    /**
     * A SET DONE ON BOTH SIDES IS ONE SET.
     *
     * A unilateral lift stores a row per side with the same set number. The
     * engine asks "did you make the set", and you made it only if both sides
     * did — so the harder of the two is the answer, and counting them as two
     * sets would tell a three-set lift it had done six.
     */
    const merged = new Map<number, LoggedSet>()
    for (const set of list) {
      const seen = merged.get(set.setNumber)
      if (!seen) merged.set(set.setNumber, { setNumber: set.setNumber, reps: set.reps, weight: set.weight })
      else
        merged.set(set.setNumber, {
          setNumber: set.setNumber,
          reps: Math.min(seen.reps, set.reps),
          weight: Math.min(seen.weight, set.weight),
        })
    }
    entries.push({
      exerciseId,
      sets: [...merged.values()].sort((a, b) => a.setNumber - b.setNumber),
    })
  }

  /**
   * "DON'T COUNT IT" HAS TO COUNT FOR SOMETHING.
   *
   * This only marked a lift skipped when it had NO rows at all, so the button on
   * the finish sheet — offered precisely for a lift that was started and cut
   * short — did nothing. Two of three squat sets, tapped "Don't count it": the
   * warning row disappeared, the person believed it was handled, and the engine
   * still scored a miss and moved a step towards a 10% deload off a weight that
   * was never failed. That is the exact bug the comment above `applyLog` was
   * written to kill, reintroduced by the screen above it.
   *
   * The sets stay on the entry: they were done, and they belong in the volume,
   * the history and any record they set. Only the JUDGEMENT is withheld.
   */
  const held = new Set([...(adjustments?.skipped ?? []), ...(adjustments?.incomplete ?? [])])
  for (const entry of entries) {
    if (held.has(entry.exerciseId)) entry.skipped = true
  }
  for (const exerciseId of held) {
    if (!byExercise.has(exerciseId)) entries.push({ exerciseId, sets: [], skipped: true })
  }
  return entries
}

// ---------------------------------------------------------------------------
// Reading a session at a glance
// ---------------------------------------------------------------------------

/**
 * One line describing what a lift asks for today — "4 × 6–8 @ 40 kg".
 *
 * THE SESSION WAS UNREADABLE. Every set rendered as its own row of two number
 * boxes, so an upper/lower day with five lifts was twenty rows of identical
 * inputs saying "40 kg × 6 / 6–8 reps" — a sentence that parses as neither the
 * prescription nor what you did, repeated until it filled the screen. The thing
 * a person actually wants to know on a Tuesday is one line long.
 *
 * Sets that are all the same collapse into `sets × reps @ weight`. Sets that
 * differ do NOT collapse — a 5/3/1 wave is three different weights and saying
 * "3 × 5" would be a lie — so each is listed. AMRAP is marked with `+`, because
 * "as many as possible" is the one number the app cannot guess for you.
 */
export function describeSets(exercise: PrescribedExercise, unitLabel: string): string {
  const { sets, bodyweight, repUnit } = exercise
  if (sets.length === 0) return "—"
  const unit = repUnit === "sec" ? "sec" : "reps"

  const repsOf = (s: PrescribedSet) =>
    `${s.repRangeMax ? `${s.reps}–${s.repRangeMax}` : s.reps}${s.amrap ? "+" : ""}`
  const weightOf = (s: PrescribedSet) => `${s.weight} ${unitLabel}`

  const uniform =
    sets.every((s) => s.weight === sets[0].weight) &&
    sets.every((s) => repsOf(s) === repsOf(sets[0]))

  const side = exercise.perSide ? " each side" : ""
  if (uniform) {
    const head = `${sets.length} × ${repsOf(sets[0])} ${unit}${side}`
    return bodyweight ? head : `${head} @ ${weightOf(sets[0])}`
  }
  return (
    sets.map((s) => (bodyweight ? repsOf(s) : `${weightOf(s)} × ${repsOf(s)}`)).join(", ") + side
  )
}

/**
 * THE SLOT A SET OCCUPIES — one derivation, mirroring the database's.
 *
 * `uq_workout_sets_slot` is `(log_id, COALESCE(exercise_id, exercise),
 * set_kind, set_number, COALESCE(side, ''))`. This is that expression in
 * TypeScript, and it existed in three places: the offline queue keyed its
 * retries by it, `completeSet` decided "correct this set" rather than "add a
 * second one" by it, and the live screen matched a ticked set to its row by
 * NUMBER alone — which is not the same rule, and is why a warm-up set 1 and a
 * working set 1 fought over one row.
 *
 * Three copies of the uniqueness rule means a fourth caller getting it subtly
 * wrong and writing a duplicate the index then refuses, mid-workout.
 */
export function setSlot(set: {
  exerciseId: string | null
  exercise: string
  kind: string
  setNumber: number
  side?: string | null
}): string {
  return `${set.exerciseId ?? set.exercise}|${set.kind}|${set.setNumber}|${set.side ?? ""}`
}

/** Warm-ups first, then the working sets, then what came off the end. */
const KIND_ORDER: Record<string, number> = {
  warmup: 0,
  working: 1,
  amrap: 1,
  backoff: 2,
  drop: 3,
}

/** `W` for a warm-up, `D` for a drop set, the slot number otherwise. */
export function setLabel(kind: string, setNumber: number): string {
  if (kind === "warmup") return `W${setNumber}`
  if (kind === "drop") return `D${setNumber}`
  return String(setNumber)
}

/**
 * THE ROWS OF ONE LIFT — SLOTS, NOT POSITIONS.
 *
 * The screen used to render "however many sets were prescribed" and find the
 * set for each row with `setNumber === n && kind !== "warmup"`. Three things
 * that breaks:
 *
 *  - a warm-up set 1 and a working set 1 are two different slots in the
 *    database and had one row on screen, so ticking the warm-up made the
 *    working row look done;
 *  - re-tagging a ticked working set as a warm-up left the working slot
 *    occupied on screen, so the program's fifth set had nowhere to go and the
 *    finish sheet counted it as done;
 *  - a set ticked into a slot nobody prescribed (a drop set, a set logged on
 *    another device) had no row at all and was invisible.
 *
 * So the rows ARE the slots: every prescribed working slot, plus every set
 * already ticked that no prescribed slot claims, plus whatever extra rows this
 * phone has revealed. `local.kinds` re-tags an untouched row before it is
 * ticked — the choice travels with the tick, and the moment it lands the set
 * belongs to the slot it was tagged into and the prescribed row comes back
 * empty.
 */
export function liftRows(
  ex: Pick<PrescribedExercise, "exerciseId" | "sets">,
  ticked: readonly LiveWorkoutSet[],
  local: {
    /** Extra working rows revealed by "+ Add a set". */
    extra?: number
    /** Warm-up rows revealed by the lift menu, with nothing pre-filled. */
    warmups?: number
    /** A row's chosen kind before it is ticked, keyed by the row's own slot. */
    kinds?: Record<string, LiveWorkoutSet["kind"]>
    /** Rows swiped away on this phone, keyed by slot. Never a ticked set. */
    hidden?: readonly string[]
  } = {}
): LiftRow[] {
  const hidden = new Set(local.hidden ?? [])
  const rows: LiftRow[] = []
  const claimed = new Set<string>()
  /** Slots a row is already writing to, so two rows cannot fight over one. */
  const taken = new Set<string>()
  const slotOf = (kind: string, setNumber: number, side: string | null = null) =>
    setSlot({ exerciseId: ex.exerciseId, exercise: ex.exerciseId, kind, setNumber, side })

  /** The first number in `kind` nothing is using yet. */
  const nextFree = (kind: string) => {
    let n = 1
    while (taken.has(slotOf(kind, n)) || ticked.some((set) => setSlot(set) === slotOf(kind, n))) n++
    return n
  }

  const push = (row: LiftRow) => {
    taken.add(slotOf(row.kind, row.setNumber, row.side))
    if (row.done) claimed.add(row.done.id)
    rows.push(row)
  }

  /**
   * WARM-UPS FIRST, AND THEY PRE-FILL NOTHING.
   *
   * A warm-up row revealed from the lift menu starts with both boxes empty:
   * "50 % of set 1" would be a number nobody prescribed, and the working
   * weight pre-filled in a warm-up box is the number you least want there and
   * the easiest to tick by accident.
   */
  /**
   * Only as many as were asked for. A warm-up already ticked comes through as
   * a row of its own at the end of this function, so a session reloaded with a
   * ticked W2 and no W1 shows W2 — and does not invent an empty W1 to fill the
   * gap, which is a row nobody asked for and a slot nobody used.
   */
  for (let n = 1; n <= (local.warmups ?? 0); n++) {
    const slot = slotOf("warmup", n)
    const done = ticked.find((set) => setSlot(set) === slot) ?? null
    if (!done && hidden.has(slot)) continue
    push({ slot, kind: "warmup", setNumber: n, side: null, prescribed: null, workingIndex: null, done })
  }

  const prescribedCount = ex.sets.length + (local.extra ?? 0)
  const last = ex.sets[ex.sets.length - 1]
  for (let i = 0; i < prescribedCount; i++) {
    const spec = ex.sets[i] ?? (last ? { ...last, setNumber: i + 1 } : null)
    const setNumber = i + 1
    const baseKind: LiveWorkoutSet["kind"] = spec?.amrap ? "amrap" : "working"
    const rowSlot = slotOf(baseKind, setNumber)
    // The kind this row will be written as: what you chose, else the
    // prescription's own.
    const kind = local.kinds?.[rowSlot] ?? baseKind
    /**
     * A re-tagged row takes the next free number in the kind it moved to. It
     * kept its own number before, which is how tagging working set 1 as a
     * warm-up collided with the warm-up row already revealed above it — two
     * rows writing `warmup|1`, and the second tick correcting the first set
     * instead of adding one.
     */
    const number = kind === baseKind ? setNumber : nextFree(kind)
    const filledSlot = slotOf(kind, number)
    const done = ticked.find((set) => setSlot(set) === filledSlot) ?? null
    if (!done && hidden.has(rowSlot)) continue
    push({
      slot: rowSlot,
      kind,
      setNumber: number,
      side: null,
      /**
       * A ROW YOU HAVE RE-TAGGED HAS NO PRESCRIPTION ANY MORE. The program
       * asked for 100 kg × 5 as a WORKING set; carrying that number into a
       * warm-up or a drop set would be the app inventing a prescription
       * nobody wrote.
       */
      prescribed: kind === baseKind ? spec : null,
      // Only a working row has a "last time" to show: there is no honest
      // previous for a warm-up you decided to add today.
      workingIndex: KIND_ORDER[kind] === 1 ? setNumber : null,
      done,
    })
  }

  /**
   * EVERY SET THAT IS ALREADY A FACT GETS A ROW, even one no prescribed slot
   * claims — a drop set, a set ticked on another device. It is in the database
   * and in the totals; leaving it off the screen would be the screen
   * disagreeing with the receipt.
   */
  for (const set of ticked) {
    if (claimed.has(set.id)) continue
    push({
      slot: setSlot(set),
      kind: set.kind,
      setNumber: set.setNumber,
      side: set.side,
      prescribed: null,
      workingIndex: null,
      done: set,
    })
  }

  return rows.sort(
    (a, b) =>
      (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
      a.setNumber - b.setNumber ||
      (a.side ?? "").localeCompare(b.side ?? "")
  )
}

/**
 * HOW A TICKED SET IS DOING, in the only terms worth telling somebody.
 *
 * The row rendered "not saved yet — waiting for signal" the moment a set's id
 * started with `pending:` — which is the instant the ✓ is tapped, before the
 * request has even left. So every tick on a perfectly good connection flashed
 * an alarm for one frame (seen in the walkthrough), and the alarm that meant
 * something looked exactly like the one that did not.
 *
 * Four states, and only the last two are worth a person's attention:
 *
 *   saved     the server has it. Nothing to say.
 *   pending   on the wire, under a second and a half. Say NOTHING — this is
 *             what a normal tick looks like and it needs no commentary.
 *   saving    on the wire longer than that. "Saving…", because silence now
 *             reads as a tick that did not take.
 *   queued    the write failed, or has been out for ten seconds with no
 *             answer. Named as not saved, with what happens next.
 *
 * Never the other way round: a row that has said "not saved" keeps saying it
 * until the server acks. A marker that clears itself on a timer is a marker
 * that lies exactly when it matters.
 */
export function saveStateFor(
  set: { pendingSince: number | null; queued: boolean },
  now: number
): "saved" | "pending" | "saving" | "queued" {
  if (set.queued) return "queued"
  if (set.pendingSince === null) return "saved"
  const waited = now - set.pendingSince
  if (waited >= SAVE_GIVEN_UP_MS) return "queued"
  if (waited >= SAVE_QUIET_MS) return "saving"
  return "pending"
}

/** Under this, a tick says nothing at all: it is simply what saving looks like. */
export const SAVE_QUIET_MS = 1_500
/** Past this with no answer, it is treated as lost rather than slow. */
export const SAVE_GIVEN_UP_MS = 10_000

/**
 * THE ORDER YOU ACTUALLY DID THEM IN.
 *
 * `adjustments.order` was written by nothing and read by nothing: the type
 * carried the field, the schema accepted it, and the screen drew the
 * program's order regardless. Moving a lift is the answer to a busy rack that
 * does NOT change what you did — you did the same lifts, in a different
 * order — and the record should say so.
 *
 * Anything the order does not mention keeps its place relative to what it
 * does: a list written before a lift was added must not make that lift vanish.
 */
export function applyLiftOrder<T extends { exerciseId: string }>(
  exercises: readonly T[],
  order: readonly string[] | undefined
): T[] {
  if (!order || order.length === 0) return [...exercises]
  const rank = new Map(order.map((id, i) => [id, i]))
  return [...exercises]
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => {
      const ra = rank.get(a.ex.exerciseId)
      const rb = rank.get(b.ex.exerciseId)
      // Unmentioned lifts keep their own relative order, after the named ones
      // they were behind — the list is a rearrangement, not a filter.
      if (ra === undefined && rb === undefined) return a.i - b.i
      if (ra === undefined) return 1
      if (rb === undefined) return -1
      return ra - rb
    })
    .map((w) => w.ex)
}

/** The order with one lift moved one place. Returns the whole list. */
export function moveLift(
  exercises: readonly { exerciseId: string }[],
  exerciseId: string,
  delta: -1 | 1
): string[] {
  const ids = exercises.map((ex) => ex.exerciseId)
  const at = ids.indexOf(exerciseId)
  const to = at + delta
  if (at === -1 || to < 0 || to >= ids.length) return ids
  const next = [...ids]
  ;[next[at], next[to]] = [next[to], next[at]]
  return next
}

/**
 * WHETHER A STORED SET IS THIS LIFT — one rule, and it has to be two-legged.
 *
 * `library_id` is the lift's identity across programs, so it wins when both
 * sides have one. But rows written by `logProgramSession` carry no
 * `library_id` at all, and a workout logged before that column was written has
 * none either — for those the trimmed, lowercased NAME is the only key they
 * have. A match on the id alone would make every older session invisible;
 * a match on the name alone would miss a self-built week that calls it
 * "Back Squat".
 *
 * This replaces the name-only comparison inside `workoutRepo.liftHistory` and
 * the exercise-id-only lookup inside `lastSetsPerLift`, which disagreed about
 * what "the same lift" means — so the PREVIOUS column and the lift history
 * sheet could answer the same question differently on one screen.
 */
export function setMatchesLift(
  row: { exercise: string; libraryId?: string | null },
  lift: { name: string; libraryId?: string | null }
): boolean {
  if (row.libraryId && lift.libraryId && row.libraryId === lift.libraryId) return true
  return row.exercise.trim().toLowerCase() === lift.name.trim().toLowerCase()
}

/**
 * The newest sessions that contain a given lift, from workouts already read.
 *
 * `workouts` arrives NEWEST FIRST and is not re-sorted here: the read that
 * produced it ordered by `logged_at` with a tie-break, and re-deriving the
 * order from a formatted date is how two workouts on one day swap places.
 *
 * A workout with no matching set is not a session for this lift — it is
 * skipped, not returned empty, or "last time" becomes the last time you were
 * in the gym rather than the last time you did this.
 */
export function pickLastSets<
  S extends { exercise: string; libraryId?: string | null; setNumber: number },
>(
  workouts: readonly { at: string; sets: readonly S[] }[],
  lift: { name: string; libraryId?: string | null },
  sessions = 1
): { at: string; sets: S[] }[] {
  const out: { at: string; sets: S[] }[] = []
  for (const workout of workouts) {
    if (out.length >= sessions) break
    const mine = workout.sets
      .filter((set) => setMatchesLift(set, lift))
      .slice()
      .sort((a, b) => a.setNumber - b.setNumber)
    if (mine.length > 0) out.push({ at: workout.at, sets: mine })
  }
  return out
}

/**
 * Whether a lift has to be opened before it can be logged honestly.
 *
 * An AMRAP set has no prescribed answer — the whole point is how many you got —
 * so "log it as prescribed" would quietly record the floor of the range as your
 * result and progress you off a number you never lifted.
 */
export function needsInput(exercise: PrescribedExercise): boolean {
  // A REP RANGE HAS NO PRESCRIBED ANSWER EITHER. "6–8" was seeded as 6, so the
  // one-tap save recorded the bottom of every range — and the rule for adding
  // weight is hitting the TOP on every set. On the three programs built out of
  // rep ranges the weight could therefore never move, however well the session
  // had gone, unless you opened each lift and typed the top number by hand.
  return exercise.sets.some((s) => s.amrap || s.repRangeMax != null)
}

// ---------------------------------------------------------------------------
// A year of it, read back
// ---------------------------------------------------------------------------

/**
 * A load as somebody would write it on a whiteboard — the NUMBER only.
 *
 * Named `formatLoad`, not `formatWeight`: `healthService.formatWeight(kg, unit)`
 * already exists and returns "82.5 kg". Two functions with one name in two
 * slices is how the wrong one gets imported.
 *
 * Progression arithmetic produces numbers like `20.4375` — 2.5 kg increments,
 * percentage-of-training-max waves and pound conversions all divide, and the
 * result was being printed raw. Nobody has ever loaded 20.4375 kg. One decimal
 * is the finest a barbell is actually adjustable to, and whole numbers lose the
 * ".5" that half the plates in a gym are.
 */
export function formatLoad(weight: number): string {
  const rounded = Math.round(weight * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}


/** Enough to show a shape, few enough to stay a glyph rather than a chart. */
const SPARK_POINTS = 40

/**
 * Not exported: the only caller is `liftsWithHistory` below. It was exported
 * and nothing outside this file ever used it.
 */
function downsample(values: LoadPoint[], max = SPARK_POINTS): LoadPoint[] {
  if (values.length <= max) return values
  const step = (values.length - 1) / (max - 1)
  const out: LoadPoint[] = []
  for (let i = 0; i < max; i++) out.push(values[Math.round(i * step)])
  return out
}

/**
 * WHAT THE NUMBERS DID, which is the only reason anybody logs them.
 *
 * The history panel showed the last twelve sessions as `ohp-day · C1 W1` and a
 * date. After a year that is a scrolling list of internal identifiers, and the
 * one question a training log exists to answer — *did my bench go up?* — could
 * not be asked at all, even though every set of every session was sitting in
 * `program_session_logs.entries` the whole time.
 *
 * Deliberately reports FIRST, LATEST and BEST as three separate numbers rather
 * than one "progress" figure. They come apart in normal training and the
 * difference is the information: latest below best means a deload, latest equal
 * to first after thirty sessions means a stall, and a single "+45 kg" would
 * hide both.
 *
 * `logs` may arrive in any order; this sorts, so a caller that fetched newest
 * first does not silently get its first and latest swapped.
 */
export function summariseProgression(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  nameFor: (exerciseId: string) => string
): LiftProgress[] {
  const byLift = new Map<string, { at: string; top: number }[]>()

  for (const log of logs) {
    for (const entry of log.entries ?? []) {
      // The working weight of a session is its heaviest set. Taking the last
      // set instead would read a drop set as a collapse in strength.
      const top = entry.sets.reduce((m, s) => Math.max(m, s.weight), 0)
      if (!byLift.has(entry.exerciseId)) byLift.set(entry.exerciseId, [])
      byLift.get(entry.exerciseId)!.push({ at: log.logged_at, top })
    }
  }

  const out: LiftProgress[] = []
  for (const [exerciseId, points] of byLift) {
    points.sort((a, b) => a.at.localeCompare(b.at))
    out.push({
      exerciseId,
      name: nameFor(exerciseId),
      first: points[0].top,
      latest: points[points.length - 1].top,
      best: points.reduce((m, p) => Math.max(m, p.top), 0),
      sessions: points.length,
      firstAt: points[0].at,
      latestAt: points[points.length - 1].at,
      points: downsample(points.map((pt) => ({ at: pt.at, weight: pt.top }))),
    })
  }
  // Biggest gain first — the lifts that moved are the ones worth reading.
  return out.sort((a, b) => b.latest - b.first - (a.latest - a.first))
}

/**
 * How many sessions in a row were logged with nothing missed.
 *
 * THE 395 KG SQUAT. Linear progression adds weight after a session you
 * completed, and deloads only after you FAIL — which is correct, and is what
 * StrongLifts says. But "log session as prescribed" is now one button, so it is
 * very easy to tell the app you hit every rep on a day you did not, and a year
 * of that ratchets a beginner's squat to a number no human has lifted.
 *
 * A CEILING WOULD BE THE WRONG FIX. The programs here are cited; inventing a cap
 * would be editing somebody else's program with a number we made up. What can be
 * said honestly is what the log itself shows: an unbroken run. Real linear
 * progression stalls — that is the entire premise of the program — so a run this
 * long means the log and the gym have come apart, and the person is the only one
 * who can say which is right.
 *
 * Counts back from the most recent session and stops at the first missed rep.
 */
export function unbrokenRun(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  targetRepsFor: (exerciseId: string) => number | null
): number {
  const ordered = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  let run = 0
  for (const log of ordered) {
    const everyRepHit = (log.entries ?? []).every((entry) => {
      const target = targetRepsFor(entry.exerciseId)
      // A lift with no fixed rep target — an AMRAP top set, a timed hold — can
      // not be "missed", so it neither breaks a run nor extends one.
      if (target === null) return true
      return entry.sets.every((s) => s.reps >= target)
    })
    if (!everyRepHit) break
    run++
  }
  return run
}

/**
 * The point at which an unbroken run is worth asking about.
 *
 * Beginner linear programs are expected to stall inside a few months — roughly
 * forty sessions at three a week. Thirty is comfortably inside "still plausible"
 * while being far enough in that a real stall should have happened.
 */
export const UNBROKEN_RUN_QUESTION_AT = 30

/**
 * Days since the last session on this enrollment, or null if never trained.
 *
 * COMING BACK. The engine advances on what you log, so a program you left in
 * March prescribes, in September, exactly the weight you walked away from — and
 * that weight is now wrong, because six months off costs strength that no rule
 * in the program accounts for. The program cannot know; only the calendar can.
 *
 * Not a deload rule. These programs are cited and inventing "drop 20% after
 * eight weeks" would be putting our number in somebody else's program. This is
 * the fact; what to do with it is the lifter's call, and the controls to do it
 * already exist.
 */
export function daysSinceLastSession(
  logs: { logged_at: string }[],
  now: Date = new Date()
): number | null {
  if (logs.length === 0) return null
  const latest = logs.reduce((m, l) => (l.logged_at > m ? l.logged_at : m), logs[0].logged_at)
  const then = new Date(latest)
  // Whole days between two wall-clock dates, so a session logged last night at
  // 23:00 reads as "yesterday" rather than as a fraction of a day.
  const dayMs = 24 * 60 * 60 * 1000
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((b - a) / dayMs))
}

/**
 * Days since each individual lift was last trained.
 *
 * The program-level layoff notice says "you last trained this 94 days ago" and
 * stops there. After three months off that is true of the whole program, but
 * after an injury or a busy month it is usually true of SOME lifts — you kept
 * squatting and stopped pressing — and one line for the program cannot say which
 * weights are the stale ones.
 *
 * Still states the fact and stops. No cited program has a detraining rule, so
 * computing "drop 15%" here would be putting our number into somebody else's
 * program under their name.
 */
export function staleLifts(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  nameFor: (exerciseId: string) => string,
  now: Date = new Date(),
  thresholdDays: number = LAYOFF_DAYS
): { exerciseId: string; name: string; days: number }[] {
  const lastByLift = new Map<string, string>()
  for (const log of logs) {
    for (const entry of log.entries ?? []) {
      const seen = lastByLift.get(entry.exerciseId)
      if (!seen || log.logged_at > seen) lastByLift.set(entry.exerciseId, log.logged_at)
    }
  }

  const out: { exerciseId: string; name: string; days: number }[] = []
  for (const [exerciseId, at] of lastByLift) {
    // Reuse the one day-difference rule rather than writing a second one.
    const days = daysSinceLastSession([{ logged_at: at }], now)
    if (days !== null && days >= thresholdDays) out.push({ exerciseId, name: nameFor(exerciseId), days })
  }
  return out.sort((a, b) => b.days - a.days)
}

/** Long enough away that the weights waiting for you are probably wrong. */
export const LAYOFF_DAYS = 21

/**
 * What you did last time, per lift, in the words you would say it in.
 *
 * "What did I get last week" is the question somebody is actually answering
 * when they decide today's numbers, and every other lifting app puts the answer
 * beside the input. This screen had it nowhere — the data was sitting in the
 * session logs the whole time.
 *
 * Reads the most recent session that CONTAINED the lift, not the most recent
 * session: on an alternating program the last session was the other day, and
 * "last time" means the last time you did this lift.
 */
export function lastTimePerLift(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  unitLabel: string
): Record<string, string> {
  const newestFirst = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const out: Record<string, string> = {}

  for (const log of newestFirst) {
    for (const entry of log.entries ?? []) {
      if (out[entry.exerciseId] || entry.sets.length === 0) continue
      const reps = entry.sets.map((s) => s.reps)
      const weights = entry.sets.map((s) => s.weight)
      const sameReps = reps.every((r) => r === reps[0])
      const sameWeight = weights.every((w) => w === weights[0])
      // Uniform sets collapse; anything else is listed, for the same reason
      // `describeSets` refuses to flatten a wave — "5 × 5" would be a lie.
      const body = sameReps && sameWeight
        ? `${entry.sets.length} × ${reps[0]} @ ${formatLoad(weights[0])} ${unitLabel}`
        : entry.sets.map((s) => `${formatLoad(s.weight)}×${s.reps}`).join(", ")
      out[entry.exerciseId] = `${body} · ${new Date(log.logged_at).toLocaleDateString()}`
    }
  }
  return out
}

/**
 * Exercise ids in a logged session that the program does not contain.
 *
 * A session was accepted, stored and returned 200 while naming lifts that do
 * not exist in the enrollment's program — `bench` against a program whose lift
 * is `ul_bench`. Nothing downstream could recover: the engine has no state to
 * progress for an id it has never seen, and every screen that turns an id back
 * into a name falls through to printing the raw id for ever.
 *
 * Returns the offending ids rather than a boolean, because "unknown exercise"
 * with no name is a support ticket rather than an error message.
 *
 * An ENDURANCE session legitimately has no entries at all, so an empty list is
 * always valid — this only ever rejects an id that was actually sent.
 */
export function unknownExerciseIds(
  program: ProgramDefinition,
  entries: { exerciseId: string }[]
): string[] {
  if (entries.length === 0) return []
  const known = new Set<string>()
  // `scheduleDays` throws on an endurance plan, which genuinely has weeks and
  // not days. Such a plan has no exercises at all, so ANY entry sent against it
  // is unknown — that is the answer, not a crash.
  if (program.schedule.kind !== "endurance_weeks") {
    for (const day of scheduleDays(program.schedule)) {
      for (const ex of day.exercises) known.add(ex.id)
    }
  }
  return [...new Set(entries.map((e) => e.exerciseId))].filter((id) => !known.has(id))
}


/**
 * Which plates to load for a target weight.
 *
 * "What do I put on the bar" is arithmetic somebody does in their head between
 * sets, gets wrong, and then lifts the wrong weight — which is why every serious
 * lifting app has this and why its absence is a standing complaint. It is pure
 * arithmetic, so it lives here rather than in a component.
 *
 * THREE ANSWERS IT HAS TO BE ABLE TO GIVE, and the reason this is not two lines:
 *   - the exact plates, when the number is loadable;
 *   - the closest it can get, SAID to be approximate, when it is not — a
 *     silently-rounded answer would have somebody lift a different weight than
 *     the one on their screen;
 *   - "just the bar", when the target is at or below the bar, rather than an
 *     empty list that reads as "no answer".
 *
 * Greedy from the heaviest plate down, which is both what a person does and
 * optimal for any real plate set (each plate divides the next one up).
 */
export function platesFor(target: number, unit: UnitSystem, setup?: PlateSetup): PlateLoad {
  const barWeight = setup?.barWeight ?? DEFAULT_PLATES[unit].barWeight
  if (target <= barWeight) {
    return { perSide: [], achievable: barWeight, approximate: target < barWeight, barOnly: true }
  }

  let remainingPerSide = (target - barWeight) / 2
  const perSide: number[] = []
  // Only plates this gym has: a 1.25 kg plate in the list when the person owns
  // nothing under 2.5 would show a load they cannot make.
  const smallest = setup?.smallestPlate ?? DEFAULT_PLATES[unit].smallestPlate
  for (const plate of PLATES[unit].filter((p) => p >= smallest - 1e-9)) {
    // A hair of tolerance: (target - bar) / 2 on a .5 kg increment is exact in
    // decimal but not in binary, and a strict >= would drop the last 1.25.
    while (remainingPerSide >= plate - 1e-9) {
      perSide.push(plate)
      remainingPerSide -= plate
    }
  }
  const achievable = barWeight + perSide.reduce((t, p) => t + p, 0) * 2
  return {
    perSide,
    achievable: Math.round(achievable * 100) / 100,
    approximate: Math.abs(achievable - target) > 1e-9,
    barOnly: perSide.length === 0,
  }
}

/** "20 + 10 + 2.5 per side" — the plate load as somebody would say it. */
export function describePlates(load: PlateLoad, unitLabel: string): string {
  if (load.barOnly) return "just the bar"
  const counted = load.perSide.reduce<{ plate: number; n: number }[]>((acc, p) => {
    const last = acc[acc.length - 1]
    if (last && last.plate === p) last.n++
    else acc.push({ plate: p, n: 1 })
    return acc
  }, [])
  const body = counted.map((c) => (c.n > 1 ? `${c.n}×${c.plate}` : `${c.plate}`)).join(" + ")
  return `${body} per side${load.approximate ? ` (makes ${load.achievable} ${unitLabel})` : ""}`
}

/**
 * Rebuild an enrollment's state by replaying every session from the start.
 *
 * EDITING A PAST SESSION HAS TO CHANGE WHAT COMES NEXT, or it is not a
 * correction — it is a note. But the state a log advanced FROM is not stored:
 * `exercise_state` only ever holds where you are now, so a single log cannot be
 * reversed. There is nothing to subtract.
 *
 * Replay is the way out, and it is available only because the engine is pure.
 * Seed the enrollment exactly as it was created, then fold every session over it
 * in order. The result is what the state would have been had the corrected
 * session been logged that way originally — which is the whole feature, and the
 * thing its test asserts.
 *
 * Deliberately takes the seed rather than deriving it: the level's starting
 * weights are the enrollment's own history and re-resolving them from today's
 * catalogue would silently rewrite somebody's past if a program were ever
 * corrected upstream.
 *
 * `program` IS THE CATALOGUE PROGRAM, not the enrollment's edited version. The
 * signature has not changed — what it means has. A `schedule` event in the
 * history says what the week looked like from that moment, and the walk
 * switches to it as it passes; so a program edited three times replays each
 * session against the week that was in force when it was logged, rather than
 * against today's. With no schedule events (every test that predates them, and
 * every enrollment that was never edited) `program` is used throughout, which
 * is exactly the old behaviour.
 */
export function replayEnrollment(
  program: ProgramDefinition,
  seed: ProgramEnrollment,
  logs: { entries: LoggedExercise[]; logged_at: string; dayId: string; cycle: number; week: number }[],
  events: ReplayEvent[] = []
): ProgramEnrollment {
  /**
   * EVERYTHING THAT CHANGED THE STATE, IN THE ORDER IT HAPPENED.
   *
   * Sessions used to be the whole history, and they are not: skipping a session
   * advances the plan without logging anything, a reset rewinds the cursor on
   * purpose, and a manual weight change is the lifter overruling the engine.
   * None of the three were replayed, so deleting one session re-prescribed
   * every session that had been skipped and quietly undid a reset.
   */
  const timeline: Array<
    | { at: string; kind: "log"; log: (typeof logs)[number] }
    | { at: string; kind: "event"; event: ReplayEvent }
  > = [
    ...logs.map((log) => ({ at: log.logged_at, kind: "log" as const, log })),
    ...events.map((event) => ({ at: event.at, kind: "event" as const, event })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  let state: ProgramEnrollment = {
    ...seed,
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
  }
  /** The week in force at this point in the walk. */
  let current = program

  for (const step of timeline) {
    if (step.kind === "log") {
      state = applyLog(current, state, {
        enrollment_id: seed.id,
        dayId: step.log.dayId,
        cycle: step.log.cycle,
        week: step.log.week,
        entries: step.log.entries,
      }).enrollment
      continue
    }
    const event = step.event
    if (event.kind === "schedule") {
      current = effectiveProgram(program, event.schedule)
      /**
       * THE CURSOR HAS TO LAND ON A DAY THAT EXISTS.
       *
       * Without this clamp, a week edited down from four days to two leaves the
       * cursor at index 3; the next session logged on a day the edit removed
       * falls back to that index in `applyLog`, and `dayAt` throws — mid-replay,
       * which takes down the delete or correction that asked for the replay. The
       * crash this event exists to remove would have been re-introduced by the
       * event itself.
       */
      state = {
        ...state,
        exerciseState: { ...event.seeded, ...state.exerciseState },
        cursor: { ...state.cursor, dayIndex: clampCursorDay(current.schedule, state.cursor.dayIndex) },
      }
    } else if (event.kind === "skip") {
      // The same call the skip endpoint makes: no entries, so every lift holds
      // and only the cursor moves.
      state = applyLog(current, state, {
        enrollment_id: seed.id,
        dayId: "",
        cycle: state.cursor.cycle,
        week: state.cursor.week,
        entries: [],
      }).enrollment
    } else if (event.kind === "reset") {
      // Rewinds the plan and KEEPS the weights — exactly what the button does.
      state = { ...state, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } }
    } else {
      // The lifter set the weight themselves. It survives a later correction,
      // and it clears the fail counter: they have decided the number is right.
      const prev = state.exerciseState[event.exerciseId]
      if (prev) {
        state = {
          ...state,
          exerciseState: {
            ...state.exerciseState,
            [event.exerciseId]: { ...prev, workingWeight: event.to, consecutiveFails: 0 },
          },
        }
      }
    }
  }
  return state
}

/**
 * The schedule event an older enrollment never got to record.
 *
 * WHAT IT IS FOR, in plain language. Programs edited (or written from scratch)
 * before the history started recording the week have a `custom_schedule` and no
 * record of where it came from. Replaying one of those runs its very first
 * session against the catalogue's own week — and for a program somebody wrote
 * themselves that week is a single placeholder day, so the replay throws and the
 * delete or correction that asked for it fails.
 *
 * So one is synthesised, dated the moment the program started: from the
 * beginning, this week was in force. `seeded` is the state of every lift that is
 * not in the starting weights — those lifts came in with an edit, their weights
 * were written into the live state and nowhere else, and the fail counter is
 * cleared because what it counted happened under a week we cannot reconstruct.
 *
 * HONEST LIMIT. For these rows every session replays against TODAY's week,
 * because the week each was logged under was never kept. The crash goes away;
 * the fall-back to the cursor for a session logged on a day a later edit removed
 * does not, and cannot — that fact was never stored.
 *
 * Returns null when there is nothing to repair, which is every program started
 * after this became part of the history.
 */
export function repairUneventfulEdit(enr: ProgramEnrollment): ReplayEvent | null {
  if (!enr.customSchedule) return null
  if ((enr.replayEvents ?? []).some((e) => e.kind === "schedule")) return null

  const seed = enr.initialExerciseState ?? {}
  const seeded: Record<string, ExerciseState> = {}
  for (const [id, state] of Object.entries(enr.exerciseState)) {
    if (seed[id]) continue
    seeded[id] = { ...state, consecutiveFails: 0 }
  }

  return { at: enr.started_at, kind: "schedule", schedule: enr.customSchedule, seeded }
}

/**
 * How long an endurance session is meant to take, in minutes.
 *
 * Lived as a private helper inside one screen, which is why the live workout
 * had nothing to say about a cardio session: the only code that understood a
 * run was inside the form that logged one. A block with no duration (a distance
 * target, "run 5 km") contributes nothing, and the floor is one minute so a
 * session can never be recorded as having taken no time.
 */
export function enduranceMinutes(sets: EnduranceSet[]): number {
  const seconds = sets.reduce(
    (total, set) => total + set.repeat * set.blocks.reduce((b, blk) => b + (blk.durationSec ?? 0), 0),
    0
  )
  return Math.max(1, Math.round(seconds / 60))
}

// ============================================================================
// What a workout counts as
// ============================================================================

/**
 * What kind of session this program's workouts count as.
 *
 * ONE PLACE DECIDES, and until now nowhere did. Starting a workout hard-coded
 * `session_type: "weights"`, so every live run was stored as a gym session and
 * the running tiles on the dashboard never moved. Finishing had a follow-up
 * write that could have corrected it — except its error was thrown away and no
 * caller ever sent the value, so the whole path was dead code pretending to be
 * a fallback.
 *
 * A calisthenics session is weights (it counts towards gym sessions), a
 * mobility routine is mobility, a running plan is running, and a multi-sport
 * plan is generic cardio. `null` — a workout answering no program at all — is
 * weights, which is what the dashboard has always assumed; Phase 6 gives a
 * loose workout a way to say otherwise.
 *
 * Here rather than in `programRepo` so `workoutRepo` can ask it at the moment a
 * workout STARTS, which is the only moment anything actually knows.
 */
export function sessionTypeFor(
  program: ProgramDefinition | null
): "weights" | "cardio" | "running" | "mobility" {
  if (!program) return DEFAULT_SESSION_TYPE
  if (program.metricType === "endurance") {
    return program.discipline === "triathlon" || program.discipline === "ironman"
      ? "cardio"
      : "running"
  }
  if (program.metricType === "hold_range") return "mobility"
  return DEFAULT_SESSION_TYPE
}

// ============================================================================
// What is left undone at the end of a workout
// ============================================================================

/**
 * What is unfinished, and what that means — told apart from what was ADDED.
 *
 * WHAT WENT WRONG. An added lift gets three empty rows on the live screen so
 * there is somewhere to put the sets. The finish sheet counted those rows as
 * sets the program had asked for, so "Front Squat 0 of 3" appeared under
 * "These count as misses and will bring the weight down" — for a lift nobody
 * had prescribed, at a weight the program does not track, from a count the app
 * invented. A lift you chose to do is never a lift you failed to do.
 *
 * `short` is the real thing: a prescribed lift with some sets left. `asked > 0`
 * because a lift with nothing prescribed cannot be short of anything, and
 * skipped lifts are left out entirely — skipping is already a decision the
 * person made.
 *
 * `untouchedAdded` is a lift added on the day with no ticked set. It belongs on
 * the sheet (you meant to do it and did not) but with no "of N" and no miss
 * wording. An added lift with even one ticked set is on neither list: it
 * happened, and there is no plan for it to fall short of.
 *
 * Pure, and formats nothing — the sheet decides the words.
 */
/**
 * WHAT A MISS ACTUALLY COSTS, per lift.
 *
 * The finish sheet said "these count as misses and will bring the weight
 * down" over every short lift. For StrongLifts that is false twice out of
 * three times: the rule is three consecutive misses before a deload, so the
 * first two hold the weight exactly where it is. The app was telling somebody
 * their squat was about to drop when it was not — which is the kind of
 * sentence that makes people fake a set.
 *
 * `held` is for a lift that was skipped or swapped: it is not a miss at all
 * and must not be counted as one.
 */
/**
 * What today's miss does to this lift, in the program's own terms.
 *
 * `unknown` when the program has no linear rule to read — a skill ladder or a
 * hold routine does not deload, and claiming either outcome would be inventing
 * one.
 */
export function missOutcome(rule: MissRule | undefined): MissOutcome {
  if (!rule || rule.deloadAfter == null) return "unknown"
  return rule.failsSoFar + 1 >= rule.deloadAfter ? "deload" : "hold"
}

/** The sentence for one short lift, in the program's own numbers. */
export function missWording(outcome: MissOutcome, rule?: MissRule): string {
  switch (outcome) {
    case "held":
      return "not counted"
    case "deload": {
      const pct = rule?.deloadPct != null ? Math.round(rule.deloadPct * 100) : null
      return pct != null
        ? `miss ${(rule?.failsSoFar ?? 0) + 1} of ${rule?.deloadAfter} — the weight drops ${pct}%`
        : `miss ${(rule?.failsSoFar ?? 0) + 1} of ${rule?.deloadAfter} — the weight drops`
    }
    case "hold":
      return `miss ${(rule?.failsSoFar ?? 0) + 1} of ${rule?.deloadAfter} — the weight stays`
    default:
      // No rule to read, so no promise about what happens next.
      return "counts as a miss"
  }
}

/**
 * The deload rule per lift, read from the program and the enrollment.
 *
 * Pure, so the sheet's sentence and the engine's behaviour are read from the
 * same two numbers rather than one being typed out by hand — which is how the
 * old sentence came to describe a rule the engine does not have.
 */
export function missRulesFor(
  program: ProgramDefinition,
  enrollment: Pick<ProgramEnrollment, "exerciseState">
): Record<string, MissRule> {
  const out: Record<string, MissRule> = {}
  for (const day of scheduleDaysOrNone(program.schedule)) {
    for (const ex of day.exercises) {
      const progression = (ex as { progression?: { kind?: string; deloadAfterFails?: number; deloadPct?: number } })
        .progression
      const linear = progression?.kind === "linear_load" ? progression : null
      out[ex.id] = {
        failsSoFar: enrollment.exerciseState[ex.id]?.consecutiveFails ?? 0,
        deloadAfter: linear?.deloadAfterFails ?? null,
        deloadPct: linear?.deloadPct ?? null,
      }
    }
  }
  return out
}

export function unfinishedLifts(
  prescribed: PrescribedExercise[],
  adjustments: WorkoutAdjustments,
  sets: LiveWorkoutSet[]
): {
  short: { exerciseId: string; name: string; done: number; asked: number }[]
  untouchedAdded: { exerciseId: string; name: string }[]
} {
  const skipped = new Set(adjustments.skipped ?? [])
  const added = adjustments.added ?? []
  const addedIds = new Set(added.map((a) => a.exerciseId))

  /** Ticked WORKING sets per lift — a warm-up is not one of the sets asked for. */
  const doneByLift = new Map<string, number>()
  for (const s of sets) {
    if (s.kind === "warmup") continue
    const key = s.exerciseId ?? s.exercise
    doneByLift.set(key, (doneByLift.get(key) ?? 0) + 1)
  }

  const short = prescribed
    .filter((ex) => !skipped.has(ex.exerciseId) && !addedIds.has(ex.exerciseId))
    .map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      done: doneByLift.get(ex.exerciseId) ?? 0,
      asked: ex.sets.length,
    }))
    .filter((u) => u.asked > 0 && u.done < u.asked)

  const untouchedAdded = added
    .filter((a) => !skipped.has(a.exerciseId) && (doneByLift.get(a.exerciseId) ?? 0) === 0)
    .map((a) => ({ exerciseId: a.exerciseId, name: a.name }))

  return { short, untouchedAdded }
}

// ============================================================================
// The training card on the dashboard
// ============================================================================


/** After this long, an open workout is forgotten rather than running. */
export const STALE_WORKOUT_HOURS = 6

/**
 * ONE OWNER FOR THE SIX-HOUR RULE.
 *
 * It existed twice — here, and as a private `STALE_HOURS = 6` inside
 * `TodayCard.tsx`. Two constants for one rule is two rules waiting to
 * disagree, on two screens that describe the same workout.
 */
export function isStaleWorkout(startedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(startedAt).getTime() > STALE_WORKOUT_HOURS * 3_600_000
}

/**
 * WHICH SCREEN THE ADDRESS BAR IS ASKING FOR.
 *
 * Pure, and the only reader of these five parameters. The screen used to keep
 * its tab and its view in React state, so a link could not name either, Back
 * always landed on the inventory, and the server could not resolve the first
 * paint — you saw today's session appear a moment after the page did.
 *
 * ANYTHING UNKNOWN FALLS BACK TO TODAY rather than to an error. A URL is
 * something anyone can type, and a mistyped one should land on the screen
 * somebody would have wanted, not on a dead end.
 *
 * `?program=` is the exception, because silently ignoring it would be the app
 * showing a different program from the one the link named: when the id is not
 * a program you are running, the id is dropped AND `notice` says so.
 */
export function parseProgramsLocation(
  params: URLSearchParams,
  running: readonly { id: string }[]
): ProgramsLocation {
  const tabs = ["today", "history", "progress"] as const
  const views = ["today", "programs", "detail", "edit"] as const

  const asked = params.get("tab")
  const tab = (tabs as readonly string[]).includes(asked ?? "")
    ? (asked as ProgramsLocation["tab"])
    : "today"

  const askedView = params.get("view")
  const view = (views as readonly string[]).includes(askedView ?? "")
    ? (askedView as ProgramsLocation["view"])
    : "today"

  const askedProgram = params.get("program")
  const isRunning = askedProgram !== null && running.some((e) => e.id === askedProgram)
  const programId = isRunning ? askedProgram : null
  const notice =
    askedProgram !== null && !isRunning ? "That program is not running any more" : null

  return {
    tab,
    view,
    programId,
    catalogId: view === "detail" ? params.get("catalog") : null,
    enrollmentId: view === "edit" ? params.get("enrollment") : null,
    // Checked for the open-redirect tricks a `?from=` can carry.
    from: readReturn(params.get("from")),
    notice,
  }
}

/**
 * WHICH ROWS "AS SHOWN" MAY TICK FOR YOU.
 *
 * The deleted "I did all of this — save it" button saved every prescribed row
 * at its prescribed numbers. For two kinds of row that INVENTS a number:
 *
 *   - a rep-range row ("8–12") carries the BOTTOM of the range in `reps`
 *     (`types.ts:543`), so "as shown" would record the worst set you could
 *     have done as the set you did
 *   - an AMRAP row carries a MINIMUM, and the whole point of the row is the
 *     number you got above it
 *   - a bodyweight row prescribed 0 reps has no prescription at all
 *
 * Those three are left for the person. Everything else has exactly one
 * defensible reading, and the label counts only what it will actually tick —
 * "Did the 4 fixed sets as shown" on a 5/3/1 day whose fifth row is the AMRAP.
 *
 * `done` is the set numbers already recorded: ticking one twice would file a
 * second set at the same number.
 */
export function fixedRowsToTick<T extends { setNumber: number; reps: number; repRangeMax?: number | null; amrap?: boolean | null }>(
  rows: readonly T[],
  done: ReadonlySet<number>
): T[] {
  return rows.filter(
    (r) =>
      !done.has(r.setNumber) &&
      !r.amrap &&
      (r.repRangeMax === null || r.repRangeMax === undefined) &&
      r.reps > 0
  )
}

/**
 * WHICH PROGRAM THE CARD IS ABOUT — a rule, not a position in a list.
 *
 * It was `enrollments[0]`: the most recently started, whatever that happened
 * to be. Run a lifting program and a running plan and the card showed one of
 * them and said nothing about the other, so half of somebody's training was
 * invisible on the page that is meant to be the door to it.
 *
 * In order: the program the open workout belongs to; the one already trained
 * today (so the done state, its link and its "also" line all name the same
 * program); then, among those with a session actually due, the one most
 * recently trained, ties to the earliest started. A never-trained program is
 * chosen only when nothing else qualifies.
 */
export function chooseCardEnrollment(
  facts: TrainingDoorFacts,
  trainedTodayEnrollmentId: string | null
): { chosen: TrainingDoorFacts["programs"][number] | null; also: AlsoRunning[] } {
  const all = facts.programs
  if (all.length === 0) return { chosen: null, also: [] }

  const alsoFor = (chosen: TrainingDoorFacts["programs"][number]) =>
    all
      .filter((p) => p.enrollment.id !== chosen.enrollment.id)
      .map((p) => ({
        enrollmentId: p.enrollment.id,
        name: enrollmentName(p.enrollment),
        todayLabel: p.prescription.restDay ? null : p.prescription.dayLabel,
      }))

  const pick = (from: TrainingDoorFacts["programs"]) =>
    [...from].sort((a, b) => {
      const at = a.enrollment.lastLoggedAt ?? ""
      const bt = b.enrollment.lastLoggedAt ?? ""
      // Most recently trained first; never-trained last.
      if (at !== bt) return bt.localeCompare(at)
      return a.enrollment.started_at.localeCompare(b.enrollment.started_at)
    })[0]

  const byId = (id: string | null) => (id ? all.find((p) => p.enrollment.id === id) : undefined)

  const chosen =
    byId(facts.live?.enrollmentId ?? null) ??
    byId(trainedTodayEnrollmentId) ??
    // Due today: not resting, not finished.
    pick(all.filter((p) => !p.prescription.restDay && !p.prescription.isComplete)) ??
    pick(all)

  return { chosen: chosen ?? null, also: chosen ? alsoFor(chosen) : [] }
}

/**
 * WHAT IS NEXT, after today — one owner.
 *
 * A rest day used to be a dead end: "nothing today" and no way to see what was
 * coming, on the one screen meant to be a door. And after finishing a session
 * on a weekday-pinned program nothing could say what was next at all, because
 * `getTodaySession` answers with today's own day again.
 */
export function nextSessionAfterToday(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  todayWeekday: number
): { dayId: string; label: string; weekday?: number } | null {
  const schedule = effectiveProgram(program, enrollment.customSchedule).schedule
  const days = scheduleDaysOrNone(schedule)
  if (days.length === 0) return null

  if (isWeekdayAnchored(schedule)) {
    // Tomorrow's weekday, wrapping Sunday → Monday. `pickTodaysDay` walks
    // forward from there to the nearest pinned day.
    const tomorrow = (todayWeekday % 7) + 1
    const picked = pickTodaysDay(schedule, tomorrow)
    if (!picked) return null
    const day = days[picked.dayIndex]
    return {
      dayId: day.id,
      label: day.label,
      ...(picked.scheduledWeekday != null ? { weekday: picked.scheduledWeekday } : {}),
    }
  }

  // In sequence: the cursor's day, which a finished session has already moved.
  const next = computePrescription(program, enrollment)
  return { dayId: next.dayId, label: next.dayLabel }
}

/**
 * WHAT DISTANCE IS ASKED FOR IN, and the one conversion.
 *
 * Somebody training in pounds thinks in miles, and asking them for kilometres
 * is the same class of mistake as showing them kilograms. The STORED value is
 * always kilometres — one unit in the database, as with weight — so the
 * conversion happens once, here, rather than in whichever screen remembers.
 */
export const distanceUnitFor = (unit: UnitSystem): "km" | "miles" => (unit === "lb" ? "miles" : "km")

const KM_PER_MILE = 1.609344

/** A typed distance, in whatever the person was asked for, as kilometres. */
export function toKmFromDisplay(value: number, unit: UnitSystem): number {
  return unit === "lb" ? round2(value * KM_PER_MILE) : round2(value)
}

/** And back, for showing a stored distance in what they were asked in. */
export function fromKmToDisplay(km: number, unit: UnitSystem): number {
  return unit === "lb" ? round2(km / KM_PER_MILE) : round2(km)
}

/**
 * A RUN DESCRIBED IN WORDS, because it has no lifts to count.
 *
 * The card printed a lift count, which is 0 for every endurance day — so a
 * Couch to 5K session appeared on the dashboard as a name and nothing else,
 * and the one thing a person wants to know before putting their shoes on
 * (how long, and what the intervals are) was on another screen.
 */
export function describeEndurance(sets: EnduranceSet[]): { blocks: string; minutes: number } {
  const blocks = sets
    .map((set) => {
      const inner = set.blocks.map((b) => b.label).join(" / ")
      return set.repeat > 1 ? `${set.repeat} × ${inner}` : inner
    })
    .join(" · ")
  return { blocks, minutes: enduranceMinutes(sets) }
}

/**
 * WHAT THE DOOR SAYS ABOUT TRAINING RIGHT NOW.
 *
 * ORDER OF PRECEDENCE, and each step of it is a complaint that was made:
 *
 *   1. A workout in progress beats everything. Somebody standing in a gym does
 *      not need to be told what today's session is; they need the way back in.
 *   2. A workout open for hours is a different thing — almost certainly
 *      forgotten, and "Resume · 431 min" is the app pretending not to notice.
 *   3. A session already finished today. The card used to say Start, which
 *      invites a second workout on a day you have already trained.
 *   4. Then, and only then, what is due.
 *
 * WHOSE TODAY. `trainedToday` is the ONE place in the app that turns a
 * workout's instant into "today" for this card, and it does it on the
 * account's calendar — which is what makes a 23:45 Copenhagen session count as
 * Monday and a 00:10 one count as Tuesday. `now` is used for elapsed minutes
 * and nothing else.
 *
 * Pure, and formats nothing: labels, counts and instants come out, and how
 * they are worded is the card's business. A pure function that returns a
 * sentence cannot be reused by anything that words it differently — and Phase
 * 5's Today card reuses exactly this one.
 */
export function trainingCardState(facts: TrainingDoorFacts, now: Date = new Date()): TrainingCardState {
  const trainedToday = facts.recentlyFinished.filter(
    (w) => getTodayInTimezone(facts.timezone, new Date(w.loggedAt)) === facts.todayDate
  )
  const newestToday = trainedToday[0] ?? null

  const { chosen, also } = chooseCardEnrollment(facts, newestToday?.enrollmentId ?? null)

  if (facts.live) {
    const elapsed = Math.max(0, now.getTime() - new Date(facts.live.startedAt).getTime())
    const open = {
      workoutId: facts.live.id,
      enrollmentId: facts.live.enrollmentId,
      dayLabel: facts.live.dayLabel,
      startedAt: facts.live.startedAt,
      setsTicked: facts.live.setsTicked,
      setsAsked: facts.live.setsAsked,
      also,
    }
    void elapsed
    return isStaleWorkout(facts.live.startedAt, now)
      ? {
          kind: "stale",
          ...open,
          // Named HERE, where the account's zone is known. Both cards print
          // it and both used to derive it from the browser's clock.
          startedOnWeekday: weekdayNameIn(facts.live.startedAt, facts.timezone),
        }
      : { kind: "live", ...open }
  }

  if (newestToday) {
    return {
      kind: "done",
      workoutId: newestToday.workoutId,
      enrollmentId: newestToday.enrollmentId,
      dayLabel: newestToday.dayLabel,
      durationMin: newestToday.durationMin,
      sets: newestToday.sets,
      next: chosen?.next ? { label: chosen.next.label, ...(chosen.next.weekday != null ? { weekday: chosen.next.weekday } : {}) } : null,
      also,
    }
  }

  if (!chosen) return { kind: "none" }

  const { enrollment, prescription } = chosen

  if (prescription.isComplete) {
    return {
      kind: "finished",
      enrollmentId: enrollment.id,
      name: enrollmentName(enrollment),
      sessions: prescription.sessionCount,
      startedAt: enrollment.started_at,
      also,
    }
  }

  if (prescription.restDay) {
    // A rest day with nowhere to go was the dead end. `next` is why this state
    // is worth showing at all.
    if (!chosen.next) return { kind: "none" }
    return {
      kind: "rest",
      enrollmentId: enrollment.id,
      nextDayId: chosen.next.dayId,
      nextLabel: chosen.next.label,
      ...(chosen.next.weekday != null ? { nextWeekday: chosen.next.weekday } : {}),
      also,
    }
  }

  const endurance =
    prescription.exercises.length === 0 && prescription.enduranceSets
      ? describeEndurance(prescription.enduranceSets)
      : undefined

  return {
    kind: "today",
    enrollmentId: enrollment.id,
    dayId: prescription.dayId,
    dayLabel: prescription.dayLabel,
    // BY NAME. "3 lifts" does not tell anybody whether to bring their belt.
    lifts: prescription.exercises.map((e) => e.name),
    ...(endurance ? { endurance } : {}),
    ...(chosen.lastTimeThisDay ? { lastTime: chosen.lastTimeThisDay } : {}),
    also,
  }
}
