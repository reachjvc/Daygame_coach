/**
 * STARTING, ENDING AND RESTARTING A PROGRAM: WHAT THE APP SENDS.
 *
 * WHAT WENT WRONG, in plain language. Starting a program switched the old one
 * OFF and then inserted the new one, as two separate writes. If the insert was
 * refused — the same program already running, a number the column cannot hold —
 * the person was left on no program at all, with a message about the insert and
 * nothing about the program that had just been switched off. "Run it again" did
 * the same two steps in the same order. And one old enrollment whose program had
 * since left the catalogue made it impossible to start ANY new program, because
 * working out what to displace threw on it.
 *
 * These assert the payload handed to the database: one call, carrying both the
 * new row and the list of programs it displaces. That the database then honours
 * "both or neither" is proven against a real Postgres in
 * `tests/integration/db/programRepo.integration.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row, type RpcCall } from "../../helpers/fakeSupabase"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { seedEnrollment } from "@/src/programs/programsService"

const tables: Record<string, Row[]> = { program_enrollments: [], workout_logs: [], profiles: [] }
const calls: RpcCall[] = []
let rpcAnswer: (call: RpcCall) => { data: unknown; error: unknown } = () => ({ data: null, error: null })

const fake = createFakeSupabase(tables, { calls, rpcResult: (c) => rpcAnswer(c) })

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

import {
  enrollInProgram,
  resumeEnrollment,
  unenroll,
  ProgramBusy,
} from "@/src/db/programRepo"
import { ProgramRefused } from "@/src/programs/errors"

const USER = "user-1"
const seed = seedEnrollment(strongLifts5x5, "beginner", "kg")

function enrollmentRow(id: string, over: Partial<Row> = {}): Row {
  return {
    id,
    user_id: USER,
    program_id: strongLifts5x5.id,
    level: "beginner",
    unit_system: "kg",
    exercise_state: seed.exerciseState,
    initial_exercise_state: seed.exerciseState,
    cursor: seed.cursor,
    is_active: true,
    started_at: "2026-09-01T00:00:00.000Z",
    custom_schedule: null,
    replay_events: [],
    bar_weight_kg: null,
    label: null,
    ...over,
  }
}

/** A week somebody wrote themselves, in the shape the builder sends. */
const ownWeek = {
  kind: "linear_rotation" as const,
  days: [
    {
      id: "d1",
      label: "Full body",
      exercises: [
        {
          id: "zzsquat",
          name: "ZZSquat",
          metricType: "load" as const,
          scheme: { kind: "linear" as const, sets: 5, reps: 5 },
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

beforeEach(() => {
  tables.program_enrollments = []
  tables.workout_logs = []
  calls.length = 0
  rpcAnswer = () => ({ data: enrollmentRow("e-new"), error: null })
})

describe("starting a program", () => {
  it("hands the new row and the programs it displaces to one rpc, and never updates is_active itself", async () => {
    tables.program_enrollments = [enrollmentRow("e-old")]

    const { displaced } = await enrollInProgram(USER, {
      programId: "couch-to-5k",
      level: "beginner",
      unitSystem: "kg",
    })

    // One call, not a pause followed by an insert.
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("start_enrollment")
    const row = calls[0].args.p_row as Row
    expect(row.user_id).toBe(USER)
    expect(row.is_active, "the function decides that, not the payload").toBeUndefined()
    expect(calls[0].args.p_displace).toEqual([])
    // A running program in a DIFFERENT discipline is not displaced.
    expect(displaced).toEqual([])
    expect(tables.program_enrollments.map((e) => e.is_active)).toEqual([true])
  })

  it("displaces the program running in the same discipline, by id, in that one call", async () => {
    tables.program_enrollments = [enrollmentRow("e-old")]

    const { displaced } = await enrollInProgram(USER, {
      programId: strongLifts5x5.id,
      level: "beginner",
      unitSystem: "kg",
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].args.p_displace).toEqual(["e-old"])
    expect(displaced.map((e) => e.id)).toEqual(["e-old"])
  })

  it("records the week it started with as the first thing in its history", async () => {
    // The row the function hands back is the one the prescription is built from.
    rpcAnswer = (c) => ({
      data: enrollmentRow("e-own", {
        program_id: "custom",
        level: "intermediate",
        custom_schedule: (c.args.p_row as Row).custom_schedule,
        exercise_state: { zzsquat: { workingWeight: 100, consecutiveFails: 0 } },
        initial_exercise_state: { zzsquat: { workingWeight: 100, consecutiveFails: 0 } },
      }),
      error: null,
    })

    await enrollInProgram(USER, {
      programId: "custom",
      level: "intermediate",
      unitSystem: "kg",
      customSchedule: ownWeek,
      workingWeights: { zzsquat: 100 },
    })

    const row = calls[0].args.p_row as Row
    const events = row.replay_events as { kind: string; schedule: unknown }[]
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe("schedule")
    expect(events[0].schedule).toEqual(ownWeek)
  })

  it("is not stopped by an old enrollment whose program has left the catalogue", async () => {
    // `requireProgram` threw on this, so one retired program on the account made
    // every new start impossible.
    tables.program_enrollments = [enrollmentRow("e-gone", { program_id: "a-program-we-retired" })]

    const { displaced } = await enrollInProgram(USER, {
      programId: strongLifts5x5.id,
      level: "beginner",
      unitSystem: "kg",
    })

    expect(calls).toHaveLength(1)
    // Nothing can say what discipline it was, so it is left alone rather than
    // guessed at.
    expect(calls[0].args.p_displace).toEqual([])
    expect(displaced).toEqual([])
  })
})

describe("ending a program", () => {
  it("surfaces the database's refusal as one the person can act on", async () => {
    tables.program_enrollments = [enrollmentRow("e1")]
    rpcAnswer = () => ({
      data: null,
      error: { code: "55000", message: "Finish or throw away the open workout first." },
    })

    const thrown = await unenroll(USER, "e1").catch((e) => e)
    expect(thrown).toBeInstanceOf(ProgramBusy)
    expect(thrown).toBeInstanceOf(ProgramRefused)
    expect(calls.map((c) => c.name)).toEqual(["end_enrollment"])
  })

  it("keeps a real failure a failure", async () => {
    tables.program_enrollments = [enrollmentRow("e1")]
    rpcAnswer = () => ({ data: null, error: { code: "08006", message: "connection lost" } })

    const thrown = await unenroll(USER, "e1").catch((e) => e)
    expect(thrown).not.toBeInstanceOf(ProgramRefused)
    expect((thrown as Error).message).toContain("Failed to end program")
  })
})

describe("running a finished program again", () => {
  it("says so when the program is no longer in the catalogue, instead of throwing a developer's sentence", async () => {
    tables.program_enrollments = [
      enrollmentRow("e-gone", { program_id: "a-program-we-retired", is_active: false }),
    ]

    const thrown = await resumeEnrollment(USER, "e-gone").catch((e) => e)
    expect(thrown).toBeInstanceOf(ProgramRefused)
    expect((thrown as Error).message).toMatch(/no longer in the catalogue/)
    expect(calls, "and nothing was sent").toEqual([])
  })

  it("sends the restart and what it displaces as one call", async () => {
    tables.program_enrollments = [
      enrollmentRow("e-finished", { is_active: false, program_id: "custom" }),
      enrollmentRow("e-running"),
    ]
    rpcAnswer = () => ({ data: enrollmentRow("e-finished", { program_id: "custom" }), error: null })

    const { displaced } = await resumeEnrollment(USER, "e-finished")

    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("resume_enrollment")
    expect(calls[0].args.p_id).toBe("e-finished")
    // Both are strength, so the running one makes room.
    expect(calls[0].args.p_displace).toEqual(["e-running"])
    expect(displaced.map((e) => e.id)).toEqual(["e-running"])
  })
})
