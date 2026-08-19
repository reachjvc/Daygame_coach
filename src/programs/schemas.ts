/**
 * Wire validation for a user-edited program schedule.
 *
 * A custom schedule is the ONLY part of this slice that arrives as free-form
 * JSON from the browser and is then executed by the progression engine, so it
 * is validated in full rather than cast. An unvalidated schedule would let a
 * caller write arbitrary JSON into their own `program_enrollments` row and hand
 * the engine set counts, rep counts and increments it will happily multiply —
 * NaN weights, hundred-set days, negative increments that ratchet a lift
 * downward. Every numeric field therefore carries a bound, not just a type.
 *
 * The bounds are deliberately generous (a 20-set day is silly but not
 * dangerous) — they exist to keep the engine's arithmetic finite and its output
 * loggable, not to referee anyone's training.
 */

import { z } from "zod"

const positiveInt = (max: number) => z.number().int().min(1).max(max)

/** Weight increments are per-unit and never converted, so both must be sane. */
const IncrementSchema = {
  incrementKg: z.number().positive().max(50),
  incrementLb: z.number().positive().max(100),
}

const LoadSchemeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("linear"), sets: positiveInt(20), reps: positiveInt(100) }),
  z.object({
    kind: z.literal("rep_range"),
    sets: positiveInt(20),
    repMin: positiveInt(100),
    repMax: positiveInt(100),
  }),
  z.object({
    kind: z.literal("percentage_tm"),
    setsByWeek: z.record(
      z.string(),
      z
        .array(
          z.object({
            pctTM: z.number().positive().max(2),
            reps: positiveInt(100),
            amrap: z.boolean().optional(),
          })
        )
        .min(1)
        .max(20)
    ),
  }),
])

const LoadProgressionSchema = z.discriminatedUnion("kind", [
  // "Leave it to me" — the engine holds the weight and reports no change.
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("linear_load"),
    ...IncrementSchema,
    deloadAfterFails: positiveInt(20),
    deloadPct: z.number().min(0).max(0.9),
  }),
  z.object({
    kind: z.literal("percentage_tm"),
    tmIncrementKg: z.number().positive().max(50),
    tmIncrementLb: z.number().positive().max(100),
    missTmReductionPct: z.number().min(0).max(0.9).optional(),
  }),
  z.object({
    kind: z.literal("double_progression"),
    ...IncrementSchema,
    deloadAfterFails: positiveInt(20).optional(),
    deloadPct: z.number().min(0).max(0.9).optional(),
  }),
])

const LoadExerciseSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    metricType: z.literal("load"),
    scheme: LoadSchemeSchema,
    progression: LoadProgressionSchema,
    // A superset tag is a short group key (A, B, C…), not free-form: it is
    // rendered as a label beside the lift and joined on for grouping.
    loadStyle: z.enum(["barbell", "free"]).optional(),
    supersetGroup: z.string().min(1).max(8).optional(),
    // Capped low on purpose: a drop set is two or three strips, and a program
    // asking for nine is a typo, not a plan.
    dropSets: positiveInt(4).optional(),
    note: z.string().max(120).optional(),
  })
  .refine((e) => e.scheme.kind !== "rep_range" || e.scheme.repMax >= e.scheme.repMin, {
    message: "The top of the rep range cannot be below the bottom",
  })
  .refine((e) => (e.scheme.kind === "percentage_tm") === (e.progression.kind === "percentage_tm"), {
    message: "A percentage-of-training-max scheme needs the matching progression rule",
  })

const SkillExerciseSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  metricType: z.literal("skill_tier"),
  tiers: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        name: z.string().min(1).max(120),
        sets: positiveInt(20),
        unlockReps: positiveInt(200),
      })
    )
    .min(1)
    .max(20),
})

const HoldExerciseSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    metricType: z.literal("hold_range"),
    sets: positiveInt(20),
    startSec: z.number().int().min(1).max(3600),
    targetSec: z.number().int().min(1).max(3600),
    incrementSec: z.number().int().min(1).max(600),
    perSide: z.boolean().optional(),
  })
  .refine((e) => e.targetSec >= e.startSec, { message: "The target hold cannot be shorter than the start" })

const day = <T extends z.ZodTypeAny>(exercise: T) =>
  z.object({
    id: z.string().min(1).max(80),
    label: z.string().min(1).max(120),
    // min(1): a day with no exercises prescribes an empty session, which would
    // advance the cursor and log a workout that did not happen.
    exercises: z.array(exercise).min(1).max(30),
    /** ISO weekday, 1 = Monday. Absent = trained in order rather than on a date. */
    weekday: z.number().int().min(1).max(7).optional(),
  })

/**
 * Endurance plans are absent on purpose: they are week-by-week prescriptions
 * that cannot be coherently edited, so `customize.ts` refuses them and this
 * schema gives the route a second, independent refusal.
 */
export const CustomScheduleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("linear_rotation"),
    days: z.array(day(LoadExerciseSchema)).min(1).max(14),
  }),
  z.object({
    kind: z.literal("weekly_waved"),
    weeks: positiveInt(52),
    days: z.array(day(LoadExerciseSchema)).min(1).max(14),
  }),
  z.object({
    kind: z.literal("skill_routine"),
    days: z.array(day(SkillExerciseSchema)).min(1).max(14),
  }),
  z.object({
    kind: z.literal("hold_routine"),
    days: z.array(day(HoldExerciseSchema)).min(1).max(14),
  }),
])

/** PUT body for /api/programs/enrollments/[id]/schedule. */
export const UpdateScheduleSchema = z.object({
  /** null restores the catalog program — the only way back from an edit. */
  customSchedule: CustomScheduleSchema.nullable(),
  /**
   * Starting weights for lifts the level's seed table does not cover.
   *
   * ZERO IS ALLOWED, and is the whole point for bodyweight work: a push-up, a
   * dip and an unweighted pull-up all start at nothing. `.positive()` here used
   * to make them impossible to enrol.
   */
  workingWeights: z.record(z.string(), z.number().min(0).max(1000)).optional(),
})
