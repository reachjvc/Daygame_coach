/**
 * A CORRECTION MUST NOT DESTROY THE ORDER OF THE WORKOUT IT CORRECTS.
 *
 * WHAT WENT WRONG. `replace_sets_and_replay` deletes every set of a workout and
 * re-inserts the payload. Both halves of that round trip dropped two columns:
 * the function's INSERT named twelve and not `completed_at` or
 * `prescribed_index`, and the payload `reviseWorkout` built never sent them
 * either. So every corrected row came back with both null.
 *
 * Measured on 2026-09-27, one correction on a three-lift workout:
 *
 *   before: Squat 1 completed_at 2026-09-27T02:44:38.187Z, Press 1 …:52.9Z, …
 *   after:  every row completed_at NULL
 *
 * `inWorkoutOrder` sorts on `completed_at` FIRST and puts rows without one
 * LAST. So an uncorrected workout reads in the order you did it and a corrected
 * one reverts to slot order — permanently, because the instants are gone and
 * cannot be rebuilt. `prescribed_index` going null turns every corrected
 * program set into one the app reads as "added on the day".
 *
 * WHY THIS FILE IS ABOUT THE PAYLOAD. The parked migration's own header claimed
 * "the repo already sends both fields", and it did not: `CorrectedSet` declares
 * `completedAt` and `prescribedIndex`, and the mapping to database rows dropped
 * them one line later. Fixing only the SQL would have changed nothing on any
 * screen while looking like a fix. `tests/unit/db/schemaMirror.test.ts` guards
 * the SQL half by comparing the migration to the integration schema word for
 * word; this guards the half that no SQL can see.
 *
 * WHY NOT `setsInWorkoutOrder.test.ts`. That one feeds rows to the comparator
 * and asserts the order — it hands the comparator timestamps that are already
 * right, so it cannot see a write that throws them away. The claim is about the
 * WRITE, so the test has to read the write. Same reasoning as
 * `reTickKeepsItsTime.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row, type RpcCall } from "../../helpers/fakeSupabase"
import { reviseWorkout } from "@/src/db/workoutRepo"

const tables: Record<string, Row[]> = { program_enrollments: [], workout_logs: [], workout_sets: [] }
const calls: RpcCall[] = []

const fake = createFakeSupabase(tables, { calls, rpcResult: () => ({ data: null, error: null }) })

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const USER = "user-1"

/** A loose workout: no enrollment, so nothing is replayed and the rpc is the payload. */
const finishedLog: Row = {
  id: "log-1",
  user_id: USER,
  enrollment_id: null,
  session_type: "weights",
  logged_at: "2026-09-27T02:40:00.000Z",
  started_at: "2026-09-27T02:40:00.000Z",
  ended_at: "2026-09-27T03:20:00.000Z",
  adjustments: {},
  rpe: null,
  notes: null,
}

/** Three lifts, ticked in the order they were performed. */
const corrected = [
  { exercise: "Squat", setNumber: 1, completedAt: "2026-09-27T02:44:38.187Z", prescribedIndex: 0 },
  { exercise: "Overhead Press", setNumber: 1, completedAt: "2026-09-27T02:52:09.000Z", prescribedIndex: 1 },
  { exercise: "Deadlift", setNumber: 1, completedAt: "2026-09-27T03:05:11.000Z", prescribedIndex: 2 },
].map((s) => ({
  ...s,
  exerciseId: null,
  weightKg: 100,
  reps: 5,
  kind: "working" as const,
}))

beforeEach(() => {
  tables.program_enrollments = []
  tables.workout_logs = [finishedLog]
  tables.workout_sets = []
  calls.length = 0
})

describe("the payload a correction hands the database", () => {
  it("carries each set's own completed_at, so the workout still reads in the order it was done", async () => {
    await reviseWorkout(USER, "log-1", corrected)

    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("replace_sets_and_replay")
    const rows = calls[0].args.p_sets as Row[]
    expect(rows.map((r) => r.completed_at)).toEqual([
      "2026-09-27T02:44:38.187Z",
      "2026-09-27T02:52:09.000Z",
      "2026-09-27T03:05:11.000Z",
    ])
  })

  it("carries prescribed_index, so a corrected program set is not re-read as one added on the day", async () => {
    await reviseWorkout(USER, "log-1", corrected)

    const rows = calls[0].args.p_sets as Row[]
    expect(rows.map((r) => r.prescribed_index)).toEqual([0, 1, 2])
  })

  it("sends an explicit null for a set the editor ADDED, which genuinely has neither", async () => {
    /**
     * An added row has no instant and answers no slot. The keys must still be
     * present and null rather than absent: `jsonb_populate_recordset` reads a
     * missing key as null anyway, so the two behave alike in the database — but
     * a present null is the editor saying so, and it is what makes a row that
     * lost its timestamp distinguishable from a payload built by a caller that
     * never knew about these columns.
     */
    await reviseWorkout(USER, "log-1", [
      { exercise: "Curl", exerciseId: null, weightKg: 20, reps: 10, setNumber: 1, kind: "working" },
    ])

    const rows = calls[0].args.p_sets as Row[]
    expect(rows[0]).toHaveProperty("completed_at", null)
    expect(rows[0]).toHaveProperty("prescribed_index", null)
  })
})
