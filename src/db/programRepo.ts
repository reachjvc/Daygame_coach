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
import { createWorkoutLog } from "./healthRepo"
import {
  applyLog,
  computePrescription,
  seedEnrollment,
  toKg,
  unknownExerciseIds,
  replayEnrollment,
  pickTodaysDay,
  entriesFromSets,
  loadStyleOf,
} from "@/src/programs/programsService"
import { requireProgram, resolveProgramForLevel } from "@/src/programs/data/catalog"
import {
  clampCursorDay,
  effectiveProgram,
  scheduleDays,
  isCustomizable,
  seedForAddedExercises,
  applyWeightOverrides,
} from "@/src/programs/customize"
import { getUserTimezone } from "./settingsRepo"
import { loggedAtForEntry } from "@/src/health/healthService"
import { isoWeekdayInTimezone } from "@/src/shared/dateUtils"
import {
  BRIDGE_SESSION_TYPE,
  BRIDGE_DEFAULT_DURATION_MIN,
  BRIDGE_DEFAULT_INTENSITY,
  DEFAULT_PLATES,
  KG_PER_LB,
} from "@/src/programs/config"
import { finishedWorkouts } from "./healthRepo"
import type {
  StoredSet,
  WorkoutAdjustments,
} from "@/src/programs/programsService"
import type {
  ApplyLogResult,
  LoggedExercise,
  LevelId,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramEnrollmentRow,
  ProgramSessionLogInput,
  ProgramSchedule,
  ProgramSessionLogRow,
  ReplayEvent,
  SessionPrescription,
  UnitSystem,
} from "@/src/programs/types"
import type { WorkoutSetInsert } from "@/src/health/types"

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
function plateSetupFor(barWeightKg: number | null, unit: UnitSystem) {
  const defaults = DEFAULT_PLATES[unit]
  if (barWeightKg == null) return defaults
  return {
    barWeight: unit === "kg" ? barWeightKg : Math.round((barWeightKg / KG_PER_LB) * 100) / 100,
    smallestPlate: defaults.smallestPlate,
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
function programFor(enrollment: ProgramEnrollment) {
  return effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)
}

const round2 = (n: number) => Math.round(n * 100) / 100

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
  const { data: logs, error: logErr } = await finishedWorkouts(
    supabase
      .from("workout_logs")
      .select("enrollment_id, logged_at")
      .eq("user_id", userId)
      .in("enrollment_id", enrollments.map((e) => e.id))
  ).order("logged_at", { ascending: false })
  if (logErr) throw new Error(`Failed to read session history: ${logErr.message}`)

  const lastByEnrollment = new Map<string, string>()
  for (const row of (logs ?? []) as { enrollment_id: string; logged_at: string }[]) {
    // Ordered newest-first, so the first one seen for an enrollment is its last.
    if (!lastByEnrollment.has(row.enrollment_id)) lastByEnrollment.set(row.enrollment_id, row.logged_at)
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

  const { data: logs, error: logErr } = await finishedWorkouts(
    supabase
      .from("workout_logs")
      .select("enrollment_id, logged_at")
      .eq("user_id", userId)
      .in("enrollment_id", enrollments.map((e) => e.id))
  ).order("logged_at", { ascending: false })
  if (logErr) throw new Error(`Failed to read session history: ${logErr.message}`)

  const counts = new Map<string, { last: string; n: number }>()
  for (const row of (logs ?? []) as { enrollment_id: string; logged_at: string }[]) {
    const cur = counts.get(row.enrollment_id)
    if (!cur) counts.set(row.enrollment_id, { last: row.logged_at, n: 1 })
    else cur.n++
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
   */
  const displaced: ProgramEnrollment[] = []
  for (const e of await listActiveEnrollments(userId)) {
    if (requireProgram(e.program_id).discipline === program.discipline) {
      await supabase.from("program_enrollments").update({ is_active: false }).eq("id", e.id).eq("user_id", userId)
      displaced.push(e)
    }
  }

  const { data, error } = await supabase
    .from("program_enrollments")
    .insert({
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
      is_active: true,
      custom_schedule: input.customSchedule ?? null,
      ...(input.barWeightKg != null ? { bar_weight_kg: input.barWeightKg } : {}),
      ...(input.label ? { label: input.label } : {}),
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to enroll: ${error.message}`)

  const enrollment = toDomain(data as ProgramEnrollmentRow)
  return { enrollment, prescription: computePrescription(program, enrollment), displaced }
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
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("program_enrollments")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to end program: ${error.message}`)
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

  const discipline = requireProgram(target.program_id).discipline
  const displaced: ProgramEnrollment[] = []
  for (const e of await listActiveEnrollments(userId)) {
    if (requireProgram(e.program_id).discipline !== discipline) continue
    const { error } = await supabase
      .from("program_enrollments")
      .update({ is_active: false })
      .eq("id", e.id)
      .eq("user_id", userId)
    if (error) throw new Error(`Failed to pause ${e.program_id}: ${error.message}`)
    displaced.push(e)
  }

  const { data, error } = await supabase
    .from("program_enrollments")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to restart the program: ${error.message}`)
  return { enrollment: toDomain(data as ProgramEnrollmentRow), displaced }
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
        { at: new Date().toISOString(), kind: "reset", cursor: true, weights: false },
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
  const replayEvents: ReplayEvent[] = [
    ...(enr.replayEvents ?? []),
    ...changed.map((c) => ({ at, kind: "weight" as const, exerciseId: c.exerciseId, to: c.to })),
  ]

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .update({
      custom_schedule: schedule,
      exercise_state: exerciseState,
      cursor,
      ...(changed.length > 0 ? { replay_events: replayEvents } : {}),
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
  const timezone = await getUserTimezone(userId)
  const todayWeekday = isoWeekdayInTimezone(timezone)
  const picked = pickTodaysDay(program.schedule, todayWeekday)
  if (!picked) return { ...computePrescription(program, enr), todayWeekday }

  const prescription = computePrescription(program, {
    ...enr,
    cursor: { ...enr.cursor, dayIndex: picked.dayIndex },
  })
  return {
    ...prescription,
    todayWeekday,
    ...(picked.restDay ? { restDay: true } : {}),
    ...(picked.scheduledWeekday != null ? { scheduledWeekday: picked.scheduledWeekday } : {}),
  }
}

/** Missed-session catch-up: advance the cursor without logging/progressing. */
export async function skipSession(userId: string, enrollmentId: string): Promise<SessionPrescription> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const program = programFor(enr)
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
// Logging a session (engine + persist + bridge)
// ---------------------------------------------------------------------------

export async function logProgramSession(
  userId: string,
  enrollmentId: string,
  logInput: Omit<ProgramSessionLogInput, "enrollment_id">,
  rpe?: number,
  notes?: string,
  /** The day the person says they trained. Absent means now. */
  when?: { entry_date?: string; entry_time?: string }
): Promise<ApplyLogResult & { next: SessionPrescription }> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const program = programFor(enr)

  // A session naming lifts the program does not have is unrecoverable once
  // stored: the engine has no state to progress and every screen prints the raw
  // id for ever. Refuse it at the door, and say which one was wrong.
  const unknown = unknownExerciseIds(program, logInput.entries ?? [])
  if (unknown.length > 0) {
    throw new Error(
      `${program.name} has no exercise called ${unknown.join(", ")}. Nothing was logged.`
    )
  }

  const result = applyLog(program, enr, { ...logInput, enrollment_id: enr.id })

  /**
   * THE DAY THEY TRAINED, IN THEIR OWN CALENDAR.
   *
   * A session could only ever be stamped "now", on both copies, so a Saturday
   * workout written up on Monday landed in Monday's week and every calendar
   * view was wrong about it. `loggedAtForEntry` is the health slice's rule for
   * exactly this and already handles "today means this moment, not noon".
   */
  let loggedAt: string | undefined
  if (when?.entry_date) {
    const timezone = await getUserTimezone(userId)
    const resolved = loggedAtForEntry(when.entry_date, timezone, when.entry_time)
    if (!resolved) throw new Error("That is in the future — pick a day you have already trained.")
    loggedAt = resolved
  }

  // ONE RECORD. The engine's state, then the workout — which IS the session.
  await persistState(userId, result.enrollment)
  await writeWorkout(userId, enr, program, logInput, { rpe, notes, loggedAt })

  return { ...result, next: computePrescription(program, result.enrollment) }
}

/**
 * Change or remove a logged session, and recompute everything after it.
 *
 * An edit that does not change what comes next is a note, not a correction. The
 * state a log advanced FROM is not stored, so a single log cannot be reversed —
 * the only honest way to apply a change is to replay every session over a fresh
 * seed. `replayEnrollment` can do that because the engine is pure.
 *
 * `entries === null` deletes the session. Both paths go through the same replay,
 * so there is one rule for "what do the weights say now" rather than two.
 */
export async function reviseSessionLog(
  userId: string,
  enrollmentId: string,
  logId: string,
  entries: LoggedExercise[] | null
): Promise<ProgramEnrollment> {
  const supabase = await createServerSupabaseClient()
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const program = programFor(enr)

  if (entries !== null) {
    const unknown = unknownExerciseIds(program, entries)
    if (unknown.length > 0) {
      throw new Error(`${program.name} has no exercise called ${unknown.join(", ")}. Nothing was changed.`)
    }
    /**
     * EDITING NOW ACTUALLY EDITS.
     *
     * It wrote to `program_session_logs`, which had read, insert and delete
     * row rules and NO update — so Postgres matched zero rows, returned no
     * error, and the app replayed the untouched history and reported success.
     * Proved against the live database on 2026-09-06: a correction to 9 reps
     * came back 200 and the row still read 6.
     *
     * The sets are ordinary workout rows, which have always been updatable.
     * The write is re-read rather than trusted, so a silent no-op can never
     * come back: if nothing changed, the caller is told.
     */
    const nameById = new Map(
      scheduleDays(program.schedule).flatMap((d) =>
        d.exercises.map((ex) => [ex.id, ex.name] as const)
      )
    )
    const rows = entries.flatMap((entry) =>
      entry.sets.map((set) => ({
        log_id: logId,
        exercise: nameById.get(entry.exerciseId) ?? entry.exerciseId,
        exercise_id: entry.exerciseId,
        weight_kg: round2(toKg(set.weight, enr.unitSystem)),
        reps: set.reps,
        set_number: set.setNumber,
        set_kind: "working" as const,
        ...(set.side ? { side: set.side } : {}),
      }))
    )
    // The corrected session replaces the old one wholesale: a set removed from
    // the correction has to disappear, and a patch cannot express that.
    const { error: clearError } = await supabase.from("workout_sets").delete().eq("log_id", logId)
    if (clearError) throw new Error(`Failed to change the session: ${clearError.message}`)
    if (rows.length > 0) {
      const { data: written, error } = await supabase.from("workout_sets").insert(rows).select("id")
      if (error) throw new Error(`Failed to change the session: ${error.message}`)
      if ((written ?? []).length !== rows.length) {
        throw new Error("The correction did not save. Nothing was changed.")
      }
    }
    // Skips are on the workout, not on its sets.
    const skipped = entries.filter((e) => e.skipped).map((e) => e.exerciseId)
    const { error: adjError } = await supabase
      .from("workout_logs")
      .update({ adjustments: skipped.length > 0 ? { skipped } : {} })
      .eq("id", logId)
      .eq("user_id", userId)
    if (adjError) throw new Error(`Failed to change the session: ${adjError.message}`)
  } else {
    // Deleting the workout takes its sets with it (ON DELETE CASCADE) — and,
    // because there is only one record now, it also takes it out of the
    // dashboard count, the calendar, the personal records and the export.
    // Deleting used to leave every one of those untouched.
    const { data: gone, error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("id", logId)
      .eq("enrollment_id", enrollmentId)
      .eq("user_id", userId)
      .select("id")
    if (error) throw new Error(`Failed to delete the session: ${error.message}`)
    if ((gone ?? []).length === 0) throw new Error("That session was not found, so nothing was deleted.")
  }

  /**
   * REPLAY FROM WHAT THE PERSON TYPED, not from the catalogue.
   *
   * This used to call `seedEnrollment` again, which re-derives the starting
   * weights from the LEVEL's defaults — so anybody who entered their real
   * numbers at enrolment had them replaced by the catalogue's the first time
   * they corrected a session, silently, and anybody on a self-built program
   * (which has no level seeds at all) got a delete that went through and then
   * threw. The seed is stored at enrolment now and is the enrollment's own
   * history; it is never recomputed.
   */
  const seedState = enr.initialExerciseState
  if (!seedState) {
    throw new Error(
      "This program was started before starting weights were kept, so its history cannot be recalculated. Ending and restarting it will fix that."
    )
  }
  const logs = await getSessionLogs(userId, enrollmentId)
  const replayed = replayEnrollment(
    program,
    { ...enr, exerciseState: seedState, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } },
    logs.map((l) => ({
      entries: l.entries,
      logged_at: l.logged_at,
      dayId: l.day_id,
      cycle: l.cycle,
      week: l.week,
    })),
    enr.replayEvents ?? []
  )
  await persistState(userId, replayed)
  return replayed
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

/**
 * Write the workout. There is only one row to write.
 *
 * IT USED TO BE TWO, and nothing joined them: a `program_session_logs` row for
 * the engine and a `workout_logs` row for the dashboard, written one after the
 * other. Deleting a session removed one and left the other in every count,
 * chart and export; editing reached neither. The engine now reads the sets that
 * are stored, so there is nothing left to disagree.
 *
 * `client_key` makes a retry a no-op rather than a second session: a save that
 * failed halfway used to leave the weights advanced and say nothing, so the
 * next thing anybody did was press the button again.
 */
async function writeWorkout(
  userId: string,
  enr: ProgramEnrollment,
  program: ProgramDefinition,
  logInput: Omit<ProgramSessionLogInput, "enrollment_id">,
  meta: { rpe?: number; notes?: string; loggedAt?: string; clientKey?: string }
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const duration = Math.min(599, Math.max(1, Math.round(logInput.durationMin ?? BRIDGE_DEFAULT_DURATION_MIN)))
  const intensity = Math.min(5, Math.max(1, Math.round(logInput.intensity ?? BRIDGE_DEFAULT_INTENSITY)))
  const skipped = logInput.entries.filter((e) => e.skipped).map((e) => e.exerciseId)

  const { data: workout, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: userId,
      session_type: sessionTypeFor(program),
      duration_min: duration,
      intensity,
      distance_km: logInput.distanceKm ?? null,
      enrollment_id: enr.id,
      program_day_id: logInput.dayId,
      program_cycle: logInput.cycle,
      program_week: logInput.week,
      adjustments: skipped.length > 0 ? { skipped } : {},
      rpe: meta.rpe ?? null,
      notes: meta.notes ?? null,
      ...(meta.clientKey ? { client_key: meta.clientKey } : {}),
      ...(meta.loggedAt ? { logged_at: meta.loggedAt } : {}),
    })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to save the workout: ${error.message}`)

  const sets = setRowsFor(program, enr.unitSystem, logInput, workout.id)
  if (sets.length === 0) return
  const { error: setsError } = await supabase.from("workout_sets").insert(sets)
  if (setsError) throw new Error(`Failed to save the sets: ${setsError.message}`)
}

/**
 * What kind of session this counts as on the dashboard.
 *
 * Unchanged from the old bridge: a calisthenics session is weights (it counts
 * towards gym sessions), a mobility routine is mobility, a running plan is
 * running, and a multi-sport plan is generic cardio.
 */
function sessionTypeFor(program: ProgramDefinition) {
  if (program.metricType === "endurance") {
    return program.discipline === "triathlon" || program.discipline === "ironman" ? "cardio" : "running"
  }
  if (program.metricType === "hold_range") return "mobility"
  return BRIDGE_SESSION_TYPE
}

/** The sets, stamped with the program's own id for each lift. */
function setRowsFor(
  program: ProgramDefinition,
  unit: UnitSystem,
  logInput: Omit<ProgramSessionLogInput, "enrollment_id">,
  logId: string
): WorkoutSetInsert[] {
  const byId = new Map(
    scheduleDays(program.schedule).flatMap((d) => d.exercises.map((ex) => [ex.id, ex] as const))
  )
  const rows: WorkoutSetInsert[] = []
  for (const entry of logInput.entries) {
    if (entry.skipped) continue
    const ex = byId.get(entry.exerciseId)
    for (const set of entry.sets) {
      rows.push({
        log_id: logId,
        exercise: ex?.name ?? entry.exerciseId,
        // THE PROGRAM'S OWN ID. Matching a logged set back to its lift by NAME
        // is what made "my bench" split in two the moment a program renamed it.
        exercise_id: entry.exerciseId,
        weight_kg: round2(toKg(set.weight, unit)),
        reps: set.reps,
        set_number: set.setNumber,
        set_kind: "working",
        ...(set.side ? { side: set.side } : {}),
      })
    }
  }
  return rows
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
  const { data, error } = await finishedWorkouts(
    supabase
      .from("workout_logs")
      .select("*, workout_sets(*)")
      .eq("user_id", userId)
      .eq("enrollment_id", enr.id)
  ).order("logged_at", { ascending: false })
  if (error) throw new Error(`Failed to get session logs: ${error.message}`)

  return (data ?? []).map((row: WorkoutRowWithSets) => ({
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
