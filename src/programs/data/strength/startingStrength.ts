/**
 * Starting Strength — Mark Rippetoe's novice linear program.
 *
 * Source: Mark Rippetoe, "Starting Strength: Basic Barbell Training" (3rd ed.).
 * Two alternating workouts, 3×/week. Squat every session, 3×5; alternate
 * Press/Bench; Deadlift 1×5 (alternating with Power Clean in the book — we keep
 * the deadlift line for simplicity). Add weight every session; deload ~10% after
 * three consecutive stalls. Starting weights are per-level suggestions.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const LINEAR = { kind: "linear_load" as const, incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 }
const DL = { kind: "linear_load" as const, incrementKg: 5, incrementLb: 10, deloadAfterFails: 3, deloadPct: 0.1 }

const squat: LoadExercise = { id: "ss_squat", name: "Squat", metricType: "load", scheme: { kind: "linear", sets: 3, reps: 5 }, progression: LINEAR }
const press: LoadExercise = { id: "ss_press", name: "Overhead Press", metricType: "load", scheme: { kind: "linear", sets: 3, reps: 5 }, progression: LINEAR }
const bench: LoadExercise = { id: "ss_bench", name: "Bench Press", metricType: "load", scheme: { kind: "linear", sets: 3, reps: 5 }, progression: LINEAR }
const deadlift: LoadExercise = { id: "ss_deadlift", name: "Deadlift", metricType: "load", scheme: { kind: "linear", sets: 1, reps: 5 }, progression: DL }

export const startingStrength: ProgramDefinition = {
  id: "starting-strength",
  discipline: "strength",
  metricType: "load",
  name: "Starting Strength",
  blurb: "Rippetoe's classic novice program. Squat every session plus press/bench and deadlift — add weight each workout while you can.",
  sourceCitation: "Mark Rippetoe — Starting Strength: Basic Barbell Training (3rd ed.)",
  popularityRank: 2,
  levels: [
    { id: "beginner", label: "Beginner", seedWorkingWeightKg: { ss_squat: 40, ss_press: 25, ss_bench: 30, ss_deadlift: 50 } },
    { id: "intermediate", label: "Intermediate", seedWorkingWeightKg: { ss_squat: 80, ss_press: 40, ss_bench: 60, ss_deadlift: 100 } },
    { id: "advanced", label: "Advanced", seedWorkingWeightKg: { ss_squat: 120, ss_press: 55, ss_bench: 90, ss_deadlift: 150 } },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "A", label: "Workout A", exercises: [squat, press, deadlift] },
      { id: "B", label: "Workout B", exercises: [squat, bench, deadlift] },
    ],
  },
}
