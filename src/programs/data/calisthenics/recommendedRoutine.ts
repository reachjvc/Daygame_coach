/**
 * Bodyweight Foundations — full-body calisthenics progression routine.
 *
 * Source: r/bodyweightfitness "Recommended Routine" — structure re-implemented
 * as data, name genericized. Verified against published descriptions of the
 * routine on 2026-09-07: three sessions a week, warm-up first and the core
 * triplet last, strength work as PAIRS done alternating (a push with a pull, so
 * one rests while the other works), and every movement a ladder of harder
 * variations you climb when the current one gets easy.
 *
 * WHAT WAS WRONG BEFORE. Two things, and both changed what the app told you to
 * do. It had four lines (push, pull, legs, core) where the routine has six
 * strength ladders in three pairs plus a core triplet — no dip, no hinge, no
 * row, and no pairing at all. And every set was prescribed at the UNLOCK
 * threshold, so pressing "I did this" cleared the bar by definition and
 * promoted you to a harder variation after every single session, whatever you
 * had actually managed.
 *
 * The routine works in a range: three sets of five to eight, moving up when you
 * make eight on all three. `workReps` is the ask, `unlockReps` is the move-up.
 * The core triplet runs longer, eight to twelve.
 */

import type { ProgramDefinition, SkillExercise } from "../../types"

/** Within a pair: short. Between pairs: long. Both from the routine itself. */
const REST_IN_PAIR = 90
const REST_BETWEEN_PAIRS = 180

const ladder = (
  id: string,
  name: string,
  pair: string,
  tiers: [string, number][],
  { work, unlock, rest }: { work: number; unlock: number; rest: number }
): SkillExercise => ({
  id,
  name,
  metricType: "skill_tier",
  supersetGroup: pair,
  restSec: rest,
  tiers: tiers.map(([tierName], i) => ({
    id: `${id}-${i}`,
    name: tierName,
    sets: 3,
    workReps: work,
    unlockReps: unlock,
  })),
})

const STRENGTH = { work: 5, unlock: 8, rest: REST_IN_PAIR }
const CORE = { work: 8, unlock: 12, rest: REST_IN_PAIR }

// --- Pair A: vertical pull with a squat ------------------------------------
const pullUp = ladder("cal_pull", "Pull-up progression", "A", [
  ["Scapular pull", 0], ["Arch hang", 0], ["Negative pull-up", 0],
  ["Pull-up", 0], ["Archer pull-up", 0],
], STRENGTH)
const squat = ladder("cal_squat", "Squat progression", "A", [
  ["Assisted squat", 0], ["Bodyweight squat", 0], ["Split squat", 0],
  ["Bulgarian split squat", 0], ["Beginner shrimp squat", 0],
], { ...STRENGTH, rest: REST_BETWEEN_PAIRS })

// --- Pair B: dip with a hinge ----------------------------------------------
const dip = ladder("cal_dip", "Dip progression", "B", [
  ["Parallel bar support hold", 0], ["Negative dip", 0], ["Dip", 0],
  ["Weighted dip", 0],
], STRENGTH)
const hinge = ladder("cal_hinge", "Hinge progression", "B", [
  ["Bodyweight good morning", 0], ["Single-leg deadlift", 0],
  ["Banded nordic curl", 0], ["Nordic curl", 0],
], { ...STRENGTH, rest: REST_BETWEEN_PAIRS })

// --- Pair C: horizontal row with a push-up ----------------------------------
const row = ladder("cal_row", "Row progression", "C", [
  ["Vertical row", 0], ["Incline row", 0], ["Horizontal row", 0],
  ["Wide row", 0], ["Weighted row", 0],
], STRENGTH)
const pushUp = ladder("cal_push", "Push-up progression", "C", [
  ["Incline push-up", 0], ["Full push-up", 0], ["Diamond push-up", 0],
  ["Pseudo planche push-up", 0], ["Archer push-up", 0],
], { ...STRENGTH, rest: REST_BETWEEN_PAIRS })

// --- The core triplet, last -------------------------------------------------
const antiExtension = ladder("cal_core_ext", "Anti-extension (core)", "D", [
  ["Plank", 0], ["Ab wheel from knees", 0], ["Standing ab wheel", 0],
], CORE)
const antiRotation = ladder("cal_core_rot", "Anti-rotation (core)", "D", [
  ["Pallof press", 0], ["Half-kneeling pallof press", 0], ["Standing pallof press", 0],
], CORE)
const extension = ladder("cal_core_back", "Extension (core)", "D", [
  ["Reverse hyperextension", 0], ["Back extension", 0], ["Weighted back extension", 0],
], { ...CORE, rest: REST_BETWEEN_PAIRS })

export const recommendedRoutine: ProgramDefinition = {
  id: "bodyweight-foundations",
  discipline: "calisthenics",
  metricType: "skill_tier",
  name: "Bodyweight Foundations",
  blurb:
    "Full-body calisthenics, three times a week, no gym. Three pairs done alternating — a pull with a squat, a dip with a hinge, a row with a push-up — then a core triplet. Three sets of five to eight; move up a variation when you make eight on all three.",
  sourceCitation:
    "r/bodyweightfitness Recommended Routine (structure re-implemented as data; name genericized)",
  popularityRank: 1,
  levels: [{ id: "beginner", label: "Beginner" }],
  schedule: {
    kind: "skill_routine",
    days: [
      {
        id: "fullbody",
        label: "Full Body",
        exercises: [
          pullUp, squat,
          dip, hinge,
          row, pushUp,
          antiExtension, antiRotation, extension,
        ],
      },
    ],
  },
}
