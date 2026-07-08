/**
 * Upper / Lower — 4-day hypertrophy/strength split (double progression).
 *
 * Source: the standard 4-day Upper/Lower template widely used for hypertrophy
 * (e.g. r/Fitness "Upper/Lower"). Structure re-implemented as data. Four
 * sessions/week alternating Upper → Lower. Compounds 6–8, accessories 8–15;
 * double progression on every lift. Starting weights are per-level suggestions.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const DP = { kind: "double_progression" as const, incrementKg: 2.5, incrementLb: 5 }
const ex = (id: string, name: string, sets: number, repMin: number, repMax: number): LoadExercise => ({
  id, name, metricType: "load", scheme: { kind: "rep_range", sets, repMin, repMax }, progression: DP,
})

const upper = [
  ex("ul_bench", "Bench Press", 4, 6, 8),
  ex("ul_row", "Barbell Row", 4, 6, 8),
  ex("ul_ohp", "Overhead Press", 3, 8, 12),
  ex("ul_pulldown", "Lat Pulldown", 3, 8, 12),
  ex("ul_curl", "Barbell Curl", 3, 10, 15),
  ex("ul_triceps", "Triceps Pushdown", 3, 10, 15),
]
const lower = [
  ex("ul_squat", "Squat", 4, 6, 8),
  ex("ul_rdl", "Romanian Deadlift", 4, 6, 8),
  ex("ul_legpress", "Leg Press", 3, 10, 15),
  ex("ul_legcurl", "Leg Curl", 3, 10, 15),
  ex("ul_calf", "Standing Calf Raise", 4, 12, 20),
]

export const upperLower: ProgramDefinition = {
  id: "upper-lower",
  discipline: "bodybuilding",
  metricType: "load",
  name: "Upper / Lower (4-day)",
  blurb: "Balanced 4×/week split — two upper and two lower days. Double progression; great middle ground between full-body and PPL.",
  sourceCitation: "Standard 4-day Upper/Lower hypertrophy template (structure re-implemented as data)",
  popularityRank: 4,
  levels: [
    { id: "beginner", label: "Beginner", seedWorkingWeightKg: { ul_bench: 40, ul_row: 40, ul_ohp: 25, ul_pulldown: 35, ul_curl: 20, ul_triceps: 20, ul_squat: 50, ul_rdl: 50, ul_legpress: 80, ul_legcurl: 25, ul_calf: 40 } },
    { id: "intermediate", label: "Intermediate", seedWorkingWeightKg: { ul_bench: 70, ul_row: 60, ul_ohp: 40, ul_pulldown: 55, ul_curl: 30, ul_triceps: 30, ul_squat: 90, ul_rdl: 80, ul_legpress: 140, ul_legcurl: 40, ul_calf: 70 } },
    { id: "advanced", label: "Advanced", seedWorkingWeightKg: { ul_bench: 100, ul_row: 85, ul_ohp: 60, ul_pulldown: 75, ul_curl: 40, ul_triceps: 45, ul_squat: 130, ul_rdl: 110, ul_legpress: 200, ul_legcurl: 55, ul_calf: 100 } },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "upper", label: "Upper", exercises: upper },
      { id: "lower", label: "Lower", exercises: lower },
    ],
  },
}
