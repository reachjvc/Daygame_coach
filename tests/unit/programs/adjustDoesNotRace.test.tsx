// @vitest-environment jsdom
/**
 * THREE TAPS, ONE SURVIVED.
 *
 * Every caller of `adjust` builds the whole field from `shown.adjustments` at
 * click time — "The WHOLE list, every time … building it from one index at the
 * call site is how one tick wipes another", says the comment above the
 * endurance ticks. But `shown` only changed when the response LANDED, so taps
 * inside one round trip all read the same list:
 *
 *   REQ {"blocksDone":[0]}
 *   REQ {"blocksDone":[1]}
 *   REQ {"blocksDone":[2]}
 *   RES {"blocksDone":[2]}      <- two ticks gone, no error
 *
 * Driven in a browser at 600ms between taps, which is an ordinary tapping
 * speed against a ~900ms round trip. One tick still wiped another, by the
 * other route. `skipped` (Skip this one) and `order` (Move up/down) are built
 * the same way and had the same race.
 *
 * The fix applies the patch locally BEFORE the request, so the next read sees
 * it — and puts it back if the server refuses, because an optimistic tick
 * that did not save must not stay on screen.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useLiveWorkout } from "@/src/programs/hooks/useLiveWorkout"
import type { LiveWorkout } from "@/src/programs/types"

const workout: LiveWorkout = {
  id: "w1",
  startedAt: "2026-09-27T18:00:00.000Z",
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

describe("ticking faster than the round trip", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("each tap sees the one before it, rather than the list it started with", async () => {
    // A slow server: every response lands well after all three taps.
    const sent: unknown[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: { body?: string }) => {
        sent.push(JSON.parse(init?.body ?? "{}"))
        return new Promise((resolve) =>
          setTimeout(
            () => resolve({ ok: true, status: 200, json: async () => workout } as unknown as Response),
            50
          )
        )
      })
    )
    const { result } = renderHook(() => useLiveWorkout(workout))

    /**
     * ONE `act` PER TAP. Three calls inside a single `act` are three calls in
     * one render — React has not re-rendered, so `result.current` is the same
     * object all three times and the test measures batching rather than the
     * race. A tap is an event with a render after it, which is why the
     * browser reproduced this and the first version of this test did not.
     */
    for (const i of [0, 1, 2]) {
      await act(async () => {
        // Exactly what the screen does: read the current list, append, send.
        const now = result.current.workout?.adjustments.blocksDone ?? []
        void result.current.adjust({ blocksDone: [...now, i].sort((a, b) => a - b) })
      })
    }

    await waitFor(() => expect(sent).toHaveLength(3))
    expect(
      (sent[2] as { blocksDone: number[] }).blocksDone,
      "the third tap must carry the first two"
    ).toEqual([0, 1, 2])
  })

  it("puts it back when the server refuses, so a failed tick does not stay ticked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: "no" }),
        } as unknown as Response)
      )
    )
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.adjust({ blocksDone: [0] })
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.workout?.adjustments.blocksDone ?? []).toEqual([])
  })
})
