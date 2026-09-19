/**
 * ONE RULE FOR A STARTING WEIGHT, AND ONE FOR A WEEK'S NAME.
 *
 * WHAT WAS WRONG. "What may a starting weight be" was written three times and
 * one copy disagreed: the enrol route said `.positive()` inline while the
 * schedule update and the draft body both said `.min(0)`. So a 0 kg push-up
 * could be saved as a week, and edited into a program already running, but
 * never started — and the refusal said only "Validation failed", naming
 * neither the lift nor the field. Anybody building a calisthenics week hit a
 * wall with nothing to act on.
 *
 * THE SECOND HALF. A week you write yourself had no name, so `enrollInProgram`
 * fell back to the catalogue shell it is built on and every one of them was
 * called "Your own program" — in the live header, in History and on the
 * Tracking card at once.
 *
 * The identity assertion below is the one that matters over time: it fails if
 * a fourth copy of the weight rule is ever written inline, which is exactly
 * how the first three came to disagree.
 */

import { describe, it, expect } from "vitest"
import {
  WorkingWeightsSchema,
  EnrollSchema,
  UpdateScheduleSchema,
  CreateDraftSchema,
} from "@/src/programs/schemas"
import { MAX_WEIGHT_KG } from "@/src/shared/weight"

/** The smallest thing each schema will accept, so a test can vary one field. */
const A_WEEK = {
  kind: "linear_rotation" as const,
  days: [
    {
      id: "d1",
      label: "Full body",
      exercises: [
        {
          id: "lib_push_up",
          name: "Push-up",
          metricType: "load" as const,
          scheme: { kind: "linear" as const, sets: 3, reps: 10 },
          progression: {
            kind: "linear_load" as const,
            incrementKg: 2.5,
            incrementLb: 5,
            deloadAfterFails: 3,
            deloadPct: 0.1,
          },
        },
      ],
    },
  ],
}

const enrolBody = (over: Record<string, unknown> = {}) => ({
  programId: "stronglifts-5x5",
  level: "intermediate" as const,
  unitSystem: "kg" as const,
  ...over,
})

describe("the three weight maps are one rule", () => {
  it("a bodyweight lift at 0 kg is accepted by enrol, schedule update and draft alike", () => {
    const weights = { lib_push_up: 0 }

    expect(EnrollSchema.safeParse(enrolBody({ workingWeights: weights })).success).toBe(true)
    expect(
      UpdateScheduleSchema.safeParse({ customSchedule: A_WEEK, workingWeights: weights }).success
    ).toBe(true)
    expect(
      CreateDraftSchema.safeParse({ name: "Calisthenics", schedule: A_WEEK, workingWeights: weights })
        .success
    ).toBe(true)
  })

  it("−1, MAX_WEIGHT_KG + 1 and 1000 are refused identically by all three", () => {
    for (const bad of [-1, MAX_WEIGHT_KG + 1, 1000]) {
      const weights = { lib_push_up: bad }
      expect(EnrollSchema.safeParse(enrolBody({ workingWeights: weights })).success, `enrol ${bad}`).toBe(
        false
      )
      expect(
        UpdateScheduleSchema.safeParse({ customSchedule: A_WEEK, workingWeights: weights }).success,
        `schedule ${bad}`
      ).toBe(false)
      expect(
        CreateDraftSchema.safeParse({ name: "W", schedule: A_WEEK, workingWeights: weights }).success,
        `draft ${bad}`
      ).toBe(false)
    }
  })

  it("all three unwrap to the same WorkingWeightsSchema object", () => {
    // Identity, not equivalence. A fourth inline `z.record(...)` written
    // somewhere would pass every assertion above and fail this one — which is
    // the failure that actually happened.
    const enrol = EnrollSchema._def.schema.shape.workingWeights
    expect(enrol._def.innerType).toBe(WorkingWeightsSchema)
    expect(UpdateScheduleSchema.shape.workingWeights._def.innerType).toBe(WorkingWeightsSchema)
    expect(CreateDraftSchema.shape.workingWeights._def.innerType).toBe(WorkingWeightsSchema)
  })

  it("a one-rep max of nothing is still refused, because it is not a max", () => {
    expect(EnrollSchema.safeParse(enrolBody({ oneRepMaxes: { squat: 0 } })).success).toBe(false)
    expect(EnrollSchema.safeParse(enrolBody({ oneRepMaxes: { squat: 100 } })).success).toBe(true)
  })
})

describe("a week you wrote yourself starts under a name", () => {
  it("a custom programId with no name is refused, at the name", () => {
    const parsed = EnrollSchema.safeParse(enrolBody({ programId: "custom", customSchedule: A_WEEK }))
    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.issues[0].path).toEqual(["label"])
    expect(parsed.success === false && parsed.error.issues[0].message).toMatch(/give this week a name/i)
  })

  it("a name of only spaces is no name", () => {
    const parsed = EnrollSchema.safeParse(
      enrolBody({ programId: "custom", customSchedule: A_WEEK, label: "   " })
    )
    expect(parsed.success).toBe(false)
  })

  it("a named custom week is accepted, and the name survives", () => {
    const parsed = EnrollSchema.safeParse(
      enrolBody({ programId: "custom", customSchedule: A_WEEK, label: "Winter block" })
    )
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.label).toBe("Winter block")
  })

  it("a catalogue program needs no name — it already has one", () => {
    expect(EnrollSchema.safeParse(enrolBody()).success).toBe(true)
  })
})
