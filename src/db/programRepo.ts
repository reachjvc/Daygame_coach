/**
 * Database repository for Workout Programs (M1).
 *
 * Owns all DB access for program_enrollments + program_session_logs, and is the
 * orchestration boundary for stateful actions: it fetches state, runs the PURE
 * engine (src/programs/programsService.ts), then persists. On a load-session log
 * it also bridges to workout_logs/workout_sets so gym_sessions_weekly and linked
 * goal metrics update unchanged (via healthRepo.createWorkoutLog).
 */

import { createServerSupabaseClient } from "./supabase"
import { createWorkoutLog } from "./healthRepo"
import {
  applyLog,
  computePrescription,
  seedEnrollment,
  toKg,
} from "@/src/programs/programsService"
import { requireProgram, resolveProgramForLevel } from "@/src/programs/data/catalog"
import {
  clampCursorDay,
  effectiveProgram,
  isCustomizable,
  seedForAddedExercises,
} from "@/src/programs/customize"
import { dayForWeekday, isWeekdayAnchored } from "@/src/programs/builder"
import { isoWeekday } from "@/src/programs/config"
import { DISCIPLINES, BRIDGE_SESSION_TYPE, BRIDGE_DEFAULT_DURATION_MIN, BRIDGE_DEFAULT_INTENSITY } from "@/src/programs/config"
import type {
  ApplyLogResult,
  LevelId,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramEnrollmentRow,
  ProgramSessionLogInput,
  ProgramSchedule,
  ProgramSessionLogRow,
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
  return (data ?? []).map((r) => toDomain(r as ProgramEnrollmentRow))
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
  }
): Promise<{ enrollment: ProgramEnrollment; prescription: SessionPrescription }> {
  const { program: catalogProgram, level } = resolveProgramForLevel(input.programId, input.level)
  // Seed against the schedule the user is actually enrolling in, so a lift they
  // added is seeded and one they removed is not.
  const program = effectiveProgram(catalogProgram, input.customSchedule)
  const { exerciseState, cursor } = seedEnrollment(program, level, input.unitSystem, input.oneRepMaxes, input.workingWeights)

  const supabase = await createServerSupabaseClient()
  // One active per discipline: deactivate other active programs in this discipline.
  const sameDiscipline = await listActiveEnrollments(userId)
  for (const e of sameDiscipline) {
    if (requireProgram(e.program_id).discipline === program.discipline) {
      await supabase.from("program_enrollments").update({ is_active: false }).eq("id", e.id).eq("user_id", userId)
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
      cursor,
      is_active: true,
      custom_schedule: input.customSchedule ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to enroll: ${error.message}`)

  const enrollment = toDomain(data as ProgramEnrollmentRow)
  return { enrollment, prescription: computePrescription(program, enrollment) }
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

export async function unenroll(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("program_enrollments").delete().eq("id", id).eq("user_id", userId)
  if (error) throw new Error(`Failed to unenroll: ${error.message}`)
}

/** Reset cursor to the start of the program; keeps current working weights / TMs. */
export async function resetEnrollment(userId: string, id: string): Promise<ProgramEnrollment> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .update({ cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } })
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
  const exerciseState = schedule
    ? seedForAddedExercises(schedule, enr.exerciseState, workingWeights, enr.unitSystem)
    : enr.exerciseState
  const cursor = { ...enr.cursor, dayIndex: clampCursorDay(program.schedule, enr.cursor.dayIndex) }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_enrollments")
    .update({ custom_schedule: schedule, exercise_state: exerciseState, cursor })
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
  if (!isWeekdayAnchored(program.schedule)) return computePrescription(program, enr)

  const days = (program.schedule as { days: Array<{ id: string; weekday?: number }> }).days
  const todayIso = isoWeekday(new Date())
  const today = dayForWeekday(program.schedule, todayIso)

  // A REST DAY IS A REAL ANSWER. The next session is still computed so the
  // screen can say what is coming, but it is flagged rather than served as
  // today's work — otherwise a three-day week silently becomes a seven-day one.
  const target =
    today ??
    // The soonest day at or after today, wrapping into next week.
    [...days]
      .filter((d) => d.weekday != null)
      .sort(
        (a, b) =>
          ((a.weekday! - todayIso + 7) % 7) - ((b.weekday! - todayIso + 7) % 7)
      )[0]
  if (!target) return computePrescription(program, enr)

  const dayIndex = days.findIndex((d) => d.id === target.id)
  const prescription = computePrescription(program, {
    ...enr,
    cursor: { ...enr.cursor, dayIndex },
  })
  return {
    ...prescription,
    ...(today ? {} : { restDay: true }),
    ...(target.weekday != null ? { scheduledWeekday: target.weekday } : {}),
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
  await persistState(userId, enrollment)
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
  notes?: string
): Promise<ApplyLogResult & { next: SessionPrescription }> {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("Enrollment not found")
  const program = programFor(enr)
  const result = applyLog(program, enr, { ...logInput, enrollment_id: enr.id })

  // Persist new engine state, the session log, and the workout_logs bridge.
  await persistState(userId, result.enrollment)
  await insertSessionLog(userId, enr.id, logInput, rpe, notes)
  await bridgeToWorkoutLogs(userId, program, enr.unitSystem, logInput)

  return { ...result, next: computePrescription(program, result.enrollment) }
}

async function persistState(userId: string, enrollment: ProgramEnrollment): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("program_enrollments")
    .update({ exercise_state: enrollment.exerciseState, cursor: enrollment.cursor })
    .eq("id", enrollment.id)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to persist enrollment state: ${error.message}`)
}

async function insertSessionLog(
  userId: string,
  enrollmentId: string,
  logInput: Omit<ProgramSessionLogInput, "enrollment_id">,
  rpe?: number,
  notes?: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("program_session_logs").insert({
    enrollment_id: enrollmentId,
    user_id: userId,
    day_id: logInput.dayId,
    cycle: logInput.cycle,
    week: logInput.week,
    entries: logInput.entries,
    rpe: rpe ?? null,
    notes: notes ?? null,
  })
  if (error) throw new Error(`Failed to insert session log: ${error.message}`)
}

/**
 * Mirror a program session into workout_logs/workout_sets for metric/PR sync.
 * Load → a 'weights' log + per-set rows. Endurance → a 'running' log with
 * duration/distance (feeds running_distance_cumulative etc).
 */
async function bridgeToWorkoutLogs(
  userId: string,
  program: ProgramDefinition,
  unit: UnitSystem,
  logInput: Omit<ProgramSessionLogInput, "enrollment_id">
): Promise<void> {

  if (program.metricType === "endurance") {
    const duration = Math.min(599, Math.max(1, Math.round(logInput.durationMin ?? BRIDGE_DEFAULT_DURATION_MIN)))
    // Multi-sport (tri/ironman) → generic 'cardio'; pure running plans → 'running'.
    const multiSport = program.discipline === "triathlon" || program.discipline === "ironman"
    await createWorkoutLog(userId, {
      session_type: multiSport ? "cardio" : "running",
      duration_min: duration,
      intensity: BRIDGE_DEFAULT_INTENSITY,
      distance_km: logInput.distanceKm ?? null,
    })
    return
  }

  // Calisthenics → a 'weights' session (counts toward gym_sessions_weekly);
  // flexibility → a 'mobility' session. No per-set rows for bodyweight work.
  if (program.metricType === "skill_tier" || program.metricType === "hold_range") {
    await createWorkoutLog(userId, {
      session_type: program.metricType === "skill_tier" ? "weights" : "mobility",
      duration_min: BRIDGE_DEFAULT_DURATION_MIN,
      intensity: BRIDGE_DEFAULT_INTENSITY,
    })
    return
  }

  if (program.schedule.kind !== "linear_rotation" && program.schedule.kind !== "weekly_waved") return
  const nameById = new Map(program.schedule.days.flatMap((d) => d.exercises.map((e) => [e.id, e.name] as const)))

  const sets: WorkoutSetInsert[] = []
  for (const ex of logInput.entries) {
    const name = nameById.get(ex.exerciseId) ?? ex.exerciseId
    for (const s of ex.sets) {
      sets.push({ exercise: name, weight_kg: round2(toKg(s.weight, unit)), reps: s.reps, set_number: s.setNumber })
    }
  }
  if (sets.length === 0) return

  await createWorkoutLog(
    userId,
    { session_type: BRIDGE_SESSION_TYPE, duration_min: BRIDGE_DEFAULT_DURATION_MIN, intensity: BRIDGE_DEFAULT_INTENSITY },
    sets
  )
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getSessionLogs(userId: string, enrollmentId: string): Promise<ProgramSessionLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_session_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("enrollment_id", enrollmentId)
    .order("logged_at", { ascending: false })
  if (error) throw new Error(`Failed to get session logs: ${error.message}`)
  return (data ?? []) as ProgramSessionLogRow[]
}
