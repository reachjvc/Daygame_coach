/**
 * The shell a program you wrote yourself is enrolled against.
 *
 * WHY A SHELL AND NOT A NEW TABLE. Everything downstream of an enrollment —
 * the progression engine, today's prescription, the session log, the
 * `workout_logs` bridge, the whole `/programs` surface — is reached through
 * `requireProgram(enrollment.program_id)`. A self-designed program that lived
 * anywhere else would need a parallel path through all of it. Instead it is an
 * ordinary enrollment whose `program_id` is this shell and whose
 * `custom_schedule` is the design: the copy-on-write layer that already exists
 * for editing a catalog program (see `customize.ts`) carries the whole thing,
 * and not one consumer downstream needs to know the difference.
 *
 * THE SHELL DELIBERATELY SEEDS NOTHING. `seedWorkingWeightKg` is absent for
 * every level, so `seedEnrollment` throws unless the user supplies a starting
 * weight for every single lift. That is the correct default here: with a
 * catalog program the level's numbers are a cited suggestion, and with a
 * program somebody wrote themselves there is nothing to suggest from. No
 * guessed weights (CLAUDE.md).
 *
 * The placeholder day exists only so the shape is a valid `ProgramDefinition`
 * on its own. It is replaced by the user's schedule on enrollment and is never
 * prescribed — `enrollCustom` refuses a design that has no days in it.
 */

import type { LoadExercise, ProgramDefinition } from "../types"

export const CUSTOM_PROGRAM_ID = "custom"

/**
 * A single placeholder so the definition is well-formed before a design
 * replaces it. Given a real lift rather than an empty day because an empty day
 * is exactly what `scheduleProblems` refuses everywhere else, and the shell
 * should not be the one exception to a rule the rest of the slice enforces.
 */
const placeholder: LoadExercise = {
  id: "custom_placeholder",
  name: "Back Squat",
  metricType: "load",
  scheme: { kind: "linear", sets: 3, reps: 5 },
  progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 },
}

export const customProgram: ProgramDefinition = {
  id: CUSTOM_PROGRAM_ID,
  discipline: "strength",
  metricType: "load",
  name: "Your own program",
  blurb: "A training week you wrote yourself — your days, your lifts, your rep schemes, your progression.",
  sourceCitation: "User-authored; no external source",
  // Sorted last wherever popularity decides an order. It is excluded from the
  // browse lists anyway (see `ALL_PROGRAMS` in catalog.ts) — this is belt and
  // braces so a new list that forgets to filter degrades to "at the bottom"
  // rather than "in the middle of the cited programs".
  popularityRank: 999,
  levels: [
    // One level, and no seed weights anywhere: every lift is asked for
    // explicitly at enroll. `intermediate` because it is the engine's default
    // and nothing here varies by level.
    { id: "intermediate", label: "Your numbers" },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [{ id: "custom_day_1", label: "Day 1", exercises: [placeholder] }],
  },
}

/** True for an enrollment that is somebody's own design rather than a cited program. */
export function isCustomProgram(programId: string): boolean {
  return programId === CUSTOM_PROGRAM_ID
}
