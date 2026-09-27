// @vitest-environment node
/**
 * THE WORKOUT WAS DELETED WHILE THE CORRECTION EDITOR WAS OPEN.
 *
 * Every other write in `workoutRepo` answers this race with `WorkoutGone` —
 * 409, `code: "workout_gone"`, a sentence the screen can act on. `reviseWorkout`
 * threw a bare `Error("That workout no longer exists.")`, which `statusFor`
 * turns into a 500, and `/api/workouts/[id]/revise` was the one workout write
 * route of five that asked `statusFor` for a number and then wrote its own
 * body — so it never sent the code either.
 *
 * One cause, two answers. Tick a set into a workout somebody deleted on the
 * laptop and the phone says "This workout was thrown away somewhere else";
 * press Save on a correction to the same workout a second later and the screen
 * said the server had broken.
 *
 * `errors.ts` predicted this in its own header — "the alternative is each route
 * deciding for itself whether to pass a `code`" — and the route that drifted is
 * the one the stale-read guard was added to a round earlier. The architecture
 * test beside this one is what stops the sixth route doing it again.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

/** A workout row, or `null` for one that is not there any more. */
function fakeSupabase(log: Record<string, unknown> | null) {
  const rpcCalls: string[] = []
  const table = (name: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
      maybeSingle: () =>
        Promise.resolve({ data: name === "workout_logs" ? log : null, error: null }),
      single: () => Promise.resolve({ data: name === "workout_logs" ? log : null, error: null }),
      then: (done: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(done),
    }
    return chain
  }
  return {
    rpcCalls,
    client: {
      from: table,
      rpc: (n: string) => {
        rpcCalls.push(n)
        return Promise.resolve({ data: null, error: null })
      },
    },
  }
}

async function repoWith(log: Record<string, unknown> | null) {
  const fake = fakeSupabase(log)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

const aSet = {
  id: null,
  completedAt: null,
  prescribedIndex: null,
  exercise: "Squat",
  exerciseId: "squat",
  weightKg: 100,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  side: null,
  notes: null,
  exerciseNotes: null,
  rpe: null,
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("correcting a workout that is not there any more", () => {
  test("is the same refusal the live screen gets, not a server error", async () => {
    const { WorkoutGone } = await import("@/src/programs/errors")
    const { repo, fake } = await repoWith(null)
    const thrown = await repo.reviseWorkout(USER, WORKOUT, [aSet]).catch((e: unknown) => e)
    expect(thrown).toBeInstanceOf(WorkoutGone)
    expect((thrown as Error).message).toMatch(/thrown away somewhere else/i)
    /**
     * A COMPANION, NOT A CLAIM — and it used to be its own test, which is why
     * this note exists.
     *
     * "nothing is written on the way to the refusal" stood alone and could not
     * fail: delete the `if (!log)` guard entirely and `log.enrollment_id`
     * throws a TypeError before the rpc, so `rpcCalls` is empty either way. A
     * reviewer proved it twice, against the pre-fix code and against no guard
     * at all — 3 failed, 2 passed, and this was one of the two that passed.
     *
     * It rides on an assertion that CAN go red instead, and says out loud
     * which of the two it is.
     */
    expect(fake.rpcCalls, "and nothing was written on the way there").toEqual([])
  })

  test("so the route answers 409 and not 500", async () => {
    const { statusFor } = await import("@/src/programs/errors")
    const { repo } = await repoWith(null)
    const thrown = await repo.reviseWorkout(USER, WORKOUT, [aSet]).catch((e: unknown) => e)
    expect(statusFor(thrown)).toBe(409)
  })

  test("and carries the code the screen acts on, which this route never sent", async () => {
    const { errorBody } = await import("@/src/programs/errors")
    const { repo } = await repoWith(null)
    const thrown = await repo.reviseWorkout(USER, WORKOUT, [aSet]).catch((e: unknown) => e)
    expect(errorBody(thrown).code).toBe("workout_gone")
  })

})

describe("the stale-read guard on a workout that held no sets", () => {
  /**
   * `basedOn` WAS TESTED FOR LENGTH, so an editor that loaded an EMPTY workout
   * sent `[]` and the guard skipped itself — for precisely the workout where
   * sets arriving from another device are invisible on this screen. The client
   * always sends the array; only a client that sends nothing at all is exempt,
   * which is what `optional()` in the schema is for.
   */
  const finished = {
    id: WORKOUT,
    enrollment_id: null,
    started_at: "2026-09-27T08:00:00Z",
    ended_at: "2026-09-27T09:00:00Z",
    adjustments: {},
  }

  test("an empty read is still a read, and a set added elsewhere refuses it", async () => {
    /**
     * THE FAKE HAS TO BE ABLE TO SUCCEED, or the red proves nothing.
     *
     * The first version of this left `update` off the client. With the bug put
     * back by `scripts/prove-guard.sh` the guard was skipped, the write ran,
     * and the test went red on "supabase.from(...).update is not a function" —
     * red for a hole in the fake rather than for a write that should never
     * have happened. A guard proved by an incidental crash is not proved.
     *
     * So the write path here works end to end. With the guard gone the call
     * RESOLVES and the rejection assertion is what fails, which is the claim.
     */
    const rpcCalls: string[] = []
    /** One set exists now, where the editor loaded none. */
    const rows = [{ id: "s1" }]
    const chainFor = (name: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => chain,
        maybeSingle: () =>
          Promise.resolve({ data: name === "workout_logs" ? finished : null, error: null }),
        single: () =>
          Promise.resolve({ data: name === "workout_logs" ? finished : null, error: null }),
        then: (done: (v: unknown) => unknown) =>
          Promise.resolve({ data: name === "workout_sets" ? rows : [], error: null }).then(done),
      }
      return chain
    }
    const client = {
      from: chainFor,
      rpc: (n: string) => {
        rpcCalls.push(n)
        return Promise.resolve({ data: null, error: null })
      },
    }
    vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
    vi.doMock("@/src/db/settingsRepo", () => ({
      getUserTimezone: async () => "Europe/Copenhagen",
      getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
    }))
    const repo = await import("@/src/db/workoutRepo")
    await expect(repo.reviseWorkout(USER, WORKOUT, [aSet], [])).rejects.toThrow(
      /changed on another device/i
    )
    expect(rpcCalls, "and the sets were not replaced on the way to the refusal").toEqual([])
  })
})
