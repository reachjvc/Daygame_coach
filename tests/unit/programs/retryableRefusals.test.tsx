// @vitest-environment jsdom
/**
 * A 4xx IS NOT ALWAYS "THIS CAN NEVER BE SAVED", AND THE COST OF THE
 * DIFFERENCE IS A SET SOMEBODY DID.
 *
 * The tick and the queue both read `status >= 400 && status < 500` as "the
 * server will refuse this for ever": the ✓ comes off, the row leaves
 * `localStorage`, and the person is told it "has been removed". That rule was
 * written about the refusals `workoutRepo` raises — a set the schema will not
 * take, a workout that is gone — and it is false for the statuses that mean
 * "not now".
 *
 * 401 is the one that bites. `requireAuth` answers 401, and `proxy.ts`'s
 * matcher does not cover `/api/workouts/*`, so a live screen open for a whole
 * gym session refreshes its session only through the route handlers
 * themselves. One failed refresh deleted every queued set at once.
 *
 * `errors.ts` calls this "the worst outcome in this whole file", and it was
 * introduced BY the careful fix: `CouldNotTell` → 503 closed the 5xx half of
 * exactly this and left the 4xx half open. Third time this class has been
 * closed one path short.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useLiveWorkout } from "@/src/programs/hooks/useLiveWorkout"
import type { LiveWorkout } from "@/src/programs/types"

const workout: LiveWorkout = {
  id: "w1",
  startedAt: "2026-09-26T18:00:00.000Z",
  enrollmentId: "e1",
  dayId: "A",
  cycle: 1,
  week: 1,
  adjustments: {},
  notes: null,
  rpe: null,
  unit: "kg",
  sets: [],
}

const aSet = {
  exerciseId: "squat",
  exercise: "Squat",
  weight: 60,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  side: null,
}

const answering = (status: number, body: Record<string, unknown> = {}) =>
  ({ ok: false, status, json: async () => body }) as unknown as Response

/**
 * The hook exposes the queue as a COUNT (`unsaved`) and a list of slots, not
 * as the array. The first version of this file read `result.current.queue`,
 * which is undefined — so every assertion threw and all five tests were red,
 * including the three that should have passed with the fix in. A test that
 * fails for the wrong reason proves as little as one that passes for the
 * wrong reason.
 */
const stillHeld = (result: { current: ReturnType<typeof useLiveWorkout> }) =>
  result.current.unsaved > 0

describe("a 4xx that means 'not now'", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  for (const [status, why] of [
    [401, "the session expired mid-workout and the next call will refresh it"],
    [408, "the request timed out on the way, so nothing was decided"],
    [429, "rate limited — a retry instruction with a number on it"],
  ] as [number, string][]) {
    it(`keeps the set when the server answers ${status} — ${why}`, async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(answering(status, { error: "no" }))))
      const { result } = renderHook(() => useLiveWorkout(workout))

      await act(async () => {
        await result.current.tick(aSet)
      })

      await waitFor(() => expect(stillHeld(result)).toBe(true))
      // `?? ""` because the right answer here is usually NO message at all —
      // the set is queued and the footer says "waiting for signal". `toMatch`
      // cannot take null, which is what the first version of this tripped on.
      expect(
        result.current.error ?? "",
        `a ${status} must not tell somebody their set was removed`
      ).not.toMatch(/has been removed|could not be saved/i)
    })
  }

  it("still drops a set the schema will never take, which is what the rule is for", async () => {
    // 400: the row itself is wrong. Asking again cannot change that, and
    // leaving it queued jams every later set behind it.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          answering(400, { error: "Squat already has a warm-up set 1 — delete one of them first." })
        )
      )
    )
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.tick(aSet)
    })

    await waitFor(() => expect(result.current.error).toMatch(/could not be saved/i))
    expect(stillHeld(result), "a permanently refused set may not sit in the queue").toBe(false)
  })

  it("and still treats 403 as permanent: the row is not yours", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(answering(403, { error: "no" }))))
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.tick(aSet)
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(stillHeld(result)).toBe(false)
  })
})
