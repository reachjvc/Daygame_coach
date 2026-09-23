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
import { MAX_DISTANCE_KM, MAX_WEIGHT_KG } from "@/src/shared/weight"
import { CUSTOM_PROGRAM_ID } from "./data/customProgram"
import { DISCIPLINES } from "./config"
import type { Discipline } from "./types"

const positiveInt = (max: number) => z.number().int().min(1).max(max)

/**
 * WHAT A STARTING WEIGHT MAY BE — one rule, one object, three callers.
 *
 * ZERO IS ALLOWED, and is the whole point for bodyweight work: a push-up, a
 * dip and an unweighted pull-up all start at nothing.
 *
 * This existed three times and one copy was wrong. The enrol route spelled its
 * own `.positive()` inline while the schedule update and the draft body each
 * said `.min(0)` — so a 0 kg push-up could be SAVED as a week and EDITED into a
 * running program, but never STARTED. Somebody building a calisthenics week hit
 * "Validation failed" with nothing naming the field.
 *
 * `tests/unit/programs/schemas.test.ts` asserts that all three callers unwrap
 * to this same object, so a fourth inline copy cannot appear quietly.
 */
export const WorkingWeightsSchema = z.record(z.string(), z.number().min(0).max(MAX_WEIGHT_KG))

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
  /** Starting weights for lifts the level's seed table does not cover. */
  workingWeights: WorkingWeightsSchema.optional(),
})


/**
 * `LogSessionSchema` was here: a whole session — every set, a duration, an
 * intensity and the day you say you trained — in one request body.
 *
 * It described the second way to record a workout, and the route that took it
 * is gone. A session is now `StartWorkoutSchema` (with `startedAt` when it
 * already happened), then one `CompleteSetSchema` per set, then
 * `FinishWorkoutSchema`. One shape of truth per fact.
 */
export const StartWorkoutSchema = z.object({
  enrollmentId: z.string().uuid().nullable().optional(),
  dayId: z.string().min(1).max(80).nullable().optional(),
  /**
   * The browser's own id for this workout, minted before the request goes out.
   * A retry after a dropped connection returns the SAME workout instead of
   * opening a second one — which is what a gym with bad signal produces.
   */
  clientKey: z.string().min(8).max(64),
  /**
   * WHEN IT REALLY STARTED, for a session being written up afterwards.
   *
   * Absent means now, which is every live workout. The server refuses a time
   * in the future, and one before the program began.
   */
  startedAt: z.string().datetime().optional(),
})

/**
 * WHAT A SET MAY CONTAIN — the numbers, in one object, and the sentence for
 * each of them.
 *
 * The bounds were written twice, in the two places that have to agree: here,
 * and on the ✓ of the row. `SetRow` carried its own `MAX_REPS = 1000` and no
 * bound at all on the set number, so the row and the server were one edit away
 * from disagreeing — and a disagreement here does not show up until a 400
 * arrives, after the tick has gone green and the rest clock has started.
 *
 * The SENTENCE is shared for the same reason. "Could not save that set" named
 * no field, so the row could only guess at its own wording; it now shows the
 * server's own sentence, in the unit the box is labelled in, before the request
 * goes out at all.
 */
export const SET_LIMITS = {
  /** `workout_sets.weight_kg` is `NUMERIC(5,2)`; 1000 overflows it. */
  weightMax: MAX_WEIGHT_KG,
  /** Nobody does a thousand reps, and nothing holds a plank for a thousand seconds. */
  repsMax: 1000,
  /** Fifty sets of one lift is not a workout, it is a typo or a loop. */
  setMax: 50,
} as const

/**
 * The refusal, in words, from the numbers above.
 *
 * `unitLabel` and `repWord` are the row's: the box is labelled "lb" or
 * "Seconds" and the sentence under it must use the same word, while the server
 * — which stores kilograms and reps — has no unit to name.
 */
export function setLimitSentence(
  field: "weight" | "reps" | "setNumber",
  labels: { unitLabel?: string; repWord?: string } = {}
): string {
  if (field === "weight") {
    const unit = labels.unitLabel ? ` ${labels.unitLabel}` : ""
    return `Weight must be between 0 and ${SET_LIMITS.weightMax}${unit}.`
  }
  if (field === "reps") {
    return `${labels.repWord ?? "Reps"} must be a whole number between 0 and ${SET_LIMITS.repsMax}.`
  }
  return `A set number must be a whole number between 1 and ${SET_LIMITS.setMax}.`
}

export const CompleteSetSchema = z.object({
  exerciseId: z.string().min(1).max(80).nullable(),
  exercise: z.string().min(1).max(120),
  weight: z
    .number()
    .min(0, setLimitSentence("weight"))
    .max(SET_LIMITS.weightMax, setLimitSentence("weight")),
  // 0 = attempted and failed. A set not attempted has no row.
  reps: z
    .number()
    .int(setLimitSentence("reps"))
    .min(0, setLimitSentence("reps"))
    .max(SET_LIMITS.repsMax, setLimitSentence("reps")),
  setNumber: z
    .number()
    .int(setLimitSentence("setNumber"))
    .min(1, setLimitSentence("setNumber"))
    .max(SET_LIMITS.setMax, setLimitSentence("setNumber")),
  kind: z.enum(["warmup", "working", "amrap", "backoff", "drop"]).optional(),
  prescribedIndex: z.number().int().min(0).max(50).nullable().optional(),
  side: z.enum(["left", "right"]).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
})

/**
 * CHANGING A SET THAT IS ALREADY WRITTEN — its kind, or how hard it was.
 *
 * Both fields are optional and at least one has to be there: a PATCH with
 * neither is a request that means nothing, and answering it 200 would say
 * something was changed.
 *
 * RPE IS BOUNDED BY THE COLUMN, NOT BY THE SLIDER. `workout_sets.rpe` is a
 * SMALLINT with `CHECK (rpe >= 1 AND rpe <= 10)`, and that is what a request
 * may contain. The slider offers 6–10 because an RPE below 6 on a logged
 * working set is not a distinction anybody makes — that is a choice about what
 * to ask for, and it does not belong in the rule about what can be stored.
 */
export const UpdateSetSchema = z
  .object({
    kind: z.enum(["warmup", "working", "amrap", "backoff", "drop"]).optional(),
    rpe: z.number().int("Effort is a whole number from 1 to 10.").min(1).max(10).nullable().optional(),
  })
  .refine((body) => body.kind !== undefined || body.rpe !== undefined, {
    message: "Nothing to change on that set.",
  })

export const AdjustWorkoutSchema = z.object({
  /**
   * Fifteen seconds is not a rest and ten minutes is a different workout.
   * Bounded here as well as on the screen because this is what a request can
   * actually contain.
   */
  rest: z.record(z.string().min(1).max(80), z.number().int().min(15).max(600)).optional(),
  /**
   * The blocks of a run that are done, by their row in the prescription. A
   * repeat group is one row, drawn as one row, and ticked as one row — the
   * inner blocks are the shape of the interval, not separate work.
   */
  blocksDone: z.array(z.number().int().min(0).max(60)).max(60).optional(),
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

export const FinishWorkoutSchema = z
  .object({
    /**
     * When it really ended. Defaults to the last set you ticked, never to "now" —
     * a workout you forgot to finish on Tuesday and close on Thursday is not a
     * two-day workout, and the 600-minute ceiling would refuse it anyway.
     */
    endedAt: z.string().datetime().optional(),
    /**
     * And when it really started, for a session written up afterwards.
     *
     * NO `durationMin`. It was a second copy of a fact these two instants
     * already state, and the server clamped a longer span to 599 rather than
     * saying anything — so a mistyped end quietly became a ten-hour workout
     * instead of being refused. The server derives the minutes now.
     */
    startedAt: z.string().datetime().optional(),
    intensity: z.number().int().min(1).max(5),
    rpe: z.number().int().min(1).max(10).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    /**
     * WHAT KIND OF SESSION — for a LOOSE workout only.
     *
     * It was removed entirely because it used to be written by a second update
     * after the transaction, whose error was thrown away, and no caller sent
     * it — so every live run was stored as a gym session. It is back for the
     * one case that genuinely does not know: "start a workout now", with no
     * program to ask. The server refuses it on a program workout, because
     * `sessionTypeFor` owns that and the finish does not get a vote.
     */
    sessionType: z.enum(["weights", "cardio", "mobility", "yoga", "running"]).optional(),
    /** How far, for a run or a ride. Null clears it. */
    distanceKm: z.number().min(0).max(MAX_DISTANCE_KM).nullable().optional(),
    /**
     * KEEP TODAY'S CHANGES IN THE PROGRAM.
     *
     * The server decides WHAT can be kept (`keepableChanges`), so this is only
     * the person's yes — a caller cannot smuggle a lift into the schedule by
     * naming it here.
     */
    keepChanges: z.boolean().optional(),
  })
  .refine((body) => !body.startedAt || !!body.endedAt, {
    path: ["endedAt"],
    // A moved start with an end guessed from a set's tick time is how a
    // backdated session ends up claiming to have lasted two days.
    message: "Say when it ended as well as when it started.",
  })

// ============================================================================
// Saved training weeks
// ============================================================================

/** The parts of a draft a person can set. `source` is decided by the server. */
const DraftBody = {
  name: z.string().trim().min(1).max(60),
  /**
   * FROM `DISCIPLINES`, NOT SPELLED OUT AGAIN.
   *
   * The seven ids were written here as a literal and in the Templates step as a
   * hard-coded list of SIX — which is how Half Ironman, which the catalogue has
   * and files under `ironman`, could not be reached from Life Mastery at all.
   * A private list of a shared fact is a list that will eventually be missing
   * one, and nothing tells you which.
   */
  discipline: z
    .enum(Object.keys(DISCIPLINES) as [Discipline, ...Discipline[]])
    .optional(),
  unitSystem: z.enum(["kg", "lb"]).optional(),
  schedule: DraftScheduleSchema,
  workingWeights: WorkingWeightsSchema.optional(),
}

/**
 * STARTING A PROGRAM. Lived inline in the route, which is why its weight rule
 * drifted from the other two.
 *
 * The `superRefine` is the one place that decides "a week you wrote yourself
 * starts under a name". It is on the SERVER because the alternative is every
 * screen remembering to ask: today's builder, the rebuilt one, a curl. Without
 * it, `enrollInProgram` falls back to the catalogue shell's own name and the
 * live header, History and the Tracking card all read "Your own program" —
 * three weeks in and every one of them is called the same thing.
 */
export const EnrollSchema = z
  .object({
    programId: z.string().min(1),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    unitSystem: z.enum(["kg", "lb"]),
    // Stays positive, unlike the working weights: a one-rep max of nothing is
    // not a max, it is a lift you cannot do.
    oneRepMaxes: z.record(z.string(), z.number().positive()).optional(),
    workingWeights: WorkingWeightsSchema.optional(),
    customSchedule: CustomScheduleSchema.nullish(),
    label: DraftBody.name.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.programId !== CUSTOM_PROGRAM_ID) return
    if (body.label && body.label.trim().length > 0) return
    ctx.addIssue({
      code: "custom",
      path: ["label"],
      message: "Give this week a name before starting it.",
    })
  })

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

/**
 * Correcting a finished workout: the whole set list, replaced.
 *
 * Whole rather than a patch, because a correction routinely REMOVES a set —
 * "I only did four" — and a list of changes cannot say that without inventing a
 * way to name a deletion.
 */
export const ReviseWorkoutSchema = z
  .object({
    sets: z
      .array(
        z.object({
          exercise: z.string().min(1).max(100),
          exerciseId: z.string().min(1).max(80).nullable(),
          /**
           * IN KILOGRAMS, converted by the caller from whatever unit it showed.
           *
           * It used to be "the number as typed", and the server converted it
           * with a unit it worked out for itself — from the profile, or from
           * the enrollment that owned the workout. Nothing made those agree
           * with the screen, so a pounds lifter's sets were rewritten 2.2 times
           * too light. The ceiling matches the column, which stops at 999.99.
           */
          weightKg: z.number().min(0).max(MAX_WEIGHT_KG),
          // 0 = attempted and failed. A set not attempted has no row.
          reps: z.number().int().min(0).max(1000),
          setNumber: z.number().int().positive().max(50),
          kind: z.enum(["warmup", "working", "amrap", "backoff", "drop"]),
          // Carried through so a correction does not quietly delete them.
          side: z.enum(["left", "right"]).nullish(),
          notes: z.string().max(500).nullish(),
          // The per-exercise note. It was NOT in this list, so it was the one
          // thing a correction still deleted — silently, and permanently.
          exerciseNotes: z.string().max(1000).nullish(),
          rpe: z.number().int().min(1).max(10).nullish(),
        })
      )
      .max(200),
  })
  .strict()
