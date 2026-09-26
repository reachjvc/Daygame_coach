/**
 * THE WORKOUT WENT AWAY WHILE THIS SCREEN WAS SHOWING IT.
 *
 * Two devices and one account is ordinary. Throw the workout away on the
 * laptop, and the phone in your hand is holding a workout that does not exist.
 * What the phone did, until 2026-09-26, was print the database's complaint
 * against every tick, one lift at a time:
 *
 *     That Squat set could not be saved: new row violates row-level security
 *     policy for table "workout_sets"
 *
 * Nothing was wrong with anybody's permissions — a set row has no user of its
 * own, so its policy asks whether the PARENT workout is yours, and a missing
 * parent reads as a policy refusal. Reproduced against the running app by
 * discarding on one client while five ticks were in flight from another: 18
 * refusals in 40 tries.
 *
 * So the server now answers `code: "workout_gone"`, and these are the four
 * things the screen owes the person when it arrives. The fourth is the one that
 * would be easiest to get wrong and worst to get wrong: it must not say the
 * workout was FINISHED.
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

const GONE = "This workout was thrown away somewhere else, so that change was not saved."

/** What a route sends once the workout is no longer there. */
const goneResponse = () =>
  ({
    ok: false,
    status: 400,
    json: async () => ({ error: GONE, code: "workout_gone" }),
  }) as unknown as Response

/** A refusal that is about the SET and not about the workout. */
const setRefused = () =>
  ({
    ok: false,
    status: 400,
    json: async () => ({ error: "Squat already has a warm-up set 1 — delete one of them first." }),
  }) as unknown as Response

describe("the workout is gone", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("takes the workout off the screen instead of refusing one set at a time", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(goneResponse())))
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.tick(aSet)
    })

    await waitFor(() => expect(result.current.workout).toBeNull())
    expect(result.current.vanished, "the screen has to be able to tell this from a finish").toBe(true)
    expect(result.current.error).toBe(GONE)
  })

  /**
   * A first version of this file asserted here that the message contains no
   * "row-level security". It passed whether or not the fix was in, because the
   * words it looked for were only ever in the FAKE — so it was a test of its own
   * fixture. Where those words really come from is the database, and the test
   * that can see them is `tests/unit/db/workoutGone.test.ts`, on the repo.
   *
   * What the hook owes, and what this asserts instead: the server's sentence is
   * shown as written, rather than wrapped in "That Squat set could not be
   * saved: …", which would name one lift for a workout-wide fact.
   */
  it("shows the server's sentence as written, not wrapped around one lift's name", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(goneResponse())))
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.tick(aSet)
    })

    await waitFor(() => expect(result.current.error).toBe(GONE))
    expect(result.current.error).not.toMatch(/Squat/)
  })

  it("empties the queue, so Finish is not disabled for ever on a workout that cannot be finished", async () => {
    // First, get a set into the queue the way a gym does it: the write fails.
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))))
    const { result } = renderHook(() => useLiveWorkout(workout))
    await act(async () => {
      await result.current.tick(aSet)
    })
    await waitFor(() => expect(result.current.unsaved).toBe(1))

    // Signal comes back, and the workout is gone.
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(goneResponse())))
    await act(async () => {
      await result.current.flush()
    })

    await waitFor(() => expect(result.current.unsaved).toBe(0))
    expect(result.current.vanished).toBe(true)
    expect(
      JSON.parse(window.localStorage.getItem("live-workout-queue-v1") ?? "[]"),
      "a set whose workout does not exist has nowhere to land"
    ).toEqual([])
  })

  it("leaves an ordinary set refusal alone — that one is about the set", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(setRefused())))
    const { result } = renderHook(() => useLiveWorkout(workout))

    await act(async () => {
      await result.current.tick(aSet)
    })

    // The workout is fine; only this set was refused, and the screen stays.
    expect(result.current.vanished).toBe(false)
    expect(result.current.workout).not.toBeNull()
    expect(result.current.error).toMatch(/already has a warm-up set 1/)
  })

  it("clears the rest clock, which would otherwise count down over nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(goneResponse())))
    const { result } = renderHook(() => useLiveWorkout(workout))

    act(() => {
      result.current.startRest("squat", 180, true)
    })
    await waitFor(() => expect(result.current.rest).not.toBeNull())

    await act(async () => {
      await result.current.tick(aSet)
    })

    await waitFor(() => expect(result.current.rest).toBeNull())
    expect(window.localStorage.getItem("live-workout-rest-v1")).toBeNull()
  })
})
