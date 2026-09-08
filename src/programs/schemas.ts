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
import { entryWhenFields, hasDateIfTime, NEEDS_DATE_FOR_TIME } from "@/src/health/schemas"

const positiveInt = (max: number) => z.number().int().min(1).max(max)

/** Weight increments are per-unit and never converted, so both must be sane. */
const IncrementSchema = {
  incrementKg: z.number().positive().max(50),
  incrementLb: z.number().positive().max(100),
}

const LoadSchemeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("linear"), sets: positiveInt(20), reps: positiveInt(100) }),
  // Straight sets with an all-out last set — "4×5, then 1×5+".
  z.object({ kind: z.literal("straight_amrap"), sets: positiveInt(20), reps: positiveInt(100) }),
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
            restSec: z.number().int().min(15).max(600).optional(),
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
    // The smaller jump after the first stall, where the source prescribes one.
    stallIncrementKg: z.number().positive().max(50).optional(),
    stallIncrementLb: z.number().positive().max(100).optional(),
    // "down" is assistance: less of it is progress.
    direction: z.enum(["up", "down"]).optional(),
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
    loadStyle: z.enum(["barbell", "free", "bodyweight"]).optional(),
    // 15 s is the shortest rest worth timing; 10 min the longest worth calling rest.
    restSec: z.number().int().min(15).max(600).optional(),
    perSide: z.boolean().optional(),
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
  .refine((e) => e.scheme.kind !== "straight_amrap" || e.progression.kind !== "double_progression", {
    message: "An all-out last set is progressed by adding weight, not by chasing a rep range",
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
        workReps: positiveInt(200).optional(),
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

const day = <T extends z.ZodTypeAny>(exercise: T, minExercises: 0 | 1 = 1) =>
  z.object({
    id: z.string().min(1).max(80),
    label: z.string().min(1).max(120),
    // min(1): a day with no exercises prescribes an empty session, which would
    // advance the cursor and log a workout that did not happen.
    //
    // A DRAFT IS THE ONE EXCEPTION, and it passes 0. Building a week over two
    // sittings is the ordinary case, and refusing to SAVE a half-built one is
    // how the builder came to lose everything when you closed the tab. Saving
    // is permissive; starting is not — `CustomScheduleSchema` is what a draft
    // has to satisfy before it can become a program, and it still says 1.
    exercises: z.array(exercise).min(minExercises).max(30),
    /** ISO weekday, 1 = Monday. Absent = trained in order rather than on a date. */
    weekday: z.number().int().min(1).max(7).optional(),
  })

/** The four schedule shapes, with a floor on how full a day has to be. */
const scheduleUnion = (minExercises: 0 | 1) =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("linear_rotation"),
      days: z.array(day(LoadExerciseSchema, minExercises)).min(1).max(14),
    }),
    z.object({
      kind: z.literal("weekly_waved"),
      weeks: positiveInt(52),
      days: z.array(day(LoadExerciseSchema, minExercises)).min(1).max(14),
    }),
    z.object({
      kind: z.literal("skill_routine"),
      days: z.array(day(SkillExerciseSchema, minExercises)).min(1).max(14),
    }),
    z.object({
      kind: z.literal("hold_routine"),
      days: z.array(day(HoldExerciseSchema, minExercises)).min(1).max(14),
    }),
  ])

/**
 * Endurance plans are absent on purpose: they are week-by-week prescriptions
 * that cannot be coherently edited, so `customize.ts` refuses them and this
 * schema gives the route a second, independent refusal.
 */
export const CustomScheduleSchema = scheduleUnion(1)

/**
 * The same schedule, as it is allowed to look while you are still writing it.
 *
 * The ONLY difference is that a day may be empty. Everything else — the lift
 * shapes, the rep ranges, the progression rules, the fourteen-day ceiling — is
 * identical, so a draft cannot hold anything a program could not, and starting
 * one re-validates with `CustomScheduleSchema` rather than trusting this.
 */
export const DraftScheduleSchema = scheduleUnion(0)

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


/**
 * POST body for /api/programs/enrollments/[id]/log.
 *
 * Here rather than in the route because the route has a 50-line ceiling
 * (`tests/unit/architecture.test.ts`) and because validation is slice logic:
 * the same shape is what `logProgramSession` promises to accept.
 */
export const LogSessionSchema = z
  .object({
    dayId: z.string().min(1),
    cycle: z.number().int().positive(),
    week: z.number().int().positive(),
    entries: z.array(
      z.object({
        exerciseId: z.string().min(1),
        // A lift you were there for and deliberately did not do. It holds the
        // weight; an absent lift used to be scored as a failed one.
        skipped: z.boolean().optional(),
        sets: z.array(
          z.object({
            setNumber: z.number().int().positive(),
            // 0 = attempted and failed. A set not attempted has no row at all.
            reps: z.number().int().min(0).max(1000),
            weight: z.number().min(0).max(1000),
          })
        ),
      })
    ),
    // HOW LONG IT ACTUALLY TOOK, and how hard. Every session used to be written
    // down as exactly 45 minutes at effort 3 whatever had happened, which is
    // where the dashboard's invented "training hours" number came from.
    durationMin: z.number().min(1).max(600),
    intensity: z.number().int().min(1).max(5),
    distanceKm: z.number().min(0).max(1000).optional(),
    rpe: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(1000).optional(),
    // THE DAY YOU TRAINED. A session could only be stamped "now", so a Saturday
    // workout written up on Monday landed in Monday's week.
    ...entryWhenFields,
  })
  .refine(hasDateIfTime, NEEDS_DATE_FOR_TIME)


// ===========================================================================
// A workout that is happening right now
//
// In the slice rather than in the routes, because every route under
// /api/workouts has a 50-line ceiling (`tests/unit/architecture.test.ts`) and
// because the shape IS the contract `workoutRepo` promises to accept.
// ===========================================================================

export const StartWorkoutSchema = z.object({
  enrollmentId: z.string().uuid().nullable().optional(),
  dayId: z.string().min(1).max(80).nullable().optional(),
  /**
   * The browser's own id for this workout, minted before the request goes out.
   * A retry after a dropped connection returns the SAME workout instead of
   * opening a second one — which is what a gym with bad signal produces.
   */
  clientKey: z.string().min(8).max(64),
})

export const CompleteSetSchema = z.object({
  exerciseId: z.string().min(1).max(80).nullable(),
  exercise: z.string().min(1).max(120),
  weight: z.number().min(0).max(1000),
  // 0 = attempted and failed. A set not attempted has no row.
  reps: z.number().int().min(0).max(1000),
  setNumber: z.number().int().min(1).max(50),
  kind: z.enum(["warmup", "working", "amrap", "backoff", "drop"]).optional(),
  prescribedIndex: z.number().int().min(0).max(50).nullable().optional(),
  side: z.enum(["left", "right"]).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
})

export const AdjustWorkoutSchema = z.object({
  skipped: z.array(z.string().min(1).max(80)).max(40).optional(),
  incomplete: z.array(z.string().min(1).max(80)).max(40).optional(),
  swapped: z
    .record(z.string(), z.object({ name: z.string().min(1).max(120), libraryId: z.string().max(80).optional() }))
    .optional(),
  added: z
    .array(
      z.object({
        exerciseId: z.string().min(1).max(80),
        name: z.string().min(1).max(120),
        libraryId: z.string().max(80).optional(),
      })
    )
    .max(40)
    .optional(),
  order: z.array(z.string().min(1).max(80)).max(60).optional(),
  notes: z.string().max(1000).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
})

export const FinishWorkoutSchema = z.object({
  /**
   * When it really ended. Defaults to the last set you ticked, never to "now" —
   * a workout you forgot to finish on Tuesday and close on Thursday is not a
   * two-day workout, and the 600-minute ceiling would refuse it anyway.
   */
  endedAt: z.string().datetime().optional(),
  durationMin: z
    .number()
    .int()
    .min(1)
    .max(599, "A workout cannot be longer than ten hours — check when it really ended.")
    .optional(),
  intensity: z.number().int().min(1).max(5),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sessionType: z.enum(["weights", "cardio", "mobility", "yoga", "running"]).optional(),
})

// ============================================================================
// Saved training weeks
// ============================================================================

/** The parts of a draft a person can set. `source` is decided by the server. */
const DraftBody = {
  name: z.string().trim().min(1).max(60),
  discipline: z
    .enum(["strength", "bodybuilding", "calisthenics", "cardio", "flexibility", "triathlon", "ironman"])
    .optional(),
  unitSystem: z.enum(["kg", "lb"]).optional(),
  schedule: DraftScheduleSchema,
  /**
   * Zero is allowed and is the point for bodyweight work — a push-up, a dip and
   * an unweighted pull-up all start at nothing. `.positive()` on the enrollment
   * route is what used to make them impossible to enrol.
   */
  workingWeights: z.record(z.string(), z.number().min(0).max(1000)).optional(),
}

export const CreateDraftSchema = z.object({
  ...DraftBody,
  source: z.enum(["built", "catalog", "saved_workout"]).optional(),
  sourceProgramId: z.string().min(1).max(80).nullish(),
})

/** Every field optional: renaming a draft must not require resending the week. */
export const UpdateDraftSchema = z.object({
  name: DraftBody.name.optional(),
  discipline: DraftBody.discipline,
  unitSystem: DraftBody.unitSystem,
  schedule: DraftScheduleSchema.optional(),
  workingWeights: DraftBody.workingWeights,
})

/**
 * Starting a draft. The level is fixed at the custom program's only one, so the
 * body carries just the things a start can legitimately vary.
 */
export const StartDraftSchema = z.object({
  /** The bar it is trained on, when it is not the standard one. */
  barWeightKg: z.number().min(0).max(50).nullish(),
})
