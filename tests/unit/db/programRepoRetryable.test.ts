// @vitest-environment node
/**
 * THE READ ON THE MAJORITY PATH, WHICH HAD NO TEST AND WAS WRONG THREE TIMES.
 *
 * `getEnrollmentById` sits under `unitFor`, which sits under `getLiveWorkout`,
 * which runs before and after every single workout write. When it fails, the
 * status it produces decides whether a ticked set survives:
 *
 *   a 4xx tells the offline queue the write can never succeed, so it drops the
 *   set out of `localStorage`, takes the ✓ off the screen, and says it "has
 *   been removed"
 *
 * Three rounds of this change got that wrong in turn. First the function leaked
 * Postgres's own words. Then a fix rewrote the sentence and left the bare
 * `Error`, so the status stayed 400 and the set was still thrown away — "just
 * politely", as the commit admitted afterwards. Then a fix moved `unitFor`'s
 * PROFILES fallback to `CouldNotTell` — a branch that only runs for a LOOSE
 * workout — and left this one, the branch every program workout takes.
 *
 * Each time the reason it survived was the same: no fixture in the repository
 * ever failed this read.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const ENROLLMENT = "e1"

/** A read that fails the way a loaded database fails: a statement timeout. */
const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" }

function fakeSupabase(error: { code: string; message: string } | null) {
  const table = () => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error }),
      single: () => Promise.resolve({ data: null, error }),
      then: (done: (v: unknown) => unknown) => Promise.resolve({ data: [], error }).then(done),
    }
    return chain
  }
  return { from: table }
}

async function repoWith(error: { code: string; message: string } | null) {
  vi.doMock("@/src/db/supabase", () => ({
    createServerSupabaseClient: async () => fakeSupabase(error),
  }))
  return await import("@/src/db/programRepo")
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

describe("getEnrollmentById when the read fails", () => {
  test("is retryable, so a blip does not delete the set that is mid-flight", async () => {
    const { workoutErrorResponse } = await import("@/src/programs/errors")
    const repo = await repoWith(TIMEOUT)
    const thrown = await repo.getEnrollmentById(USER, ENROLLMENT).catch((e: unknown) => e)
    expect(
      workoutErrorResponse(thrown).status,
      "anything in the 400s makes the offline queue throw the set away"
    ).toBe(503)
  })

  test("says nothing the database said", async () => {
    const repo = await repoWith(TIMEOUT)
    const thrown = await repo.getEnrollmentById(USER, ENROLLMENT).catch((e: Error) => e)
    expect((thrown as Error).message).not.toMatch(/statement timeout/i)
    expect((thrown as Error).message).not.toMatch(/canceling/i)
    expect((thrown as Error).message).toMatch(/could not read that program/i)
  })

  test("a row that is simply not there is still null, not an error", async () => {
    // PGRST116 is PostgREST for "no rows", which is an answer and not a
    // failure: the caller decides what an absent enrollment means.
    const repo = await repoWith({ code: "PGRST116", message: "no rows" })
    await expect(repo.getEnrollmentById(USER, ENROLLMENT)).resolves.toBeNull()
  })
})
