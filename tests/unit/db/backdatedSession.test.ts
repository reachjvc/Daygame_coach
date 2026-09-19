/**
 * A SESSION DATED BEFORE ONE YOU HAVE ALREADY RECORDED.
 *
 * You forget Tuesday and write it up on Friday, after Thursday's session.
 * The deleted form counted it as your NEXT session and moved the weights on
 * from where they stand — so Tuesday's result sat on top of Thursday's, and
 * the program's weights then disagreed with what the correction screen would
 * compute from the very same history.
 *
 * It replays instead, in date order, through the one function that already
 * answers "what do the weights say, given this history". Two things follow,
 * and both are asserted here: the transaction receives the REPLAYED cursor,
 * and a program too old to have kept its starting weights is refused BEFORE
 * anything is written, rather than guessed at.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { getProgram } from "@/src/programs/data/catalog"

const USER = "u1"
const WORKOUT = "w1"
const ENROLLMENT = "e1"

/** Thursday. The session being written up is dated Tuesday. */
const NEWEST_STORED = "2026-09-17T18:00:00.000Z"
const TUESDAY = "2026-09-15T18:00:00.000Z"

interface Opts {
  /** Null means the program predates starting weights being kept. */
  seed?: Record<string, unknown> | null
  /** What the stored history holds. Empty means nothing to be before. */
  storedLoggedAt?: string[]
}

function fakeSupabase() {
  const rpcCalls: Record<string, unknown>[] = []
  let ranged = false
  let rpcSeen = false

  const table = (name: string) => {
    let selected = ""
    const chain: Record<string, unknown> = {
      select: (cols: string) => {
        selected = cols
        return chain
      },
      eq: () => chain,
      or: () => chain,
      neq: () => chain,
      not: () => chain,
      is: () => chain,
      lt: () => chain,
      lte: () => chain,
      gte: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      range: (a: number) => {
        ranged = a === 0
        return chain
      },
      then: (done: (v: unknown) => unknown) => (resolve() as Promise<unknown>).then(done),
      maybeSingle: () => resolve(),
      single: () => resolve(),
    }

    function resolve() {
      if (name === "profiles") return Promise.resolve({ data: { weight_unit: "kg" }, error: null })
      if (name === "workout_sets") return Promise.resolve({ data: ranged ? [] : [], error: null })
      if (name !== "workout_logs") return Promise.resolve({ data: null, error: null })
      if (selected.includes("id, logged_at")) return Promise.resolve({ data: [], error: null })
      if (selected.includes("progression_changes")) {
        const closed = rpcSeen
        if (!closed) return Promise.resolve({ data: null, error: null })
        return Promise.resolve({
          data: {
            id: WORKOUT,
            enrollment_id: ENROLLMENT,
            started_at: TUESDAY,
            ended_at: "2026-09-15T19:00:00.000Z",
            duration_min: 60,
            progression_changes: null,
            personal_records: null,
          },
          error: null,
        })
      }
      if (selected.includes("ended_at")) {
        return Promise.resolve({
          data: { id: WORKOUT, ended_at: null, started_at: "2026-09-19T07:00:00.000Z" },
          error: null,
        })
      }
      return Promise.resolve({
        data: {
          id: WORKOUT,
          user_id: USER,
          session_type: "weights",
          started_at: "2026-09-19T07:00:00.000Z",
          ended_at: null,
          enrollment_id: ENROLLMENT,
          program_day_id: "A",
          program_cycle: 1,
          program_week: 1,
          adjustments: {},
          notes: null,
          rpe: null,
          client_key: "k1",
          logged_at: "2026-09-19T07:00:00.000Z",
          duration_min: null,
          intensity: null,
          distance_km: null,
          created_at: "2026-09-19T07:00:00.000Z",
        },
        error: null,
      })
    }
    return chain
  }

  return {
    rpcCalls,
    client: {
      from: table,
      rpc: (_n: string, args: Record<string, unknown>) => {
        rpcSeen = true
        rpcCalls.push(args)
        return Promise.resolve({ data: null, error: null })
      },
    },
  }
}

/** The replayed answer, which the repo must pass through untouched. */
const REPLAYED_CURSOR = { cycle: 3, week: 3, dayIndex: 1, sessionCount: 9 }

async function repoWith(opts: Opts) {
  const fake = fakeSupabase()
  const replayedState = vi.fn(async () => ({
    enrollment: {
      exerciseState: { squat: { workingWeight: 62.5, consecutiveFails: 0 } },
      cursor: REPLAYED_CURSOR,
    },
    expectedSessionCount: 8,
    changesForAdded: [{ exerciseId: "squat", name: "Squat", reason: "+2.5 kg" }],
  }))

  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  vi.doMock("@/src/db/programRepo", () => ({
    getEnrollmentById: async () => ({
      id: ENROLLMENT,
      user_id: USER,
      program_id: "stronglifts-5x5",
      level: "beginner",
      unitSystem: "kg",
      // Every lift StrongLifts prescribes: `applyLog` refuses an enrollment
      // that has no state for a lift it asks for, which is the right refusal
      // and not what these tests are about.
      exerciseState: Object.fromEntries(
        ["squat", "bench", "row", "ohp", "deadlift"].map((id) => [
          id,
          { workingWeight: 80, consecutiveFails: 0 },
        ])
      ),
      initialExerciseState:
        opts.seed === undefined
          ? Object.fromEntries(
              ["squat", "bench", "row", "ohp", "deadlift"].map((id) => [
                id,
                { workingWeight: 20, consecutiveFails: 0 },
              ])
            )
          : opts.seed,
      cursor: { cycle: 2, week: 2, dayIndex: 0, sessionCount: 8 },
      is_active: true,
      started_at: "2026-09-01T00:00:00.000Z",
      customSchedule: null,
      replayEvents: [],
    }),
    programFor: () => getProgram("stronglifts-5x5"),
    getSessionLogs: async () =>
      (opts.storedLoggedAt ?? [NEWEST_STORED]).map((logged_at, i) => ({
        id: `l${i}`,
        enrollment_id: ENROLLMENT,
        user_id: USER,
        day_id: "A",
        cycle: 1,
        week: 1,
        entries: [],
        rpe: null,
        notes: null,
        logged_at,
        created_at: logged_at,
      })),
    replayedState,
  }))

  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake, replayedState }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
  vi.doUnmock("@/src/db/programRepo")
})

const finish = { startedAt: TUESDAY, endedAt: "2026-09-15T19:00:00.000Z", intensity: 3 }

describe("a backdated program session", () => {
  test("is replayed into date order, and the transaction gets the replayed cursor", async () => {
    const { repo, fake, replayedState } = await repoWith({})

    await repo.finishWorkout(USER, WORKOUT, finish)

    expect(replayedState).toHaveBeenCalledTimes(1)
    const [, , change] = replayedState.mock.calls[0] as unknown as [string, string, { addLog: { logged_at: string } }]
    expect(change.addLog.logged_at, "dated when it happened, not when it was typed").toBe(TUESDAY)

    expect(fake.rpcCalls).toHaveLength(1)
    // NOT the cursor arrived at by moving on from where the program stands:
    // that would put Tuesday's result on top of Thursday's.
    expect(fake.rpcCalls[0].p_cursor).toEqual(REPLAYED_CURSOR)
    expect(fake.rpcCalls[0].p_expected_session_count).toBe(8)
  })

  test("the receipt says what THIS session moved, not what the whole replay moved", async () => {
    const { repo, fake } = await repoWith({})

    await repo.finishWorkout(USER, WORKOUT, finish)

    // A Tuesday session credited with weights Thursday moved would be the app
    // telling you something that did not happen.
    expect(fake.rpcCalls[0].p_changes).toEqual([
      { exerciseId: "squat", name: "Squat", reason: "+2.5 kg" },
    ])
  })

  test("a program with no stored starting weights is refused, and nothing is written", async () => {
    const { repo, fake, replayedState } = await repoWith({ seed: null })

    await expect(repo.finishWorkout(USER, WORKOUT, finish)).rejects.toThrow(
      /started before starting weights were kept/i
    )
    // Refused BEFORE the transaction: the session costs the retry, not the row.
    expect(fake.rpcCalls).toHaveLength(0)
    expect(replayedState).not.toHaveBeenCalled()
  })

  test("a session dated after the last one is NOT replayed — it just moves on", async () => {
    const { repo, fake, replayedState } = await repoWith({ storedLoggedAt: ["2026-09-10T18:00:00.000Z"] })

    await repo.finishWorkout(USER, WORKOUT, finish)

    // Replaying every session to add one at the end is the same answer at more
    // cost, and it would refuse an old program that has nothing to replay.
    expect(replayedState).not.toHaveBeenCalled()
    expect(fake.rpcCalls).toHaveLength(1)
    expect(fake.rpcCalls[0].p_expected_session_count).toBe(8)
  })

  test("a program with no history at all is not backdated relative to anything", async () => {
    const { repo, replayedState } = await repoWith({ storedLoggedAt: [] })

    await repo.finishWorkout(USER, WORKOUT, finish)

    expect(replayedState).not.toHaveBeenCalled()
  })
})
