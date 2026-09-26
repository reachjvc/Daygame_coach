// @vitest-environment node
/**
 * THE SECOND DOOR ONTO THE SAME DELETE.
 *
 * `deleteWorkoutLog` learned on 2026-09-26 to refuse a workout somebody is in
 * the middle of — `DELETE /api/health/workout?id=`, the route History uses.
 * That was reported as "the class is fixed". It was not: a second route,
 * `DELETE /api/programs/enrollments/[id]/log/[logId]`, reaches
 * `removeProgramSession` → `remove_session_and_replay`, and that function's SQL
 * is
 *
 *     DELETE FROM workout_logs WHERE id = p_log_id AND enrollment_id = …
 *
 * with no lifecycle predicate at all. Deleting the workout out from under an
 * open live screen is exactly what produced the row-level-security message the
 * owner saw, so leaving one of the two doors open left the cause reachable.
 *
 * Found by an adversarial review of the first fix, which is the only reason it
 * is here — the first fix's own tests all passed.
 *
 * AND IT REFUSES BEFORE REPLAYING. `replayedState` folds the whole history to
 * work out where the weights should land; doing that for a request about to be
 * refused is work nobody asked for, and the test asserts the order rather than
 * only the outcome.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const ENROLLMENT = "e1"
const LOG = "w1"

type Row = { started_at: string | null; ended_at: string | null }

const OPEN: Row = { started_at: "2026-09-26T18:00:00Z", ended_at: null }
const FINISHED: Row = { started_at: "2026-09-26T18:00:00Z", ended_at: "2026-09-26T19:00:00Z" }
/** Typed in afterwards: no start, no end. Never open, and must stay deletable. */
const WRITTEN_UP: Row = { started_at: null, ended_at: null }

function fakeSupabase(row: Row | null) {
  const rpcCalls: string[] = []
  const table = () => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
      single: () => Promise.resolve({ data: row, error: null }),
      then: (done: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(done),
    }
    return chain
  }
  return {
    client: {
      from: table,
      rpc: (name: string) => {
        rpcCalls.push(name)
        return Promise.resolve({ data: null, error: { message: "should not get here" } })
      },
    },
    rpcCalls,
  }
}

async function repoWith(row: Row | null) {
  const fake = fakeSupabase(row)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  /**
   * The replay is stubbed and COUNTED. It is the expensive half of this
   * function, and a guard that runs after it is a guard that costs a full
   * history fold on every refused request.
   */
  const replays: number[] = []
  const actual = await vi.importActual<typeof import("@/src/programs/programsService")>(
    "@/src/programs/programsService"
  )
  vi.doMock("@/src/programs/programsService", () => ({
    ...actual,
    replayEnrollment: () => {
      replays.push(1)
      return { enrollment: { exerciseState: {}, cursor: {} }, changesForAdded: [] }
    },
  }))
  const repo = await import("@/src/db/programRepo")
  return { repo, fake, replays }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/programs/programsService")
})

describe("removeProgramSession", () => {
  test("refuses a workout that is still open, and names the way out", async () => {
    const { repo, fake } = await repoWith(OPEN)
    await expect(repo.removeProgramSession(USER, ENROLLMENT, LOG)).rejects.toThrow(
      "That workout is still open. Finish it or throw it away from the workout screen."
    )
    expect(fake.rpcCalls, "nothing may be deleted on the way to the refusal").toEqual([])
  })

  test("the refusal is a refusal, so the route answers 409 and not 500", async () => {
    const { statusFor } = await import("@/src/programs/errors")
    const { repo } = await repoWith(OPEN)
    const thrown = await repo.removeProgramSession(USER, ENROLLMENT, LOG).catch((e: unknown) => e)
    expect(statusFor(thrown)).toBe(409)
  })

  test("refuses before replaying the history, not after", async () => {
    const { repo, replays } = await repoWith(OPEN)
    await repo.removeProgramSession(USER, ENROLLMENT, LOG).catch(() => null)
    expect(replays, "a refused request must not pay for a full replay").toEqual([])
  })

  /**
   * The other direction, and it is the half that stops the guard being a ban.
   *
   * These go past the guard and die further in, on a fake that cannot carry a
   * whole replay — so the assertion is not "it was deleted" but "it was not
   * REFUSED", which is precisely what the guard is responsible for. Asserting
   * the delete itself here would be asserting the fake.
   */
  test("a finished session is not refused — deleting it is the function's job", async () => {
    const { repo } = await repoWith(FINISHED)
    const thrown = await repo.removeProgramSession(USER, ENROLLMENT, LOG).catch((e: Error) => e)
    expect((thrown as Error | null)?.message ?? "").not.toMatch(/still open/i)
  })

  test("and neither is one written up afterwards, which was never open", async () => {
    const { repo } = await repoWith(WRITTEN_UP)
    const thrown = await repo.removeProgramSession(USER, ENROLLMENT, LOG).catch((e: Error) => e)
    expect((thrown as Error | null)?.message ?? "").not.toMatch(/still open/i)
  })
})
