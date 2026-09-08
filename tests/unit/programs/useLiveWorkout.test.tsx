/**
 * The live workout hook, on the two things that lose a set.
 *
 * THE RACE THIS EXISTS FOR. Ticking a set sends a write and shows the ✓
 * immediately, which is right — you are standing at a rack. Finishing was
 * blocked only while a write had already FAILED and been queued, so a write
 * still on the wire counted as saved. Tick the last set, tap Finish, tap Save,
 * and the finish request overtook the set request: the summary said nothing was
 * lifted, and the progression engine judged the lift as missed and held the
 * weight back. It is the ordinary way to end a workout, not an edge case.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useLiveWorkout, startKeyFor, clearStartKey } from "@/src/programs/hooks/useLiveWorkout"
import type { LiveWorkout } from "@/src/programs/types"

const workout: LiveWorkout = {
  id: "w1",
  startedAt: "2026-09-07T18:00:00.000Z",
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

const oneSet = {
  id: "a",
  exerciseId: "squat",
  exercise: "Squat",
  weight: 60,
  weightKg: 60,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  prescribedIndex: null,
  completedAt: null,
  rpe: null,
  side: null,
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

/** A response that only resolves when the test says so. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response

describe("useLiveWorkout", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("refuses to finish while a set is still on the wire", async () => {
    const setWrite = deferred<Response>()
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(String(url))
        if (String(url).endsWith("/sets")) return setWrite.promise
        return Promise.resolve(ok({ workoutId: "w1", sets: 1 }))
      })
    )

    const { result } = renderHook(() => useLiveWorkout(workout))

    // Tick, but do not let the write land yet.
    act(() => {
      void result.current.tick(aSet)
    })
    await waitFor(() => expect(result.current.saving).toBe(1))

    // Save, in the fraction of a second before the set lands.
    let summary: unknown = "not called"
    await act(async () => {
      summary = await result.current.finish({ intensity: 3 })
    })

    expect(summary, "the finish must not go through").toBeNull()
    expect(calls.some((u) => u.includes("/finish")), "and must not reach the server").toBe(false)
    expect(result.current.error).toMatch(/still saving/i)

    // Once the set lands, finishing works.
    await act(async () => {
      setWrite.resolve(ok({ ...workout, sets: [] }))
      await setWrite.promise
    })
    await waitFor(() => expect(result.current.saving).toBe(0))

    await act(async () => {
      summary = await result.current.finish({ intensity: 3 })
    })
    expect(summary).toEqual({ workoutId: "w1", sets: 1 })
    expect(calls.some((u) => u.includes("/finish"))).toBe(true)
  })

  it("refuses to finish while a failed set is waiting for signal", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(String(url))
        if (String(url).endsWith("/sets")) return Promise.reject(new Error("offline"))
        return Promise.resolve(ok({ workoutId: "w1" }))
      })
    )

    const { result } = renderHook(() => useLiveWorkout(workout))
    await act(async () => {
      await result.current.tick(aSet)
    })
    // Failed writes are held in localStorage under the slot they belong to, so
    // replaying one corrects that set rather than adding a second.
    await waitFor(() => expect(result.current.unsaved).toBe(1))

    let summary: unknown = "not called"
    await act(async () => {
      summary = await result.current.finish({ intensity: 3 })
    })
    expect(summary).toBeNull()
    expect(calls.some((u) => u.includes("/finish"))).toBe(false)
  })

  it("shows a ticked set before the server has confirmed it", async () => {
    const setWrite = deferred<Response>()
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        String(url).endsWith("/sets") ? setWrite.promise : Promise.resolve(ok(null))
      )
    )

    const { result } = renderHook(() => useLiveWorkout(workout))
    act(() => {
      void result.current.tick(aSet)
    })

    // The whole point of the optimistic tick: it is on screen at a rack with no
    // signal, long before any round trip.
    await waitFor(() => expect(result.current.workout?.sets).toHaveLength(1))
    expect(result.current.workout?.sets[0]).toMatchObject({
      exercise: "Squat",
      weight: 60,
      reps: 5,
      setNumber: 1,
    })
    await act(async () => {
      setWrite.resolve(ok({ ...workout, sets: [] }))
      await setWrite.promise
    })
  })

  /**
   * A FLUSH MUST NOT ERASE WHAT WAS TICKED WHILE IT RAN.
   *
   * The retry queue was snapshotted, sent over seconds of bad signal, and then
   * written back over storage — so a set ticked during the flush was wiped from
   * the queue. Its ✓ stayed green, the "not saved yet" count went to zero,
   * Finish unlocked, and the set never reached the server. On flaky gym wifi,
   * which is exactly when a flush runs, that is a lost set and a lift the
   * program then scores as short.
   */
  it("keeps a set queued while an earlier one is being flushed", async () => {
    // One set already waiting from a previous failure.
    window.localStorage.setItem(
      "live-workout-queue-v1",
      JSON.stringify([{ ...aSet, workoutId: "w1", at: 1 }])
    )
    const firstSend = deferred<Response>()
    let sends = 0
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (!String(url).endsWith("/sets")) return Promise.resolve(ok(null))
        sends += 1
        // The flush's send hangs; the second set's send fails while it hangs.
        return sends === 1 ? firstSend.promise : Promise.reject(new Error("offline"))
      })
    )

    const { result } = renderHook(() => useLiveWorkout(workout))
    await waitFor(() => expect(sends).toBe(1))

    // Tick set 2 mid-flush. Its write fails, so it joins the queue.
    await act(async () => {
      await result.current.tick({ ...aSet, setNumber: 2 })
    })

    await act(async () => {
      firstSend.resolve(ok({ ...workout, sets: [] }))
      await firstSend.promise
    })

    await waitFor(() => {
      const left = JSON.parse(window.localStorage.getItem("live-workout-queue-v1") ?? "[]")
      expect(left, "set 2 must still be waiting to be sent").toHaveLength(1)
      expect(left[0].setNumber).toBe(2)
    })
  })

  /**
   * UNDOING A SET THE SERVER HAS NEVER SEEN.
   *
   * An unconfirmed set carries the id `pending:<slot>`, which was sent to
   * `DELETE .../sets/pending:squat|working|1|`. Postgres cannot cast that to a
   * UUID, the route returned 400, and `if (res.ok)` swallowed it — so offline,
   * the ✓ simply would not come off, tap after tap, with no message. The queued
   * write then landed and saved the set they were trying to undo.
   */
  it("undoes an unsaved set without asking the server, and drops it from the queue", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(String(url))
        return Promise.reject(new Error("offline"))
      })
    )

    const { result } = renderHook(() => useLiveWorkout(workout))
    await act(async () => {
      await result.current.tick(aSet)
    })
    await waitFor(() => expect(result.current.unsaved).toBe(1))
    const pending = result.current.workout!.sets[0]!
    expect(pending.id.startsWith("pending:")).toBe(true)

    await act(async () => {
      await result.current.removeSet(pending.id)
    })

    expect(result.current.workout!.sets, "the row comes off the screen").toHaveLength(0)
    expect(result.current.unsaved, "and stops waiting to be sent").toBe(0)
    expect(
      calls.some((u) => u.includes("/sets/pending")),
      "no synthetic id is ever sent to the server"
    ).toBe(false)
  })

  /**
   * A SET THE SERVER PERMANENTLY REFUSES COMES OFF THE SCREEN.
   *
   * A 4xx is dropped from the queue because retrying it can never work — but the
   * optimistic row stayed green and un-flagged, so it still counted towards
   * "everything was done" and the finish sheet warned about nothing.
   */
  it("removes an optimistic set the server rejects outright, and says so", async () => {
    window.localStorage.setItem(
      "live-workout-queue-v1",
      JSON.stringify([{ ...aSet, workoutId: "w1", at: 1 }])
    )
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        String(url).endsWith("/sets")
          ? Promise.resolve({ ok: false, status: 400, json: async () => ({}) } as unknown as Response)
          : Promise.resolve(ok(null))
      )
    )

    const seeded = { ...workout, sets: [{ ...workout.sets[0] }] } as typeof workout
    seeded.sets = [
      {
        id: "pending:squat|working|1|",
        exerciseId: "squat",
        exercise: "Squat",
        weight: 60,
        weightKg: 60,
        reps: 5,
        setNumber: 1,
        kind: "working",
        prescribedIndex: null,
        completedAt: null,
        rpe: null,
        side: null,
      },
    ]

    const { result } = renderHook(() => useLiveWorkout(seeded))
    await waitFor(() => expect(result.current.unsaved).toBe(0))
    expect(result.current.workout!.sets).toHaveLength(0)
    expect(result.current.error).toMatch(/could not be saved/i)
  })

  /**
   * A SLOW ANSWER MUST NOT UNDO A FAST ONE.
   *
   * Every response replaced the whole workout unconditionally, so a delayed
   * reply carrying an older snapshot un-ticked a set that had already landed.
   * Nothing is lost on the server, but the finish sheet is computed from this
   * copy — so it then reported a completed lift as short.
   */
  it("ignores a response that is older than one already applied", async () => {
    const slow = deferred<Response>()
    const twoSets = {
      ...workout,
      sets: [
        { ...oneSet, id: "a", setNumber: 1 },
        { ...oneSet, id: "b", setNumber: 2 },
      ],
    }
    let n = 0
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (!String(url).endsWith("/sets")) return Promise.resolve(ok(null))
        n += 1
        // The FIRST send is the slow one, and it answers with the older state.
        return n === 1 ? slow.promise : Promise.resolve(ok(twoSets))
      })
    )

    const { result } = renderHook(() => useLiveWorkout(workout))
    act(() => {
      void result.current.tick(aSet)
    })
    await waitFor(() => expect(n).toBe(1))
    await act(async () => {
      await result.current.tick({ ...aSet, setNumber: 2 })
    })
    await waitFor(() => expect(result.current.workout!.sets).toHaveLength(2))

    // Now the stale reply arrives, carrying a workout with one set in it.
    await act(async () => {
      slow.resolve(ok({ ...workout, sets: [{ ...oneSet, id: "a", setNumber: 1 }] }))
      await slow.promise
    })

    expect(result.current.workout!.sets, "the newer state stands").toHaveLength(2)
  })
})

/**
 * THE KEY THAT MAKES A RETRIED START SAFE.
 *
 * It was minted inside each request body, so every tap of Start carried a
 * different one and the idempotency it exists for could never fire: tap Start,
 * lose the reply on the way back, tap again, and the second attempt was refused
 * as "a workout is already in progress" — for the workout you had just started,
 * with no way to reach it but a manual reload.
 */
describe("startKeyFor", () => {
  beforeEach(() => window.localStorage.clear())

  it("gives the same key back until the workout it started is over", () => {
    const first = startKeyFor("e1")
    expect(startKeyFor("e1")).toBe(first)
    clearStartKey("e1")
    expect(startKeyFor("e1")).not.toBe(first)
  })

  it("keeps a separate key per program, and one for a workout off any program", () => {
    const a = startKeyFor("e1")
    const b = startKeyFor("e2")
    const loose = startKeyFor(null)
    expect(new Set([a, b, loose]).size).toBe(3)
    // Clearing one leaves the others alone.
    clearStartKey("e1")
    expect(startKeyFor("e2")).toBe(b)
  })
})
