/**
 * Database repository for Workout Programs (M1).
 *
 * Owns all DB access for `program_enrollments`, and is the orchestration
 * boundary for stateful actions: it fetches state, runs the PURE engine
 * (src/programs/programsService.ts), then persists.
 *
 * A SESSION IS A WORKOUT. There used to be a `program_session_logs` table
 * holding a second copy of every session for the engine, beside the
 * `workout_logs` / `workout_sets` rows the dashboard read, with nothing joining
 * them — so deleting a session left a ghost in every count and chart, and
 * editing one reached neither. There is one record now; the engine's `entries`
 * are derived from the stored sets (`entriesFromSets`).
 */

import { createServerSupabaseClient } from "./supabase"
import {
  applyLog,
  computePrescription,
  seedEnrollment,
  replayEnrollment,
  repairUneventfulEdit,
  pickTodaysDay,
  entriesFromSets,
  weekSoFar,
  skipRefusal,
  RESET_EFFECT,
} from "@/src/programs/programsService"
import { getProgram, requireProgram, resolveProgramForLevel } from "@/src/programs/data/catalog"
import { ProgramRefused } from "@/src/programs/errors"
import {
  clampCursorDay,
  effectiveProgram,
  isCustomizable,
  seedForAddedExercises,
  applyWeightOverrides,
} from "@/src/programs/customize"
import { getUserClock } from "./settingsRepo"
import { isoWeekdayInTimezone } from "@/src/shared/dateUtils"
import {
  DEFAULT_PLATES,
  KG_PER_LB,
} from "@/src/programs/config"
import { FINISHED_WORKOUTS_FILTER } from "./healthRepo"
import { readAllRows } from "./paging"
import type {
  EnrollmentDetail,
  ExerciseState,
  LevelId,
  LoggedExercise,
  ProgramEnrollment,
  ProgramEnrollmentRow,
  ProgramSchedule,
  ProgramSessionLogRow,
  ReplayEvent,
  StoredSet,
  WorkoutAdjustments,
  SessionPrescription,
  UnitSystem,
} from "@/src/programs/types"

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function toDomain(row: ProgramEnrollmentRow): ProgramEnrollment {
  return {
    id: row.id,
    user_id: row.user_id,
    program_id: row.program_id,
    level: row.level,
    unitSystem: row.unit_system,
    exerciseState: row.exercise_state,
    cursor: row.cursor,
    is_active: row.is_active,
    started_at: row.started_at,
    customSchedule: row.custom_schedule ?? null,
    // The state this enrollment STARTED from. Replay folds history over this,
    // never over the catalogue's defaults — see the 20260907090000 migration.
    initialExerciseState: row.initial_exercise_state ?? undefined,
    replayEvents: row.replay_events ?? [],
    barWeightKg: row.bar_weight_kg ?? null,
    label: row.label ?? null,
    plates: plateSetupFor(row.bar_weight_kg, row.unit_system),
  }
}

/**
 * What this person's gym can load, in the enrollment's display unit.
 *
 * RESOLVED ON THE WAY OUT of the database so the engine stays pure and every
 * weight it prescribes is one that can actually be put on a bar. Nothing could
 * be prescribed below the standard 20 kg bar before this existed: a lighter
 * lifter's 15 kg press was rounded up at enrolment, and "deload 10%" from 20
 * landed back on 20 for ever.
 */
export function plateSetupFor(
  barWeightKg: number | null,
  unit: UnitSystem,
  /**
   * THE PLATE, WHICH THIS IGNORED ENTIRELY.
   *
   * It always returned `DEFAULT_PLATES[unit].smallestPlate` — 1.25 kg — however
   * the account was configured, so a home gym with nothing smaller than 2.5 kg
   * got prescriptions it could not load, and the deload message "this is already
   * the lightest your bar can be, use a lighter bar" named a fix the app had no
   * way to accept. Both are settings now; both are read here.
   */
  smallestPlateKg: number | null = null
) {
  const defaults = DEFAULT_PLATES[unit]
  const toUnit = (kg: number) => (unit === "kg" ? kg : Math.round((kg / KG_PER_LB) * 100) / 100)
  return {
    barWeight: barWeightKg == null ? defaults.barWeight : toUnit(barWeightKg),
    smallestPlate: smallestPlateKg == null ? defaults.smallestPlate : toUnit(smallestPlateKg),
  }
}

/**
 * The program this enrollment actually runs.
 *
 * THE customization boundary. The engine is pure and knows nothing about
 * user edits; it just reads `program.schedule`. Resolving here — once, on the
 * way out of the database — means every prescription, progression and bridge
 * downstream operates on the user's version automatically.
 */
export function programFor(enrollment: ProgramEnrollment) {
  return effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)
}


// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function listActiveEnrollments(userId: string): Promise<ProgramEnrollment[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("started_at", { ascending: false })
  if (error) throw new Error(`Failed to list enrollments: ${error.message}`)
  const enrollments = (data ?? []).map((r) => toDomain(r as ProgramEnrollmentRow))
  if (enrollments.length === 0) return enrollments

  /**
   * WHEN EACH WAS LAST TRAINED — the difference between a program and a ghost.
   *
   * One query for all of them rather than one per enrollment: this list is read
   * on the tracking dashboard, on /programs and on the Life Mastery templates
   * tab, and N+1 on a page somebody opens daily is a cost paid forever.
   *
   * Not stored on the enrollment. It is a fact about `workout_logs`,
   * and a second copy of it would be one more pair of things that can disagree
   * — which is the exact bug this area is being dug out of.
   */
  /**
   * ONE QUERY PER RUNNING PROGRAM, asking only for the newest row.
   *
   * This read EVERY workout of every running program to find the latest date of
   * each, which is an unbounded read: past a thousand sessions the database
   * silently returns a thousand and "last trained" became whatever that page
   * happened to reach. The N+1 the old comment feared is bounded by the number
   * of disciplines — there is at most one running program per discipline, so
   * this is a handful of single-row queries, not one per row.
   */
  const lastByEnrollment = new Map<string, string>()
  for (const e of enrollments) {
    const { data: latest, error: logErr } = await supabase
      .from("workout_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .eq("enrollment_id", e.id)
      .or(FINISHED_WORKOUTS_FILTER)
      .order("logged_at", { ascending: false })
      .limit(1)
    if (logErr) throw new Error(`Failed to read session history: ${logErr.message}`)
    const row = (latest ?? [])[0] as { logged_at: string } | undefined
    if (row) lastByEnrollment.set(e.id, row.logged_at)
  }
  return enrollments.map((e) => ({ ...e, lastLoggedAt: lastByEnrollment.get(e.id) ?? null }))
}

/**
 * Programs that have been ended, newest first.
 *
 * Ending a program archives it rather than deleting it — but nothing read the
 * archive, so a year of StrongLifts became invisible the moment somebody moved
 * on to 5/3/1. Keeping a record nobody can see is only marginally better than
 * not keeping it.
 *
 * Same one-query `lastLoggedAt` derivation as the active list; a past program
 * with no sessions is somebody who started it and never went.
 */
export async function listPastEnrollments(userId: string): Promise<ProgramEnrollment[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", false)
    .order("started_at", { ascending: false })
  if (error) throw new Error(`Failed to list past programs: ${error.message}`)
  const enrollments = (data ?? []).map((r) => toDomain(r as ProgramEnrollmentRow))
  if (enrollments.length === 0) return enrollments

  /**
   * PAGED, because this one really does need every row: a finished program shows
   * how many sessions it held, and a count cut off at a thousand is wrong for
   * exactly the people who used the program most.
   */
  const logs = await readAllRows<{ enrollment_id: string; logged_at: string }>(
    "past program sessions",
    (from, to) =>
      supabase
        .from("workout_logs")
        .select("enrollment_id, logged_at")
        .eq("user_id", userId)
        .in("enrollment_id", enrollments.map((e) => e.id))
        .or(FINISHED_WORKOUTS_FILTER)
        // Ordered by id, not by date: paging is two reads of a moving table and
        // rows that tie on a date can appear in both pages.
        .order("id", { ascending: true })
        .range(from, to)
  )

  const counts = new Map<string, { last: string; n: number }>()
  for (const row of logs) {
    const cur = counts.get(row.enrollment_id)
    if (!cur) counts.set(row.enrollment_id, { last: row.logged_at, n: 1 })
    else {
      cur.n++
      // Not ordered by date any more, so the latest is taken by comparison.
      if (row.logged_at > cur.last) cur.last = row.logged_at
    }
  }
  return enrollments.map((e) => ({
    ...e,
    lastLoggedAt: counts.get(e.id)?.last ?? null,
    sessionsLogged: counts.get(e.id)?.n ?? 0,
  }))
}

export async function getEnrollmentById(userId: string, id: string): Promise<ProgramEnrollment | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get enrollment: ${error.message}`)
  }
  return toDomain(data as ProgramEnrollmentRow)
}

/**
 * Enroll in a program. Follows level routing (Layer-1), seeds initial state via
 * the engine, and enforces one active enrollment per DISCIPLINE (deactivates a
 * prior active program in the same discipline). Returns enrollment + first session.
 */
export async function enrollInProgram(
  userId: string,
  input: {
    programId: string
    level: LevelId
    unitSystem: UnitSystem
    oneRepMaxes?: Record<string, number>
    workingWeights?: Record<string, number>
    customSchedule?: ProgramSchedule | null
    /** The bar this is trained on, when it is not the standard one. */
    barWeightKg?: number | null
    /** What the person calls it — a self-built week's own name. */
    label?: string | null
  }
): Promise<{
  enrollment: ProgramEnrollment
  prescription: SessionPrescription
  /** Programs paused to make room for this one. Reported, never silent. */
  displaced: ProgramEnrollment[]
}> {
  const { program: catalogProgram, level } = resolveProgramForLevel(input.programId, input.level)
  // Seed against the schedule the user is actually enrolling in, so a lift they
  // added is seeded and one they removed is not.
  const program = effectiveProgram(catalogProgram, input.customSchedule)
  const { exerciseState, cursor } = seedEnrollment(
    program,
    level,
    input.unitSystem,
    input.oneRepMaxes,
    input.workingWeights,
    plateSetupFor(input.barWeightKg ?? null, input.unitSystem)
  )

  const supabase = await createServerSupabaseClient()
  /**
   * One active per discipline — but SAY what that costs.
   *
   * This quietly archived whatever else was running in the discipline, and the
   * program it most often took was the one somebody had written themselves: a
   * self-built program is filed under "strength", so starting StrongLifts
   * removed it without a word and nothing on any screen mentioned it again.
   * The rule stays; the silence does not.
   *
   * `getProgram`, not `requireProgram`: an old enrollment whose program has
   * since left the catalogue used to throw here, so one retired program on the
   * account made it impossible to start ANY new one. It is left alone and not
   * displaced, because nothing can say what discipline it was.
   */
  const sameDiscipline = (await listActiveEnrollments(userId)).filter(
    (e) => getProgram(e.program_id)?.discipline === program.discipline
  )
  /**
   * The sentence, before the write. The database refuses this too — the
   * busy-program trigger fires the moment anything tries to switch a program
   * off — but a refusal that arrives as a database exception has no words the
   * person can act on, and this is where they come from.
   */
  for (const e of sameDiscipline) await assertNoOpenWorkoutOn(userId, e.id)

  /**
   * ONE STATEMENT. This used to switch the old programs off and THEN insert the
   * new one, with nothing joining the two: a refused insert — the same program
   * already running, a weight the column cannot hold — left the person on no
   * program at all. `start_enrollment` does both inside one transaction, so a
   * refusal anywhere leaves the program you were on exactly as it was.
   */
  const { data, error } = await supabase.rpc("start_enrollment", {
    p_row: {
      user_id: userId,
      program_id: program.id,
      level,
      unit_system: input.unitSystem,
      exercise_state: exerciseState,
      // THE SEED, KEPT. Correcting a past session replays over this rather than
      // re-deriving it from the catalogue's level defaults, which is how
      // somebody who typed their real 100 kg squat had it silently replaced by
      // a beginner's 60 the first time they deleted a session.
      initial_exercise_state: exerciseState,
      cursor,
      custom_schedule: input.customSchedule ?? null,
      /**
       * THE WEEK IT STARTED AS, recorded from the first moment.
       *
       * A program started WITH its own schedule — every week somebody writes
       * themselves — had no record of what it began as, and the catalogue shell
       * it is filed under is a single placeholder day. Replaying its history
       * therefore ran its first sessions against that placeholder and threw.
       */
      replay_events: input.customSchedule
        ? [
            {
              at: new Date().toISOString(),
              kind: "schedule",
              schedule: input.customSchedule,
              seeded: {},
            },
          ]
        : [],
      bar_weight_kg: input.barWeightKg ?? null,
      label: input.label ?? null,
    },
    p_displace: sameDiscipline.map((e) => e.id),
  })
  if (error) {
    const refusal = refusalFrom(error)
    throw refusal instanceof ProgramRefused ? refusal : new Error(`Failed to enroll: ${error.message}`)
  }

  const enrollment = toDomain(data as ProgramEnrollmentRow)
  return { enrollment, prescription: computePrescription(program, enrollment), displaced: sameDiscipline }
}

/**
 * Idempotently enroll from a plan-builder selection. If the user is already
 * actively enrolled in the program this selection resolves to, it's a NO-OP
 * (preserves progression — re-saving the plan must not wipe weights). Only a
 * genuine change of program enrolls (which replaces the same-discipline active).
 */
export async function ensureEnrollment(
  userId: string,
  selection: {
    programId: string
    level: LevelId
    unitSystem: UnitSystem
    oneRepMaxes?: Record<string, number>
    workingWeights?: Record<string, number>
    customSchedule?: ProgramSchedule | null
  }
): Promise<{ enrollment: ProgramEnrollment; created: boolean }> {
  const resolvedId = resolveProgramForLevel(selection.programId, selection.level).program.id
  const existing = (await listActiveEnrollments(userId)).find((e) => e.program_id === resolvedId)
  if (existing) return { enrollment: existing, created: false }
  const { enrollment } = await enrollInProgram(userId, selection)
  return { enrollment, created: true }
}

/** All active enrollments as plan-builder selections (one per discipline) — for GET rehydrate. */
export async function listActiveSelections(
  userId: string
): Promise<{ programId: string; level: LevelId; unitSystem: UnitSystem; customSchedule: ProgramSchedule | null }[]> {
  return (await listActiveEnrollments(userId)).map((e) => ({
    programId: e.program_id,
    level: e.level,
    unitSystem: e.unitSystem,
    customSchedule: e.customSchedule,
  }))
}

/**
 * Stop a program. ARCHIVES IT — never deletes it.
 *
 * THIS USED TO DESTROY A YEAR OF TRAINING IN ONE CLICK. It was a hard
 * `DELETE`, and `program_session_logs.enrollment_id` is declared
 * `ON DELETE CASCADE`, so every session ever logged against the program went
 * with the row. Somebody who ran StrongLifts for a year and then switched to
 * 5/3/1 lost all hundred-and-fifty of them, and the only warning was a browser
 * confirm() saying "your logged sessions will be removed" — which described the
 * bug accurately and was treated as a feature.
 *
 * An enrollment is not scratch state. It is the record of what somebody
 * actually did, which is the single thing a training app exists to keep. So
 * stopping a program is a change of STATUS, exactly as `enrollInProgram`
 * already does when it makes way for a program in the same discipline.
 *
 * The partial unique index (`uq_program_enrollments_active … WHERE is_active`)
 * is already written for this: any number of finished enrollments of the same
 * program may sit side by side, and only one may be live. Coming back to a
 * program you did last year does not collide with the record of last year.
 */
export async function unenroll(userId: string, id: string): Promise<void> {
  await assertNoOpenWorkoutOn(userId, id)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc("end_enrollment", { p_id: id })
  if (error) {
    const refusal = refusalFrom(error)
    throw refusal instanceof ProgramRefused
      ? refusal
      : new Error(`Failed to end program: ${error.message}`)
  }
}

/**
 * A program cannot be ended, or pushed aside, while you are mid-workout on it.
 *
 * WHAT WENT WRONG. "End program" and starting a different program both flipped
 * `is_active` with no check. The workout you were in the middle of then
 * finished onto a program nobody is shown any more — its weights moved, in
 * secret, for a plan you had just ended — and the new program sat at week 1 as
 * if you had never trained.
 */
export class ProgramBusy extends ProgramRefused {
  constructor(message = "Finish or throw away the open workout first.") {
    super(message)
    this.name = "ProgramBusy"
  }
}

/**
 * A database refusal, turned into something a route can price.
 *
 * SQL state 55000 is what every one of the program-write functions raises when
 * it says no on purpose — a workout still open, a calculation made against a
 * history that has since moved, a session that is not there. Anything else is a
 * genuine failure and keeps its own message.
 *
 * `ProgramBusy` is kept as its own class because the trigger's sentence is the
 * one the screens already recognise, and because it is the refusal three routes
 * were written against before this existed.
 */
function refusalFrom(error: { code?: string; message: string }): Error {
  if (error.code !== "55000") return new Error(error.message)
  return error.message.includes("Finish or throw away the open workout first")
    ? new ProgramBusy()
    : new ProgramRefused(error.message)
}

/**
 * Refuse if a workout is open on this enrollment.
 *
 * ITS OWN QUERY, not an import of `workoutRepo` — that file already imports
 * this one, and a cycle between them is how a module ends up half-initialised.
 *
 * HONEST LIMIT: this is a check followed by a write, so a Start landing in the
 * milliseconds between the two still slips through. The trigger added in
 * `20260917100100_program_busy_while_workout_open.sql` is what closes that gap
 * for everyone, scripts included; this check is what gives the person a
 * sentence instead of a database exception.
 */
export async function assertNoOpenWorkoutOn(userId: string, enrollmentId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("enrollment_id", enrollmentId)
    .not("started_at", "is", null)
    .is("ended_at", null)
    .maybeSingle()
  // A check that could not be run is not a check that passed: a program ended
  // while a workout is open on it moves weights nobody can see again.
  if (error) throw new Error("Could not check whether a workout is open, so nothing was changed.")
  if (data) throw new ProgramBusy()
}

/**
 * Erase a finished program and everything logged on it. PERMANENT.
 *
 * The counterpart to `unenroll`, and the reason that one is safe to press.
 * Ending a program archives it, which was the fix for a button that used to
 * destroy a year of sessions — but "archived forever, no way out" is its own
 * fault: somebody who starts a program by accident, or who simply wants their
 * data gone, is owed a way to remove it.
 *
 * So the two live apart on purpose. The everyday action is reversible and is
 * offered where you train; this one is offered only in the list of programs you
 * have already finished, and the cascade on `program_session_logs` — the exact
 * behaviour that made the old delete a disaster — is what makes this one
 * complete.
 *
 * Refuses to touch a RUNNING program: erasing what you are in the middle of is
 * never what somebody means, and `is_active` is the difference between "I am
 * done with this" and "I am doing this".
 */
export async function deleteEnrollmentPermanently(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_active", false)
    .select("id")
  if (error) throw new Error(`Failed to delete program: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error("Only a program you have already ended can be deleted permanently")
  }
}

/**
 * Pick a finished program back up, exactly where it was left.
 *
 * THE PROGRAM SOMEBODY WROTE THEMSELVES WAS THE ONE THIS LOST. A self-built
 * program has `discipline: "strength"`, and `enrollInProgram` deactivates any
 * active enrollment in the SAME discipline — so building your own week and later
 * starting StrongLifts silently archived it. Nothing said so, nothing listed it
 * unless a different program happened to be open, and nothing could bring it
 * back. "It still doesn't load the one I custom made a long time ago."
 *
 * Restarting keeps `exercise_state` and `cursor` untouched: the weights you had
 * reached are yours, and the whole point of resuming rather than re-enrolling is
 * that a year of progression is not thrown away. Re-enrolling from the catalogue
 * would re-seed from the level's starting weights instead.
 *
 * Enforces the same one-active-per-discipline rule as enrolling, because the
 * rule is about what gets prescribed and not about how the row came to be
 * active — but it REPORTS what it displaced rather than doing it silently.
 */
export async function resumeEnrollment(
  userId: string,
  id: string
): Promise<{ enrollment: ProgramEnrollment; displaced: ProgramEnrollment[] }> {
  const supabase = await createServerSupabaseClient()
  const target = await getEnrollmentById(userId, id)
  if (!target) throw new Error("That program is not on your account")
  if (target.is_active) throw new Error("That program is already running")

  /**
   * A PROGRAM THAT HAS LEFT THE CATALOGUE CANNOT BE RUN AGAIN, and says so.
   * `requireProgram` threw a developer's sentence — "Unknown program: x" —
   * which reached the screen as a 500.
   */
  const targetProgram = getProgram(target.program_id)
  if (!targetProgram) {
    throw new ProgramRefused("That program is no longer in the catalogue, so it cannot be run again")
  }
  const sameDiscipline = (await listActiveEnrollments(userId)).filter(
    (e) => getProgram(e.program_id)?.discipline === targetProgram.discipline
  )
  /**
   * THE SAME GUARD AS ENROLLING, for the same reason. Picking an old program
   * back up pauses whatever is running in its discipline — and if a workout is
   * open on that one, it would finish onto a plan nobody is shown any more.
   * The sentence comes from here; the database refuses it either way.
   */
  for (const e of sameDiscipline) await assertNoOpenWorkoutOn(userId, e.id)

  // One statement again: the pause and the restart, together or not at all.
  const { data, error } = await supabase.rpc("resume_enrollment", {
    p_id: id,
    p_displace: sameDiscipline.map((e) => e.id),
  })
  if (error) {
    const refusal = refusalFrom(error)
    throw refusal instanceof ProgramRefused
      ? refusal
      : new Error(`Failed to restart the program: ${error.message}`)
  }
  return { enrollment: toDomain(data as ProgramEnrollmentRow), displaced: sameDiscipline }
}

/** Reset cursor to the start of the program; keeps current working weights / TMs. */
export async function resetEnrollment(userId: string, id: string): Promise<ProgramEnrollment> {
  const supabase = await createServerSupabaseClient()
  const enr = await getEnrollmentById(userId, id)
  if (!enr) throw new Error("Enrollment not found")
  const { data, error } = await supabase
    .from("program_enrollments")
    .update({
      cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
      // RECORDED, so a later correction does not undo it. Replay folds history
      // over the seed, and a reset that leaves no trace is simply forgotten the
      // next time somebody edits a session.
      replay_events: [
        ...(enr.replayEvents ?? []),
        // Spelled by RESET_EFFECT, not by hand: the confirm box, this row and
        // the replay branch that reads it all have to agree about whether a
        // reset takes the weights back, and they only do if there is one copy.
        { at: new Date().toISOString(), kind: "reset", ...RESET_EFFECT },
      ],
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to reset enrollment: ${error.message}`)
  return toDomain(data as ProgramEnrollmentRow)
}

/**
 * Replace the schedule of a live enrollment with the user's edited version.
 *
 * Editing mid-program must not cost progress: every lift that survives the edit
 * keeps its working weight, training max and fail count, because
 * `seedForAddedExercises` only fills state that is MISSING. Lifts that were
 * removed keep their state too — dormant, and restored if the user puts the
 * exercise back — since dropping it would silently reset a squat to the seed
 * weight for anyone who dropped a day for a fortnight.
 *
 * Passing null restores the catalog program, which is the only way back.
 */
export async function updateEnrollmentSchedule(
  userId: string,
  enrollmentId: string,
  schedule: ProgramSchedule | null,
  workingWeights: Record<string, number> = {}
): Promise<{ enrollment: ProgramEnrollment; prescription: SessionPrescription }> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const catalogProgram = requireProgram(enr.program_id)
  if (schedule && !isCustomizable(catalogProgram)) {
    throw new Error(`${catalogProgram.name} is a week-by-week plan and cannot be edited`)
  }

  const program = effectiveProgram(catalogProgram, schedule)
  /**
   * Two different intents, applied in order.
   *
   * A lift being ADDED needs a starting weight it does not have; a lift that is
   * already running may be given a NEW one because the person said so. The
   * second used to be impossible — there was no way to lower a working weight
   * once a program had started, so a wrong number at session one was permanent
   * short of ending the program.
   */
  const seeded = schedule
    ? seedForAddedExercises(schedule, enr.exerciseState, workingWeights, enr.unitSystem)
    : enr.exerciseState
  const { state: exerciseState, changed } = applyWeightOverrides(
    seeded,
    workingWeights,
    enr.unitSystem,
    program.schedule,
    enr.plates
  )
  const cursor = { ...enr.cursor, dayIndex: clampCursorDay(program.schedule, enr.cursor.dayIndex) }
  // A weight somebody set by hand has to survive a later correction, so it goes
  // into the replay alongside the skips and resets.
  const at = new Date().toISOString()
  /**
   * THE EDIT ITSELF IS PART OF THE HISTORY, always — not only when a weight
   * changed with it.
   *
   * This appended weight events and nothing else, so an edit that added a day or
   * dropped a lift left no trace: the replay ran every earlier session against
   * the NEW week, and a session logged on a day this edit removed crashed it. The
   * lifts `seedForAddedExercises` invented were written into the live state and
   * nowhere else, so the starting weights never learned about them either —
   * hence `seeded`, which carries exactly the entries this save created.
   *
   * THE SCHEDULE EVENT COMES FIRST. It shares its timestamp with the weight
   * events of the same save, and `Array.prototype.sort` in the replay is stable,
   * so array order is what breaks the tie: the week changes, then the weights
   * somebody typed on top of it.
   */
  const seededNow: Record<string, ExerciseState> = {}
  for (const [id, state] of Object.entries(seeded)) {
    if (!enr.exerciseState[id]) seededNow[id] = state
  }
  const replayEvents: ReplayEvent[] = [
    ...(enr.replayEvents ?? []),
    { at, kind: "schedule", schedule, seeded: seededNow },
    ...changed.map((c) => ({ at, kind: "weight" as const, exerciseId: c.exerciseId, to: c.to })),
  ]

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .update({
      custom_schedule: schedule,
      exercise_state: exerciseState,
      cursor,
      // Unconditional now: the schedule event above exists for every save, so
      // there is no longer a version of this write that records nothing.
      replay_events: replayEvents,
    })
    .eq("id", enrollmentId)
    .eq("user_id", userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to save program changes: ${error.message}`)

  const enrollment = toDomain(data as ProgramEnrollmentRow)
  return { enrollment, prescription: computePrescription(programFor(enrollment), enrollment) }
}

// ---------------------------------------------------------------------------
// Today's session
// ---------------------------------------------------------------------------

/**
 * Today's session.
 *
 * TWO SCHEDULING MODES, and which one applies is a property of the program
 * rather than a setting. A cited program is a SEQUENCE — StrongLifts is A/B/A
 * whenever you get to the gym, and its cursor is the source of truth, because
 * missing Tuesday must not skip Workout B. A program somebody wrote themselves
 * and pinned to weekdays is a CALENDAR — "Push is Monday" means today's session
 * is decided by today's date, and the cursor follows rather than leads.
 *
 * `isWeekdayAnchored` is all-or-nothing (see `builder.ts`), so there is never a
 * schedule that is half of each and no case where this has to guess.
 */
export async function getTodaySession(userId: string, enrollmentId: string): Promise<SessionPrescription> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  return todaysSessionFor(userId, enr)
}

/**
 * EVERYTHING ONE PROGRAM SCREEN NEEDS, ANSWERED ONCE.
 *
 * Two callers built this by hand — the GET route and the server-rendered first
 * paint of `/programs` — and neither could include the week, because working
 * out "which days have I trained this week" needs the account's timezone and
 * that is a database read neither of them was doing. So the strip did it in
 * the browser instead, off the phone's clock, and disagreed with the session
 * card beside it.
 *
 * Built here so there is one answer and one clock read. Without it the first
 * paint would have no week at all and the strip would sit empty until a
 * refetch filled it in.
 */
export async function getEnrollmentDetail(
  userId: string,
  id: string
): Promise<EnrollmentDetail | null> {
  const enrollment = await getEnrollmentById(userId, id)
  if (!enrollment) return null

  // ONE CLOCK READ, shared. "Which session is today" and "which days did I
  // train this week" are two answers to the same question, and reading the
  // zone twice is how two answers on one screen come to disagree — which is
  // the fault this function exists to fix.
  const clock = await getUserClock(userId)
  const [prescription, logs] = await Promise.all([
    todaysSessionFor(userId, enrollment, clock),
    sessionLogsFor(userId, enrollment),
  ])

  return { enrollment, prescription, logs, week: weekSoFar(logs, clock.timezone, new Date()) }
}

/**
 * The same rule, for a caller that already has the enrollment in its hand.
 *
 * THE ONE PLACE THAT ANSWERS "WHICH SESSION IS TODAY". It was inside
 * `getTodaySession`, so `startWorkout` could not reach it and answered the
 * question itself with the program's own cursor — the card said Legs and Start
 * opened Pull. Anything that needs today's session calls this, and the timezone
 * read stays inside it so there is exactly one place that asks whose day it is.
 */
export async function todaysSessionFor(
  userId: string,
  enr: ProgramEnrollment,
  /** A clock already read by the caller, so one screen makes one read. */
  clock?: { timezone: string; known: boolean }
): Promise<SessionPrescription> {
  const program = programFor(enr)

  /**
   * WHOSE TODAY. This read the SERVER's clock, which runs on UTC — so a week
   * pinned to weekdays showed anyone east of London yesterday's session after
   * local midnight, and anyone west tomorrow's from late afternoon. Every other
   * counter in the app already asks the account what day it is.
   *
   * The rule itself now lives in the engine (`pickTodaysDay`), where a unit test
   * can reach it: here it was inside the database layer, unreachable by the unit
   * suite and by the integration suite alike, so the one rule that answers "am I
   * training today" was the one rule nobody could check.
   */
  // `known` rides along because every screen holding a prescription needs to
  // know whether "today" is a fact or the UTC default nobody set.
  const { timezone, known } = clock ?? (await getUserClock(userId))
  const todayWeekday = isoWeekdayInTimezone(timezone)
  const picked = pickTodaysDay(program.schedule, todayWeekday)
  if (!picked) return { ...computePrescription(program, enr), todayWeekday, clockKnown: known }

  const prescription = computePrescription(program, {
    ...enr,
    cursor: { ...enr.cursor, dayIndex: picked.dayIndex },
  })
  return {
    ...prescription,
    todayWeekday,
    clockKnown: known,
    ...(picked.restDay ? { restDay: true } : {}),
    ...(picked.scheduledWeekday != null ? { scheduledWeekday: picked.scheduledWeekday } : {}),
  }
}

/** Missed-session catch-up: advance the cursor without logging/progressing. */
export async function skipSession(userId: string, enrollmentId: string): Promise<SessionPrescription> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const program = programFor(enr)
  // REFUSE RATHER THAN PRETEND. On a week pinned to weekdays nothing reads the
  // cursor, so advancing it changed no screen and left a phantom skip in the
  // history each time it was tapped. The button is hidden for these programs;
  // this is the same rule on the server, for anyone who posts anyway.
  const refusal = skipRefusal(program.schedule)
  if (refusal) throw new ProgramRefused(refusal)
  const { enrollment } = applyLog(program, enr, {
    enrollment_id: enr.id,
    dayId: "",
    cycle: enr.cursor.cycle,
    week: enr.cursor.week,
    entries: [], // no entries → linear holds, percentage no-ops; cursor still advances
  })
  // RECORDED, like a reset. A skip advances the plan without logging anything,
  // so it left no trace at all — and replaying a corrected history therefore
  // re-prescribed every session the person had deliberately skipped.
  await persistState(userId, enrollment, [
    ...(enr.replayEvents ?? []),
    { at: new Date().toISOString(), kind: "skip" },
  ])
  return computePrescription(program, enrollment)
}

// ---------------------------------------------------------------------------
// Logging a session: THERE IS NO LONGER A SECOND WAY
// ---------------------------------------------------------------------------

/**
 * `logProgramSession` was here, with `setRowsFor` below it.
 *
 * It took a whole session in one call — every set at its prescribed numbers,
 * a duration and an intensity — and advanced the program in the same rpc. It
 * was the second way to record a workout, and the two disagreed about units,
 * about personal bests, and about what a rep range means. A session that
 * already happened is now written the same way as one happening now: start a
 * workout dated then, tick what you actually did, finish it.
 *
 * `log_session_and_advance` is still in the database, called by nothing.
 * Dropping it is a migration of its own, not a code change.
 */

/**
 * What the weights WOULD say, with a change applied. Writes nothing.
 *
 * WHY THE CALCULATION IS SEPARATE FROM THE WRITE. This used to be one function
 * that read, replayed and saved — and it was called AFTER the delete or the set
 * rewrite had already committed. So a replay that threw left the session gone
 * and the weights still advanced by it, and the screen said the delete had
 * failed. All three statements were true and the result was nonsense.
 *
 * Now the answer is worked out first, in memory, from the history WITH the
 * change already applied; then one database function writes the change and the
 * answer together, or neither. If the calculation throws, nothing was written
 * and nothing needs undoing.
 *
 * `expectedSessionCount` is what the program said when this was read. It travels
 * with the write so the database can refuse a calculation that describes a
 * history the program has since moved on from — two tabs, or a workout finishing
 * while a correction was being computed.
 *
 * `replayEvents` comes back ONLY when a legacy edit had to be repaired (see
 * `repairUneventfulEdit`); otherwise the stored events are already right and the
 * write leaves them alone.
 */
export async function replayedState(
  userId: string,
  enrollmentId: string,
  change?: { withoutLogId: string } | { replaceLogId: string; entries: LoggedExercise[] }
): Promise<{
  enrollment: ProgramEnrollment
  expectedSessionCount: number
  replayEvents?: ReplayEvent[]
}> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  /**
   * THE CATALOGUE'S WEEK, not the enrollment's edited one.
   *
   * The replay walks the schedule events in the history and switches weeks as it
   * passes them, so handing it the CURRENT week would replay every session
   * before the last edit against the wrong one — the exact fault those events
   * were added to remove. `requireProgram` is where the walk starts; the first
   * schedule event takes it the rest of the way.
   */
  const program = requireProgram(enr.program_id)

  const seedState = enr.initialExerciseState
  if (!seedState) {
    throw new Error(
      "This program was started before starting weights were kept, so its history cannot be recalculated. Ending and restarting it will fix that."
    )
  }

  const stored = await sessionLogsFor(userId, enr)
  /**
   * THE HISTORY AS IT WILL BE, not as it is.
   *
   * The change is applied to the list in memory. That is what makes "compute
   * first, write once" possible at all: the answer is derived from the future
   * state of the history rather than from the state after a write that may not
   * have happened.
   */
  const applied =
    change == null
      ? stored
      : "withoutLogId" in change
        ? stored.filter((l) => l.id !== change.withoutLogId)
        : stored.map((l) => (l.id === change.replaceLogId ? { ...l, entries: change.entries } : l))

  // An edit made before edits were recorded, stitched in at the front. See
  // `repairUneventfulEdit` for what can and cannot be recovered.
  const repair = repairUneventfulEdit(enr)
  const events: ReplayEvent[] = [...(repair ? [repair] : []), ...(enr.replayEvents ?? [])]

  const replayed = replayEnrollment(
    program,
    { ...enr, exerciseState: seedState, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } },
    applied.map((l) => ({
      entries: l.entries,
      logged_at: l.logged_at,
      dayId: l.day_id,
      cycle: l.cycle,
      week: l.week,
    })),
    events
  )

  return {
    enrollment: replayed,
    expectedSessionCount: enr.cursor.sessionCount,
    ...(repair ? { replayEvents: events } : {}),
  }
}

/**
 * Remove one logged session and move the weights back, in one statement.
 *
 * ONE JOB NOW. This also carried a "correct the session" path, taking
 * `{exerciseId, setNumber, reps, weight}` and rewriting the workout from it —
 * which flattened warm-ups, all-out sets and back-offs into plain working sets
 * and dropped every note, RPE and side on the way past. Nothing called it: the
 * live correction path is `reviseWorkout` in `workoutRepo.ts`, which preserves
 * all of that. It went with the PATCH route it served.
 *
 * The state a log advanced FROM is not stored, so a single log cannot be undone
 * arithmetically. The only honest answer is to replay every remaining session
 * over the stored seed, which `replayEnrollment` can do because the engine is
 * pure — and the delete and the result of that replay are now committed
 * together by `remove_session_and_replay`.
 */
export async function removeProgramSession(
  userId: string,
  enrollmentId: string,
  logId: string
): Promise<ProgramEnrollment> {
  const { enrollment, expectedSessionCount, replayEvents } = await replayedState(
    userId,
    enrollmentId,
    { withoutLogId: logId }
  )

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc("remove_session_and_replay", {
    p_log_id: logId,
    p_enrollment_id: enrollmentId,
    p_exercise_state: enrollment.exerciseState,
    p_cursor: enrollment.cursor,
    p_replay_events: replayEvents ?? null,
    p_expected_session_count: expectedSessionCount,
  })
  if (error) throw refusalFrom(error)
  return toDomain(data as ProgramEnrollmentRow)
}

/** The delete-a-session route's name for the same thing. */
export async function reviseSessionLog(
  userId: string,
  enrollmentId: string,
  logId: string
): Promise<ProgramEnrollment> {
  return removeProgramSession(userId, enrollmentId, logId)
}

async function persistState(
  userId: string,
  enrollment: ProgramEnrollment,
  replayEvents?: ReplayEvent[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("program_enrollments")
    .update({
      exercise_state: enrollment.exerciseState,
      cursor: enrollment.cursor,
      ...(replayEvents ? { replay_events: replayEvents } : {}),
    })
    .eq("id", enrollment.id)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to persist enrollment state: ${error.message}`)
}


// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getSessionLogs(userId: string, enrollmentId: string): Promise<ProgramSessionLogRow[]> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) return []
  return sessionLogsFor(userId, enr)
}

/**
 * This enrollment's sessions, read out of the one workouts table.
 *
 * THE SHAPE IS THE SAME AND THE SOURCE IS NOT. Callers still get a row per
 * session with `entries` on it, because that is what the engine replays and
 * what the history screen renders — but `entries` is now DERIVED from the sets
 * that were actually stored rather than being a second, independent copy of
 * them. That second copy is why deleting a session left a ghost in every count
 * and why editing one reached neither table.
 *
 * Only FINISHED workouts: one still in progress has no result to replay.
 */
async function sessionLogsFor(
  userId: string,
  enr: ProgramEnrollment
): Promise<ProgramSessionLogRow[]> {
  const supabase = await createServerSupabaseClient()
  /**
   * PAGED. This is the read the whole replay is built on, and a year of
   * StrongLifts is 150 sessions — but somebody four years in is past a thousand,
   * and the database would then have replayed the first thousand and silently
   * called that the history. Every weight in the program would be wrong, and
   * nothing would say so.
   */
  const data = await readAllRows<WorkoutRowWithSets>("this program's sessions", (from, to) =>
    supabase
      .from("workout_logs")
      .select("*, workout_sets(*)")
      .eq("user_id", userId)
      .eq("enrollment_id", enr.id)
      .or(FINISHED_WORKOUTS_FILTER)
      // Date first for the order callers expect, `id` after it so two sessions
      // logged in the same instant cannot swap pages and lose one.
      .order("logged_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
  )

  return data.map((row: WorkoutRowWithSets) => ({
    id: row.id,
    enrollment_id: enr.id,
    user_id: userId,
    day_id: row.program_day_id ?? "",
    cycle: row.program_cycle ?? 1,
    week: row.program_week ?? 1,
    entries: entriesFromSets(row.workout_sets ?? [], row.adjustments, enr.unitSystem),
    rpe: row.rpe,
    notes: row.notes,
    logged_at: row.logged_at,
    created_at: row.created_at,
  }))
}

/** The row shape `workout_logs` comes back in with its sets attached. */
interface WorkoutRowWithSets {
  id: string
  logged_at: string
  created_at: string
  program_day_id: string | null
  program_cycle: number | null
  program_week: number | null
  adjustments: WorkoutAdjustments | null
  rpe: number | null
  notes: string | null
  workout_sets: StoredSet[] | null
}
