/**
 * EDITING THE PAST: WHAT THE APP HANDS THE DATABASE.
 *
 * WHAT WAS WRONG, in plain language. Deleting a past session did two separate
 * things — remove the session, then work out what the weights should now say.
 * The removal committed first, so a failure in the second step left the session
 * gone AND the weights still advanced by a session that no longer existed, while
 * the screen reported that the delete had failed. Correcting a session was worse:
 * four writes, with a rollback written in application code.
 *
 * WHAT THESE TESTS ASSERT. The payload handed to the database, not that a
 * function was called: which workout, which weights, and the session count the
 * app had read when it worked them out. That count is the whole optimistic
 * guard — if the program has moved on since, the calculation describes a
 * different history and the database refuses it.
 *
 * WHAT THEY DELIBERATELY DO NOT ASSERT: that the database keeps its side of the
 * bargain. "Both halves or neither" is a property of a transaction, and only a
 * real Postgres has one — see
 * `tests/integration/db/programRepo.integration.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row, type RpcCall } from "../../helpers/fakeSupabase"
// Static imports, not `await import`: vitest hoists `vi.mock` above every import
// in the file, so the repos already see the fake client — and a top-level await
// would be a new type error the ratchet counts.
import {
  removeProgramSession,
  replayedState,
  skipSession,
  resetEnrollment,
  logProgramSession,
} from "@/src/db/programRepo"
import { reviseWorkout } from "@/src/db/workoutRepo"
import { ProgramRefused, statusFor } from "@/src/programs/errors"
import { RESET_EFFECT } from "@/src/programs/programsService"

const tables: Record<string, Row[]> = { program_enrollments: [], workout_logs: [], workout_sets: [] }
const calls: RpcCall[] = []
let rpcAnswer: (call: RpcCall) => { data: unknown; error: unknown } = () => ({
  data: null,
  error: null,
})

const fake = createFakeSupabase(tables, {
  calls,
  rpcResult: (call) => rpcAnswer(call),
})

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const USER = "user-1"
const ENROLLMENT = "enr-1"

/** StrongLifts at the intermediate seeds, which is what `level` resolves to. */
const SEED = {
  squat: { workingWeight: 60, consecutiveFails: 0 },
  bench: { workingWeight: 40, consecutiveFails: 0 },
  row: { workingWeight: 40, consecutiveFails: 0 },
  ohp: { workingWeight: 30, consecutiveFails: 0 },
  deadlift: { workingWeight: 70, consecutiveFails: 0 },
}

function enrollmentRow(over: Partial<Row> = {}): Row {
  return {
    id: ENROLLMENT,
    user_id: USER,
    program_id: "stronglifts-5x5",
    level: "intermediate",
    unit_system: "kg",
    exercise_state: { ...SEED, squat: { workingWeight: 62.5, consecutiveFails: 0 } },
    initial_exercise_state: SEED,
    cursor: { cycle: 1, week: 1, dayIndex: 1, sessionCount: 1 },
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    custom_schedule: null,
    replay_events: [],
    bar_weight_kg: null,
    label: null,
    ...over,
  }
}

/** A finished session of Workout A, squatting the weight it was asked for. */
function sessionRow(id: string, at: string, weightKg = 60): Row {
  return {
    id,
    user_id: USER,
    enrollment_id: ENROLLMENT,
    session_type: "weights",
    program_day_id: "A",
    program_cycle: 1,
    program_week: 1,
    logged_at: at,
    created_at: at,
    started_at: null,
    ended_at: at,
    adjustments: {},
    rpe: null,
    notes: null,
    workout_sets: [1, 2, 3, 4, 5].map((n) => ({
      id: `${id}-s${n}`,
      log_id: id,
      exercise: "Squat",
      exercise_id: "squat",
      weight_kg: weightKg,
      reps: 5,
      set_number: n,
      set_kind: "working",
    })),
  }
}

beforeEach(() => {
  tables.program_enrollments = [enrollmentRow()]
  tables.workout_logs = [sessionRow("log-1", "2026-01-02T10:00:00.000Z")]
  tables.workout_sets = []
  calls.length = 0
  rpcAnswer = () => ({ data: enrollmentRow(), error: null })
})

describe("removing a session", () => {
  it("writes nothing when the recalculation cannot be done: no delete, no rpc", async () => {
    // A program started before starting weights were kept cannot be replayed at
    // all. Before this, the delete had already committed by the time anybody
    // found that out.
    tables.program_enrollments = [enrollmentRow({ initial_exercise_state: null })]

    await expect(removeProgramSession(USER, ENROLLMENT, "log-1")).rejects.toThrow(
      /started before starting weights were kept/
    )
    expect(calls).toEqual([])
    expect(tables.workout_logs).toHaveLength(1)
  })

  it("sends the workout id, the replayed state and the session count it read, in one rpc", async () => {
    await removeProgramSession(USER, ENROLLMENT, "log-1")

    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("remove_session_and_replay")
    expect(calls[0].args.p_log_id).toBe("log-1")
    expect(calls[0].args.p_enrollment_id).toBe(ENROLLMENT)
    // The only session is the one being removed, so the weights go back to the
    // starting numbers and the count to zero.
    expect(calls[0].args.p_exercise_state).toMatchObject({ squat: { workingWeight: 60 } })
    expect(calls[0].args.p_cursor).toMatchObject({ sessionCount: 0, dayIndex: 0 })
    // What the program said when the calculation was made — the stale guard.
    expect(calls[0].args.p_expected_session_count).toBe(1)
    // Nothing deleted a row on its own.
    expect(tables.workout_logs).toHaveLength(1)
  })

  it("surfaces a stale session count as a refusal the route answers with 409", async () => {
    rpcAnswer = () => ({
      data: null,
      error: {
        code: "55000",
        message: "Your program moved on while this was being recalculated — reload and try again",
      },
    })

    const thrown = await removeProgramSession(USER, ENROLLMENT, "log-1").catch((e) => e)
    expect(thrown).toBeInstanceOf(ProgramRefused)
    expect((thrown as Error).message).toMatch(/reload and try again/)
    // The sentence reaches the person with a status that says "nothing is
    // broken, this changes once you reload" rather than "we failed".
    expect(statusFor(thrown)).toBe(409)
  })

  it("keeps a genuine failure a failure, not a refusal", async () => {
    rpcAnswer = () => ({ data: null, error: { code: "57014", message: "canceling statement" } })

    const thrown = await removeProgramSession(USER, ENROLLMENT, "log-1").catch((e) => e)
    expect(thrown).not.toBeInstanceOf(ProgramRefused)
    expect(statusFor(thrown)).toBe(500)
  })
})

describe("correcting a session", () => {
  it("sends the new sets and the replayed state in one rpc, and never deletes sets on its own", async () => {
    rpcAnswer = () => ({ data: null, error: null })

    // The whole session as it is being corrected to: five sets of five at 65,
    // which is heavier than the 60 that was asked for.
    await reviseWorkout(
      USER,
      "log-1",
      [1, 2, 3, 4, 5].map((n) => ({
        exercise: "Squat",
        exerciseId: "squat",
        weightKg: 65,
        reps: 5,
        setNumber: n,
        kind: "working" as const,
      }))
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("replace_sets_and_replay")
    expect(calls[0].args.p_log_id).toBe("log-1")
    const rows = calls[0].args.p_sets as Row[]
    expect(rows).toHaveLength(5)
    expect(rows[0]).toMatchObject({ exercise_id: "squat", weight_kg: 65, reps: 5, set_number: 1 })
    // The corrected session was heavier than prescribed, so the replay ratchets
    // from what was actually done — and that is what travels with the sets.
    expect(calls[0].args.p_exercise_state).toMatchObject({ squat: { workingWeight: 67.5 } })
    expect(calls[0].args.p_expected_session_count).toBe(1)
    // The old hand-rolled path deleted every set in its own statement first.
    expect(tables.workout_sets).toEqual([])
  })

  it("computes before it writes: a program it cannot replay is refused with nothing sent", async () => {
    tables.program_enrollments = [enrollmentRow({ initial_exercise_state: null })]

    await expect(
      reviseWorkout(USER, "log-1", [
        { exercise: "Squat", exerciseId: "squat", weightKg: 65, reps: 5, setNumber: 1, kind: "working" },
      ])
    ).rejects.toThrow(/started before starting weights were kept/)
    expect(calls).toEqual([])
  })
})

describe("a history longer than one page", () => {
  it("replays all 1,001 sessions, not the first 1,000", async () => {
    /**
     * THE SILENT TRUNCATION. The database returns at most 1,000 rows per
     * request and says nothing about it — no error, no flag. This read was
     * unpaged, so somebody four years into a program had the first thousand
     * sessions replayed and the rest thrown away, and every weight the program
     * prescribed was then wrong with nothing on any screen saying so.
     *
     * 1,001 rows is the smallest number that can tell a paged read from an
     * unpaged one: the first page comes back full, so the loop has to ask again.
     */
    const many: Row[] = []
    for (let i = 0; i < 1001; i++) {
      // Same day, alternating nothing: the count is what is being measured.
      const at = new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString()
      many.push(sessionRow(`log-${String(i).padStart(4, "0")}`, at))
    }
    tables.workout_logs = many
    tables.program_enrollments = [
      enrollmentRow({ cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 1001 } }),
    ]

    const { enrollment } = await replayedState(USER, ENROLLMENT)
    expect(enrollment.cursor.sessionCount).toBe(1001)
  })
})

describe("what the weights would say", () => {
  it("replays the history with the change applied, and writes nothing", async () => {
    const before = JSON.parse(JSON.stringify(tables.program_enrollments))

    const { enrollment, expectedSessionCount } = await replayedState(USER, ENROLLMENT, {
      withoutLogId: "log-1",
    })

    expect(enrollment.cursor.sessionCount).toBe(0)
    expect(enrollment.exerciseState.squat.workingWeight).toBe(60)
    expect(expectedSessionCount).toBe(1)
    // The stored row is untouched: this function is a question, not an answer.
    expect(tables.program_enrollments).toEqual(before)
    expect(calls).toEqual([])
  })
})

/**
 * WHAT SKIP AND RESET WRITE.
 *
 * Both are one-line buttons that change the program's history, and both used
 * to write something that did not match what they said.
 */
describe("skipping a session", () => {
  it("is refused on a week that runs by the calendar, and writes nothing", async () => {
    // A week pinned Mon/Thu. `getTodaySession` picks the day by the weekday, so
    // the cursor this would advance is read by nobody: the screen came back
    // unchanged and a phantom "skipped" went into the history each time.
    const base = enrollmentRow()
    tables.program_enrollments = [
      {
        ...base,
        custom_schedule: {
          kind: "linear_rotation",
          days: [
            {
              id: "A",
              label: "Workout A",
              weekday: 1,
              exercises: [
                {
                  id: "squat",
                  name: "Squat",
                  scheme: { kind: "linear", sets: 5, reps: 5 },
                  progression: { kind: "linear_load", incrementKg: 2.5, deloadPct: 10, failuresBeforeDeload: 3 },
                },
              ],
            },
            {
              id: "B",
              label: "Workout B",
              weekday: 4,
              exercises: [
                {
                  id: "bench",
                  name: "Bench Press",
                  scheme: { kind: "linear", sets: 5, reps: 5 },
                  progression: { kind: "linear_load", incrementKg: 2.5, deloadPct: 10, failuresBeforeDeload: 3 },
                },
              ],
            },
          ],
        },
      },
    ]

    const before = JSON.stringify(tables.program_enrollments)
    await expect(skipSession(USER, ENROLLMENT)).rejects.toThrow(ProgramRefused)
    await expect(skipSession(USER, ENROLLMENT)).rejects.toThrow(/nothing to skip/i)
    expect(JSON.stringify(tables.program_enrollments)).toBe(before)
  })

  it("is a 409 at the route, not a 500 — it is something the person can act on", async () => {
    expect(statusFor(new ProgramRefused("This week runs by the calendar"))).toBe(409)
  })

  it("still moves a program that is worked through in order", async () => {
    await expect(skipSession(USER, ENROLLMENT)).resolves.toBeTruthy()
    const saved = tables.program_enrollments[0]
    expect((saved.replay_events as { kind: string }[]).map((e) => e.kind)).toEqual(["skip"])
  })
})

describe("resetting a program", () => {
  it("writes exactly RESET_EFFECT into the replay event", async () => {
    await resetEnrollment(USER, ENROLLMENT)
    const events = tables.program_enrollments[0].replay_events as Record<string, unknown>[]
    const reset = events.find((e) => e.kind === "reset")
    // The confirm box, this row and the replay branch that reads it all come
    // from the same constant. Spelling it by hand here is how they drift.
    expect(reset).toMatchObject({ kind: "reset", ...RESET_EFFECT })
  })

  it("rewinds the cursor and leaves the weights exactly where they were", async () => {
    await resetEnrollment(USER, ENROLLMENT)
    const saved = tables.program_enrollments[0]
    expect(saved.cursor).toMatchObject({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })
    // 62.5 is where the squat had been worked up to. The old confirm box
    // promised this number was about to be destroyed.
    expect((saved.exercise_state as Record<string, { workingWeight: number }>).squat.workingWeight).toBe(62.5)
  })
})

/**
 * WRITING UP A SESSION AFTER THE FACT.
 *
 * Three writes in a row with no rollback between them: the workout, its sets,
 * then the weights. Type 1000 into a weight box — a plausible slip for 100 —
 * and the workout row went in, the set insert was refused by the database's
 * NUMERIC(5,2) column, and the reply was an error about numeric overflow with
 * an empty session left behind.
 */
describe("logging a session that already happened", () => {
  const WRITE_UP = {
    dayId: "A",
    cycle: 1,
    week: 1,
    durationMin: 45,
    intensity: 3,
    entries: [
      {
        exerciseId: "squat",
        sets: [1, 2, 3, 4, 5].map((n) => ({ setNumber: n, reps: 5, weight: 62.5 })),
      },
    ],
  }

  it("sends the workout, its sets and the advanced state in one rpc", async () => {
    rpcAnswer = () => ({ data: { workout_id: "new-log", inserted: true }, error: null })

    await logProgramSession(USER, ENROLLMENT, WRITE_UP, 8, "felt good", undefined, "w-key12345")

    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("log_session_and_advance")
    const args = calls[0].args as Record<string, never>
    const workout = args.p_workout as unknown as Record<string, unknown>
    expect(workout.client_key).toBe("w-key12345")
    expect(workout.enrollment_id).toBe(ENROLLMENT)
    expect(workout.program_day_id).toBe("A")
    expect(workout.rpe).toBe(8)
    // Five sets, and none of them carrying a log id the database has not issued.
    const sets = args.p_sets as unknown as Record<string, unknown>[]
    expect(sets).toHaveLength(5)
    expect(sets.every((row) => !("log_id" in row))).toBe(true)
    // The session count the app READ, which is what the database checks against.
    expect(args.p_expected_session_count).toBe(1)
  })

  it("the same write-up sent twice advances the program once", async () => {
    rpcAnswer = () => ({ data: { workout_id: "already-there", inserted: false }, error: null })

    const result = await logProgramSession(USER, ENROLLMENT, WRITE_UP, undefined, undefined, undefined, "w-key12345")

    // The squat was already at 62.5 before this call. A second advance would
    // put it at 65 for one session's work.
    expect(result.enrollment.exerciseState.squat.workingWeight).toBe(62.5)
    expect(result.next.cycle).toBe(1)
  })

  it("a write-up that was already recorded reports no weight movement", async () => {
    rpcAnswer = () => ({ data: { workout_id: "already-there", inserted: false }, error: null })

    const result = await logProgramSession(USER, ENROLLMENT, WRITE_UP, undefined, undefined, undefined, "w-key12345")

    // The screen prints this list verbatim. Computed from the state as it now
    // stands it would read "Squat 62.5 → 65", which is a movement this request
    // did not make and the earlier one did not make either.
    expect(result.changes).toEqual([])
  })

  it("a program that moved on underneath surfaces as ProgramRefused, and the route answers 409", async () => {
    rpcAnswer = () => ({
      data: null,
      error: { code: "55000", message: "Your program moved on while this was being written up — reload and try again" },
    })

    const thrown = await logProgramSession(USER, ENROLLMENT, WRITE_UP, undefined, undefined, undefined, "w-key12345").catch(
      (e: unknown) => e
    )
    expect(thrown).toBeInstanceOf(ProgramRefused)
    expect(statusFor(thrown)).toBe(409)
  })

  it("an all-out set written up after the fact is stored as amrap", async () => {
    rpcAnswer = () => ({ data: { workout_id: "new-log", inserted: true }, error: null })

    // A program whose last set of the day is "as many as you can manage".
    tables.program_enrollments = [
      {
        ...enrollmentRow(),
        custom_schedule: {
          kind: "linear_rotation",
          days: [
            {
              id: "A",
              label: "Workout A",
              exercises: [
                {
                  id: "squat",
                  name: "Squat",
                  scheme: { kind: "straight_amrap", sets: 5, reps: 5 },
                  progression: { kind: "linear_load", incrementKg: 2.5, deloadPct: 10, failuresBeforeDeload: 3 },
                },
              ],
            },
          ],
        },
      },
    ]

    await logProgramSession(USER, ENROLLMENT, WRITE_UP, undefined, undefined, undefined, "w-key12345")

    const sets = calls[0].args.p_sets as unknown as { set_number: number; set_kind: string }[]
    // The live screen already stores this correctly. Before this, History
    // showed the same session differently depending on which door it came in by.
    expect(sets.filter((row) => row.set_kind === "amrap").map((row) => row.set_number)).toEqual([5])
    expect(sets.filter((row) => row.set_kind === "working")).toHaveLength(4)
  })
})
