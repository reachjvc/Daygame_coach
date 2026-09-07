/**
 * Push / Pull / Legs — the r/Fitness 6-day template.
 *
 * Source: the r/Fitness "PPL" template by u/metallicadpa — structure
 * re-implemented as data, name genericized (no branded text). Verified against
 * published descriptions of the routine on 2026-09-07.
 *
 * IT USED TO CITE THIS AND ENCODE SOMETHING ELSE. The old version was three
 * generic days (Push, Pull, Legs) with every lift on a double-progression rep
 * range and no deadlift anywhere, while the screen told the person it was the
 * r/Fitness PPL. The real template is six DIFFERENT days — A and B versions of
 * each — and its whole character is the main lift's straight sets with an
 * all-out last set:
 *
 *   Pull A  deadlift 1×5+          Pull B  barbell row 4×5, 1×5+
 *   Push A  bench 4×5, 1×5+        Push B  overhead press 4×5, 1×5+
 *   Legs A  squat 2×5, 1×5+        Legs B  squat 2×5, 1×5+
 *
 * with the other main lift dropped to 3×8–12 behind it, accessories at 3×8–12,
 * face pulls 5×15–20, arms 4×8–12, calves 5×8–12, and the triceps work
 * supersetted with lateral raises on push days. Upper-body lifts add 2.5 kg
 * (5 lb) a session, lower-body 5 kg (10 lb).
 *
 * The "+" set is why `straight_amrap` exists: it is neither a fixed set count
 * (there is no prescribed answer for the last set) nor a percentage wave.
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

/** Main lifts: straight sets, all-out last set, linear jumps. */
const UPPER_MAIN = {
  kind: "linear_load" as const,
  incrementKg: 2.5,
  incrementLb: 5,
  deloadAfterFails: 3,
  deloadPct: 0.1,
}
const LOWER_MAIN = {
  kind: "linear_load" as const,
  incrementKg: 5,
  incrementLb: 10,
  deloadAfterFails: 3,
  deloadPct: 0.1,
}
/** Everything behind the main lift: add reps inside the range, then weight. */
const DP = { kind: "double_progression" as const, incrementKg: 2.5, incrementLb: 5 }

/** `sets` counts every set including the AMRAP one — "4×5, 1×5+" is 5 sets. */
const main = (
  id: string,
  name: string,
  sets: number,
  reps: number,
  lower = false
): LoadExercise => ({
  id,
  name,
  metricType: "load",
  scheme: { kind: "straight_amrap", sets, reps },
  progression: lower ? LOWER_MAIN : UPPER_MAIN,
})

const acc = (
  id: string,
  name: string,
  sets: number,
  repMin: number,
  repMax: number,
  extra: Partial<LoadExercise> = {}
): LoadExercise => ({
  id,
  name,
  metricType: "load",
  scheme: { kind: "rep_range", sets, repMin, repMax },
  progression: DP,
  ...extra,
})

// ---------------------------------------------------------------------------
// The lifts. Ids are shared across the A/B days wherever the lift is the same
// one, because ids are how progression is tracked — a bench press is one bench
// press whether it is the main lift on Push A or the accessory on Push B.
// ---------------------------------------------------------------------------

const benchMain = main("bb_bench", "Bench Press", 5, 5)
const ohpMain = main("bb_ohp", "Overhead Press", 5, 5)
const rowMain = main("bb_row", "Barbell Row", 5, 5)
const deadliftMain = main("bb_deadlift", "Deadlift", 1, 5, true)
const squatMain = main("bb_squat", "Squat", 3, 5, true)

/** The other press, behind the main one. */
const benchBack = acc("bb_bench_back", "Bench Press", 3, 8, 12)
const ohpBack = acc("bb_ohp_back", "Overhead Press", 3, 8, 12)

const pushAccessories = (backOff: LoadExercise): LoadExercise[] => [
  backOff,
  acc("bb_incline_db", "Incline Dumbbell Press", 3, 8, 12),
  // Supersetted with the lateral raises, which is how the template is written:
  // the arm work and the delt work are done alternating, not one then the other.
  acc("bb_triceps", "Triceps Pushdown", 3, 8, 12, { supersetGroup: "A" }),
  acc("bb_lateral", "Lateral Raise", 3, 15, 20, { supersetGroup: "A" }),
  acc("bb_tri_ext", "Overhead Triceps Extension", 3, 8, 12, { supersetGroup: "B" }),
  acc("bb_lateral_b", "Lateral Raise", 3, 15, 20, { supersetGroup: "B" }),
]

const pullAccessories: LoadExercise[] = [
  acc("bb_pulldown", "Lat Pulldown", 3, 8, 12),
  acc("bb_cable_row", "Seated Cable Row", 3, 8, 12),
  acc("bb_facepull", "Face Pull", 5, 15, 20),
  acc("bb_hammer", "Hammer Curl", 4, 8, 12),
  acc("bb_curl", "Dumbbell Curl", 4, 8, 12),
]

const legAccessories: LoadExercise[] = [
  acc("bb_rdl", "Romanian Deadlift", 3, 8, 12),
  acc("bb_legpress", "Leg Press", 3, 8, 12),
  acc("bb_legcurl", "Leg Curl", 3, 8, 12),
  acc("bb_calf", "Standing Calf Raise", 5, 8, 12),
]

export const pushPullLegs: ProgramDefinition = {
  id: "push-pull-legs",
  discipline: "bodybuilding",
  metricType: "load",
  name: "Push / Pull / Legs (6-day)",
  blurb:
    "The r/Fitness six-day split. Two push, two pull and two leg days, each led by a main lift for straight sets and an all-out last set, with hypertrophy work behind it.",
  sourceCitation: "r/Fitness PPL template (structure re-implemented as data; name genericized)",
  popularityRank: 3,
  levels: [
    {
      id: "beginner",
      label: "Beginner",
      seedWorkingWeightKg: {
        bb_bench: 40, bb_ohp: 25, bb_row: 40, bb_deadlift: 60, bb_squat: 50,
        bb_bench_back: 32, bb_ohp_back: 20, bb_incline_db: 20, bb_triceps: 20,
        bb_lateral: 6, bb_tri_ext: 12, bb_lateral_b: 6,
        bb_pulldown: 35, bb_cable_row: 35, bb_facepull: 15, bb_hammer: 10, bb_curl: 10,
        bb_rdl: 40, bb_legpress: 80, bb_legcurl: 25, bb_calf: 40,
      },
    },
    {
      id: "intermediate",
      label: "Intermediate",
      seedWorkingWeightKg: {
        bb_bench: 70, bb_ohp: 40, bb_row: 60, bb_deadlift: 100, bb_squat: 90,
        bb_bench_back: 55, bb_ohp_back: 32, bb_incline_db: 30, bb_triceps: 30,
        bb_lateral: 10, bb_tri_ext: 20, bb_lateral_b: 10,
        bb_pulldown: 55, bb_cable_row: 55, bb_facepull: 25, bb_hammer: 16, bb_curl: 16,
        bb_rdl: 70, bb_legpress: 140, bb_legcurl: 40, bb_calf: 70,
      },
    },
    {
      id: "advanced",
      label: "Advanced",
      seedWorkingWeightKg: {
        bb_bench: 100, bb_ohp: 60, bb_row: 85, bb_deadlift: 150, bb_squat: 130,
        bb_bench_back: 80, bb_ohp_back: 45, bb_incline_db: 42, bb_triceps: 45,
        bb_lateral: 14, bb_tri_ext: 30, bb_lateral_b: 14,
        bb_pulldown: 75, bb_cable_row: 75, bb_facepull: 35, bb_hammer: 22, bb_curl: 22,
        bb_rdl: 100, bb_legpress: 200, bb_legcurl: 55, bb_calf: 100,
      },
    },
  ],
  schedule: {
    kind: "linear_rotation",
    days: [
      { id: "pull_a", label: "Pull A", exercises: [deadliftMain, ...pullAccessories] },
      { id: "push_a", label: "Push A", exercises: [benchMain, ...pushAccessories(ohpBack)] },
      { id: "legs_a", label: "Legs A", exercises: [squatMain, ...legAccessories] },
      { id: "pull_b", label: "Pull B", exercises: [rowMain, ...pullAccessories] },
      { id: "push_b", label: "Push B", exercises: [ohpMain, ...pushAccessories(benchBack)] },
      { id: "legs_b", label: "Legs B", exercises: [squatMain, ...legAccessories] },
    ],
  },
}
