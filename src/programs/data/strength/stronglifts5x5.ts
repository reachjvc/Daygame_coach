/**
 * StrongLifts 5×5 — beginner linear strength program.
 *
 * Source: Mehdi, StrongLifts 5×5 (stronglifts.com). Two alternating workouts
 * (A/B), 3×/week. Every lift 5×5 except the deadlift (1×5). Add 2.5 kg / 5 lb
 * each workout when all reps are hit; after 3 consecutive failed sessions on a
 * lift, deload 10% and work back up. Starting weights below are the program's
 * suggested entry points per experience level — the user overrides any of them
 * at enroll time.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const LINEAR = {
  kind: "linear_load" as const,
  incrementKg: 2.5,
  incrementLb: 5,
  deloadAfterFails: 3,
  deloadPct: 0.1,
}

const squat: LoadExercise = { id: "squat", name: "Squat", metricType: "load", scheme: { kind: "linear", sets: 5, reps: 5 }, progression: LINEAR }
const bench: LoadExercise = { id: "bench", name: "Bench Press", metricType: "load", scheme: { kind: "linear", sets: 5, reps: 5 }, progression: LINEAR }
const row: LoadExercise = { id: "row", name: "Barbell Row", metricType: "load", scheme: { kind: "linear", sets: 5, reps: 5 }, progression: LINEAR }
const ohp: LoadExercise = { id: "ohp", name: "Overhead Press", metricType: "load", scheme: { kind: "linear", sets: 5, reps: 5 }, progression: LINEAR }
const deadlift: LoadExercise = { id: "deadlift", name: "Deadlift", metricType: "load", scheme: { kind: "linear", sets: 1, reps: 5 }, progression: LINEAR }

export const strongLifts5x5: ProgramDefinition = {
  id: "stronglifts-5x5",
  discipline: "strength",
  metricType: "load",
  name: "StrongLifts 5×5",
  blurb: "Two alternating full-body workouts, 3×/week. The classic beginner barbell program — add weight every session, deload when you stall.",
  sourceCitation: "Mehdi — StrongLifts 5×5 (stronglifts.com)",
  popularityRank: 1,
  levels: [
    { id: "beginner", label: "Beginner", seedWorkingWeightKg: { squat: 20, bench: 20, row: 30, ohp: 20, deadlift: 40 } },
    { id: "intermediate", label: "Intermediate", seedWorkingWeightKg: { squat: 60, bench: 40, row: 40, ohp: 30, deadlift: 70 } },
    { id: "advanced", label: "Advanced", seedWorkingWeightKg: { squat: 100, bench: 70, row: 60, ohp: 45, deadlift: 120 } },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "A", label: "Workout A", exercises: [squat, bench, row] },
      { id: "B", label: "Workout B", exercises: [squat, ohp, deadlift] },
    ],
  },
}
