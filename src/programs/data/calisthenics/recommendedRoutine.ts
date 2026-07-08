/**
 * Bodyweight Foundations — full-body calisthenics progression routine.
 *
 * Source: r/bodyweightfitness "Recommended Routine" (the community's canonical
 * beginner routine) — structure re-implemented as data, name genericized. One
 * full-body session done ~3×/week. Each movement is a ladder of harder
 * variations; hit 3 sets of the listed reps on a variation to unlock the next.
 * No gym needed (a pull-up bar helps for the pull line).
 */

import type { ProgramDefinition, SkillExercise } from "../../types"

const line = (id: string, name: string, tiers: [string, number][]): SkillExercise => ({
  id,
  name,
  metricType: "skill_tier",
  tiers: tiers.map(([tierName, unlockReps], i) => ({ id: `${id}-${i}`, name: tierName, sets: 3, unlockReps })),
})

const push = line("cal_push", "Push", [
  ["Incline push-up", 12], ["Full push-up", 12], ["Diamond push-up", 10],
  ["Archer push-up", 8], ["One-arm push-up (assisted)", 5],
])
const pull = line("cal_pull", "Pull", [
  ["Negative pull-up", 8], ["Pull-up", 8], ["Chest-to-bar pull-up", 6],
  ["L-sit pull-up", 5], ["Muscle-up (assisted)", 3],
])
const legs = line("cal_legs", "Legs (single-leg)", [
  ["Bodyweight squat", 20], ["Split squat", 12], ["Bulgarian split squat", 10],
  ["Assisted pistol squat", 8], ["Pistol squat", 5],
])
const core = line("cal_core", "Core", [
  ["Lying leg raise", 15], ["Hanging knee raise", 12], ["Hanging leg raise", 10],
  ["Toes-to-bar", 8],
])

export const recommendedRoutine: ProgramDefinition = {
  id: "bodyweight-foundations",
  discipline: "calisthenics",
  metricType: "skill_tier",
  name: "Bodyweight Foundations",
  blurb: "Full-body calisthenics, ~3×/week, no gym. Push, pull, single-leg and core ladders — unlock the next variation as you get stronger.",
  sourceCitation: "r/bodyweightfitness Recommended Routine (structure re-implemented as data; name genericized)",
  popularityRank: 1,
  levels: [{ id: "beginner", label: "Beginner" }],
  schedule: {
    kind: "skill_routine",
    days: [{ id: "fullbody", label: "Full Body", exercises: [push, pull, legs, core] }],
  },
}
