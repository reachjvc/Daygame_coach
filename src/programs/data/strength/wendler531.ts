/**
 * 5/3/1 — Wendler's percentage-of-training-max strength program.
 *
 * Source: Jim Wendler, "5/3/1: The Simplest and Most Effective Training System
 * for Raising the Strength" (2nd ed.). One main lift per day, 4 days/week,
 * over a 4-week wave. Working sets are % of a TRAINING MAX (TM = 90% of 1RM):
 *   Week 1 (5s):   65×5, 75×5, 85×5+      Week 2 (3s):   70×3, 80×3, 90×3+
 *   Week 3 (5/3/1): 75×5, 85×3, 95×1+     Week 4 (deload): 40×5, 50×5, 60×5
 * "+" = AMRAP top set. After each cycle add +2.5 kg (5 lb) to upper-body TMs
 * and +5 kg (10 lb) to lower-body TMs. Fail the top set → reset TM down 10%.
 *
 * Beginner level routes to StrongLifts 5×5 (linear LP is better for novices).
 */

import type { LoadExercise, ProgramDefinition } from "../../types"

const setsByWeek = {
  1: [{ pctTM: 0.65, reps: 5 }, { pctTM: 0.75, reps: 5 }, { pctTM: 0.85, reps: 5, amrap: true }],
  2: [{ pctTM: 0.7, reps: 3 }, { pctTM: 0.8, reps: 3 }, { pctTM: 0.9, reps: 3, amrap: true }],
  3: [{ pctTM: 0.75, reps: 5 }, { pctTM: 0.85, reps: 3 }, { pctTM: 0.95, reps: 1, amrap: true }],
  4: [{ pctTM: 0.4, reps: 5 }, { pctTM: 0.5, reps: 5 }, { pctTM: 0.6, reps: 5 }],
}

const upper = { kind: "percentage_tm" as const, tmIncrementKg: 2.5, tmIncrementLb: 5, missTmReductionPct: 0.1 }
const lower = { kind: "percentage_tm" as const, tmIncrementKg: 5, tmIncrementLb: 10, missTmReductionPct: 0.1 }

const ohp: LoadExercise = { id: "ohp", name: "Overhead Press", metricType: "load", scheme: { kind: "percentage_tm", setsByWeek }, progression: upper }
const deadlift: LoadExercise = { id: "deadlift", name: "Deadlift", metricType: "load", scheme: { kind: "percentage_tm", setsByWeek }, progression: lower }
const bench: LoadExercise = { id: "bench", name: "Bench Press", metricType: "load", scheme: { kind: "percentage_tm", setsByWeek }, progression: upper }
const squat: LoadExercise = { id: "squat", name: "Squat", metricType: "load", scheme: { kind: "percentage_tm", setsByWeek }, progression: lower }

export const wendler531: ProgramDefinition = {
  id: "wendler-531",
  discipline: "strength",
  metricType: "load",
  name: "5/3/1",
  blurb: "Four-week waves of percentage-based main-lift work with an AMRAP top set. Slow, sustainable strength built off a training max.",
  sourceCitation: "Jim Wendler — 5/3/1: The Simplest and Most Effective Training System (2nd ed.)",
  popularityRank: 2,
  levels: [
    { id: "beginner", label: "Beginner", structuralVariantOf: "stronglifts-5x5" },
    { id: "intermediate", label: "Intermediate", requires1RM: true },
    { id: "advanced", label: "Advanced", requires1RM: true },
  ],
  schedule: {
    kind: "weekly_waved",
    weeks: 4,
    days: [
      { id: "ohp-day", label: "Press Day", exercises: [ohp] },
      { id: "dl-day", label: "Deadlift Day", exercises: [deadlift] },
      { id: "bench-day", label: "Bench Day", exercises: [bench] },
      { id: "squat-day", label: "Squat Day", exercises: [squat] },
    ],
  },
}
