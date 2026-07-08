/**
 * Push / Pull / Legs — 6-day hypertrophy split (double progression).
 *
 * Source: the popular r/Fitness "PPL" template (a.k.a. Metallicadpa PPL) —
 * structure/method re-implemented as data, name genericized (no branded text).
 * Six sessions/week rotating Push → Pull → Legs ×2. Every lift uses DOUBLE
 * PROGRESSION: hit the top of the rep range on all sets → add weight and drop
 * back to the bottom of the range; otherwise keep the weight and chase reps.
 * Standard hypertrophy rep ranges (compounds 6–8, accessories 8–20). Starting
 * weights are per-level suggestions; the user overrides any of them.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const DP = { kind: "double_progression" as const, incrementKg: 2.5, incrementLb: 5 }
const ex = (id: string, name: string, sets: number, repMin: number, repMax: number): LoadExercise => ({
  id, name, metricType: "load", scheme: { kind: "rep_range", sets, repMin, repMax }, progression: DP,
})

const push = [
  ex("bb_bench", "Bench Press", 4, 6, 8),
  ex("bb_ohp", "Overhead Press", 3, 8, 10),
  ex("bb_incline_db", "Incline Dumbbell Press", 3, 8, 12),
  ex("bb_triceps", "Triceps Pushdown", 3, 10, 15),
  ex("bb_lateral", "Lateral Raise", 3, 12, 20),
]
const pull = [
  ex("bb_row", "Barbell Row", 4, 6, 8),
  ex("bb_pulldown", "Lat Pulldown", 3, 8, 12),
  ex("bb_facepull", "Face Pull", 3, 12, 20),
  ex("bb_curl", "Barbell Curl", 3, 8, 12),
  ex("bb_hammer", "Hammer Curl", 3, 10, 15),
]
const legs = [
  ex("bb_squat", "Squat", 4, 6, 8),
  ex("bb_rdl", "Romanian Deadlift", 3, 8, 12),
  ex("bb_legpress", "Leg Press", 3, 10, 15),
  ex("bb_legcurl", "Leg Curl", 3, 10, 15),
  ex("bb_calf", "Standing Calf Raise", 4, 12, 20),
]

export const pushPullLegs: ProgramDefinition = {
  id: "push-pull-legs",
  discipline: "bodybuilding",
  metricType: "load",
  name: "Push / Pull / Legs (6-day)",
  blurb: "High-volume hypertrophy split, 6×/week. Push, pull, and leg days twice each — double progression on every lift.",
  sourceCitation: "r/Fitness PPL template (structure re-implemented as data; name genericized)",
  popularityRank: 3,
  levels: [
    { id: "beginner", label: "Beginner", seedWorkingWeightKg: { bb_bench: 40, bb_ohp: 25, bb_incline_db: 20, bb_triceps: 20, bb_lateral: 8, bb_row: 40, bb_pulldown: 35, bb_facepull: 15, bb_curl: 20, bb_hammer: 12, bb_squat: 50, bb_rdl: 50, bb_legpress: 80, bb_legcurl: 25, bb_calf: 40 } },
    { id: "intermediate", label: "Intermediate", seedWorkingWeightKg: { bb_bench: 70, bb_ohp: 40, bb_incline_db: 32, bb_triceps: 30, bb_lateral: 12, bb_row: 60, bb_pulldown: 55, bb_facepull: 25, bb_curl: 30, bb_hammer: 18, bb_squat: 90, bb_rdl: 80, bb_legpress: 140, bb_legcurl: 40, bb_calf: 70 } },
    { id: "advanced", label: "Advanced", seedWorkingWeightKg: { bb_bench: 100, bb_ohp: 60, bb_incline_db: 45, bb_triceps: 45, bb_lateral: 16, bb_row: 85, bb_pulldown: 75, bb_facepull: 35, bb_curl: 40, bb_hammer: 24, bb_squat: 130, bb_rdl: 110, bb_legpress: 200, bb_legcurl: 55, bb_calf: 100 } },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "push", label: "Push", exercises: push },
      { id: "pull", label: "Pull", exercises: pull },
      { id: "legs", label: "Legs", exercises: legs },
    ],
  },
}
