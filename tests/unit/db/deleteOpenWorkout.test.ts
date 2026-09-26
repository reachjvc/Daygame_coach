// @vitest-environment node
/**
 * HISTORY CANNOT DELETE THE WORKOUT YOU ARE IN THE MIDDLE OF.
 *
 * There are two ways to get rid of a workout and they had opposite guards.
 * `discardWorkout` — the Throw away button on the live screen — goes through
 * `requireLive` and refuses anything that is not still running. `DELETE
 * /api/health/workout?id=` is History's, and `deleteWorkoutLog` never looked at
 * `ended_at` at all: hand it the id of an OPEN workout and it deleted it, sets
 * and all, while another device was still ticking into it.
 *
 * Verified against the running app on 2026-09-26, before the guard existed:
 *
 *     1. started: 201 ce2730e7…
 *     2. a set ticked into it: 200
 *     3. History's delete, on a workout that is OPEN: 200 {"success":true}
 *     4. still open? NO — it was deleted mid-workout
 *
 * That is the mechanism behind the sentence the owner saw. The set write checks
 * the workout is open, the row disappears, and the insert lands on the
 * database's own complaint — see `tests/unit/db/workoutGone.test.ts` for the
 * other half.
 *
 * It is a REFUSAL, not a failure: there is a way to get rid of an open workout,
 * and the sentence has to name it, or the person is stuck holding a workout
 * with no button that works.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

type Row = { enrollment_id: string | null; started_at: string | null; ended_at: string | null }

/** A workout in each of the three states History might be handed. */
const OPEN: Row = { enrollment_id: null, started_at: "2026-09-26T18:00:00Z", ended_at: null }
const FINISHED: Row = {
  enrollment_id: null,
  started_at: "2026-09-26T18:00:00Z",
  ended_at: "2026-09-26T19:00:00Z",
}
/** Written up after the fact: it never had a start, so it was never open. */
const WRITTEN_UP: Row = { enrollment_id: null, started_at: null, ended_at: null }

function fakeSupabase(row: Row | null) {
  /** True once a DELETE actually went to the database. */
  let deleted = false

  const table = () => {
    let deleting = false
    const chain: Record<string, unknown> = {
      select: () => chain,
      delete: () => {
        deleting = true
        return chain
      },
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
      single: () => Promise.resolve({ data: row, error: null }),
      then: (done: (v: unknown) => unknown) => {
        if (deleting) deleted = true
        return Promise.resolve({ data: null, error: null }).then(done)
      },
    }
    return chain
  }

  return { client: { from: table }, didDelete: () => deleted }
}

async function repoWith(row: Row | null) {
  const fake = fakeSupabase(row)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  const repo = await import("@/src/db/healthRepo")
  return { repo, fake }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

describe("deleteWorkoutLog", () => {
  test("refuses a workout that is still open, and says where the button is", async () => {
    const { repo, fake } = await repoWith(OPEN)
    await expect(repo.deleteWorkoutLog(USER, WORKOUT)).rejects.toThrow(
      "That workout is still open. Finish it or throw it away from the workout screen."
    )
    expect(fake.didDelete(), "nothing may be removed on the way to the refusal").toBe(false)
  })

  test("the refusal is a refusal, so the route answers 409 and not 500", async () => {
    const { statusFor } = await import("@/src/programs/errors")
    const { repo } = await repoWith(OPEN)
    const thrown = await repo.deleteWorkoutLog(USER, WORKOUT).catch((e: unknown) => e)
    expect(statusFor(thrown)).toBe(409)
  })

  test("still deletes a finished workout — History's actual job", async () => {
    const { repo, fake } = await repoWith(FINISHED)
    await expect(repo.deleteWorkoutLog(USER, WORKOUT)).resolves.toEqual({ recalculated: false })
    expect(fake.didDelete()).toBe(true)
  })

  test("still deletes one written up after the fact, which never had a start", async () => {
    // `started_at` null is a session typed in later. It is not open and never
    // was, so a guard keyed on "no end time" alone would have stranded it.
    const { repo, fake } = await repoWith(WRITTEN_UP)
    await expect(repo.deleteWorkoutLog(USER, WORKOUT)).resolves.toEqual({ recalculated: false })
    expect(fake.didDelete()).toBe(true)
  })

  test("a workout that is not there is not an open workout", async () => {
    const { repo } = await repoWith(null)
    await expect(repo.deleteWorkoutLog(USER, WORKOUT)).resolves.toEqual({ recalculated: false })
  })
})
