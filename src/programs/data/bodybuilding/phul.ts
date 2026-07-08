/**
 * PHUL — Power Hypertrophy Upper Lower (4-day).
 *
 * Source: the popular PHUL template (Brandon Campbell) — structure
 * re-implemented as data. Two "power" days (heavy, low reps) and two
 * "hypertrophy" days (moderate, higher reps), 4×/week. Double progression on
 * every lift. Starting weights are per-level suggestions.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const DP = { kind: "double_progression" as const, incrementKg: 2.5, incrementLb: 5 }
const ex = (id: string, name: string, sets: number, repMin: number, repMax: number): LoadExercise => ({
  id, name, metricType: "load", scheme: { kind: "rep_range", sets, repMin, repMax }, progression: DP,
})

const upperPower = [
  ex("phul_bench", "Bench Press", 4, 3, 5),
  ex("phul_row", "Barbell Row", 4, 3, 5),
  ex("phul_ohp", "Overhead Press", 3, 5, 8),
  ex("phul_pullup", "Lat Pulldown", 3, 6, 10),
  ex("phul_curl", "Barbell Curl", 3, 6, 10),
]
const lowerPower = [
  ex("phul_squat", "Squat", 4, 3, 5),
  ex("phul_dead", "Deadlift", 3, 3, 5),
  ex("phul_legpress", "Leg Press", 3, 8, 12),
  ex("phul_legcurl", "Leg Curl", 3, 8, 12),
  ex("phul_calf", "Calf Raise", 4, 8, 12),
]
const upperHyp = [
  ex("phul_incline", "Incline Bench Press", 4, 8, 12),
  ex("phul_pulldown", "Lat Pulldown", 4, 8, 12),
  ex("phul_fly", "Cable Fly", 3, 10, 15),
  ex("phul_lateral", "Lateral Raise", 3, 12, 20),
  ex("phul_triceps", "Triceps Pushdown", 3, 10, 15),
]
const lowerHyp = [
  ex("phul_frontsquat", "Front Squat", 4, 8, 12),
  ex("phul_rdl", "Romanian Deadlift", 3, 8, 12),
  ex("phul_legext", "Leg Extension", 3, 12, 15),
  ex("phul_legcurl2", "Lying Leg Curl", 3, 12, 15),
  ex("phul_calf2", "Seated Calf Raise", 4, 12, 20),
]

export const phul: ProgramDefinition = {
  id: "phul",
  discipline: "bodybuilding",
  metricType: "load",
  name: "PHUL (Power/Hypertrophy)",
  blurb: "4×/week blending heavy power days and higher-rep hypertrophy days — strength and size together. Double progression throughout.",
  sourceCitation: "PHUL — Power Hypertrophy Upper Lower (Brandon Campbell); structure re-implemented as data",
  popularityRank: 5,
  levels: [
    { id: "beginner", label: "Beginner", seedWorkingWeightKg: { phul_bench: 50, phul_row: 45, phul_ohp: 30, phul_pullup: 45, phul_curl: 20, phul_squat: 60, phul_dead: 80, phul_legpress: 100, phul_legcurl: 30, phul_calf: 50, phul_incline: 40, phul_pulldown: 45, phul_fly: 15, phul_lateral: 8, phul_triceps: 20, phul_frontsquat: 40, phul_rdl: 55, phul_legext: 35, phul_legcurl2: 30, phul_calf2: 40 } },
    { id: "intermediate", label: "Intermediate", seedWorkingWeightKg: { phul_bench: 85, phul_row: 70, phul_ohp: 50, phul_pullup: 65, phul_curl: 30, phul_squat: 110, phul_dead: 140, phul_legpress: 180, phul_legcurl: 45, phul_calf: 80, phul_incline: 65, phul_pulldown: 65, phul_fly: 22, phul_lateral: 12, phul_triceps: 30, phul_frontsquat: 70, phul_rdl: 90, phul_legext: 55, phul_legcurl2: 45, phul_calf2: 65 } },
    { id: "advanced", label: "Advanced", seedWorkingWeightKg: { phul_bench: 110, phul_row: 90, phul_ohp: 65, phul_pullup: 85, phul_curl: 40, phul_squat: 150, phul_dead: 190, phul_legpress: 240, phul_legcurl: 60, phul_calf: 110, phul_incline: 90, phul_pulldown: 85, phul_fly: 30, phul_lateral: 16, phul_triceps: 45, phul_frontsquat: 100, phul_rdl: 120, phul_legext: 75, phul_legcurl2: 60, phul_calf2: 90 } },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "upper-power", label: "Upper Power", exercises: upperPower },
      { id: "lower-power", label: "Lower Power", exercises: lowerPower },
      { id: "upper-hyp", label: "Upper Hypertrophy", exercises: upperHyp },
      { id: "lower-hyp", label: "Lower Hypertrophy", exercises: lowerHyp },
    ],
  },
}
