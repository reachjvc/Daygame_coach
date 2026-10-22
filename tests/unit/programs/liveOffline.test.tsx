// @vitest-environment jsdom
/**
 * OPENING THE WORKOUT WITH NO SIGNAL — Plans/program-builder.md, Phase 5 (Q21).
 *
 * The service worker keeps `/training/live`, so a phone that locks between
 * sets and reloads in a basement gets its workout back instead of an error
 * page. That stored page is the workout as it was when it was last LOADED, so
 * three things have to be true of what the screen does with it:
 *
 *   1. Sets ticked with no signal, still in the phone's queue, are put back.
 *   2. Sets ticked WITH signal after the page was stored — saved, so no longer
 *      queued — are not lost: the phone keeps the server's last answer and a
 *      page older than it gives way to it.
 *   3. Once the workout is finished or thrown away, neither the kept answer
 *      nor the stored page survives it: they would offer a workout that is
 *      over as if it were still open.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { newerCopyOf, useLiveWorkout, withQueuedSets, type QueuedSet } from "@/src/programs/hooks/useLiveWorkout"
import type { LiveWorkout, LiveWorkoutSet } from "@/src/programs/types"

const workout: LiveWorkout = {
  id: "w1",
  startedAt: "2026-10-22T18:00:00.000Z",
  enrollmentId: "e1",
  dayId: "mon",
  cycle: 1,
  week: 1,
  adjustments: {},
  notes: null,
  rpe: null,
  unit: "kg",
  sets: [],
}

const saved = (setNumber: number, weight: number): LiveWorkoutSet => ({
  id: `s${setNumber}`,
  exerciseId: "mon_bench",
  exercise: "Bench Press",
  weight,
  weightKg: weight,
  reps: 5,
  setNumber,
  kind: "working",
  prescribedIndex: null,
  completedAt: "2026-10-22T18:10:00.000Z",
  rpe: null,
  side: null,
})

const queued = (setNumber: number, weight: number, workoutId = "w1"): QueuedSet => ({
  workoutId,
  exerciseId: "mon_bench",
  exercise: "Bench Press",
  weight,
  reps: 5,
  setNumber,
  kind: "working",
  side: null,
  rpe: 8.5,
  slotId: "mon_bench",
  setGroupId: "top",
  at: Date.parse("2026-10-22T18:20:00.000Z"),
})

const ok = (body: unknown, date?: string) =>
  ({ ok: true, status: 200, headers: new Headers(date ? { date } : {}), json: async () => body }) as unknown as Response

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
afterEach(() => vi.unstubAllGlobals())

describe("withQueuedSets", () => {
  it("puts this workout's queued sets back on screen as pending, over a stored set in the same slot", () => {
    const out = withQueuedSets({ ...workout, sets: [saved(1, 100), saved(2, 80)] }, [queued(2, 82.5), queued(3, 82.5)])
    expect(out.sets.map((s) => [s.setNumber, s.weight, s.id.startsWith("pending:")])).toEqual([
      [1, 100, false],
      [2, 82.5, true],
      [3, 82.5, true],
    ])
    // The queued set keeps what it was ticked with: effort, slot, set group.
    expect(out.sets[2]).toMatchObject({ rpe: 8.5, slotId: "mon_bench", setGroupId: "top", completedAt: "2026-10-22T18:20:00.000Z" })
  })

  it("leaves another workout's queue alone", () => {
    const page = { ...workout, sets: [saved(1, 100)] }
    expect(withQueuedSets(page, [queued(2, 80, "w-other")])).toBe(page)
  })

  it("shows a queued set written by an older build with no time on it, rather than failing", () => {
    const old = { ...queued(1, 100), at: undefined } as unknown as QueuedSet
    expect(withQueuedSets(workout, [old]).sets).toHaveLength(1)
  })
})

describe("newerCopyOf", () => {
  const page = { ...workout, sets: [saved(1, 100)] }
  const kept = { workout: { ...workout, sets: [saved(1, 100), saved(2, 80)] }, at: 2_000 }

  it("takes the phone's copy when it arrived after the page was drawn", () => {
    expect(newerCopyOf(page, 1_000, kept)).toBe(kept.workout)
  })
  it("takes the page when it was drawn after the phone's copy arrived", () => {
    expect(newerCopyOf(page, 3_000, kept)).toBe(page)
  })
  it("never takes a copy of a different workout", () => {
    expect(newerCopyOf(page, 1_000, { ...kept, workout: { ...kept.workout, id: "w0" } })).toBe(page)
  })
  it("takes the page when it does not say when it was drawn, or nothing is kept", () => {
    expect(newerCopyOf(page, undefined, kept)).toBe(page)
    expect(newerCopyOf(page, 1_000, null)).toBe(page)
  })
})

describe("the live workout, reopened from the stored page", () => {
  it("a set saved after the page was stored is still on screen when it reopens with no signal", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))))
    // Upstairs, with signal: the page was drawn at 18:00, then the server
    // confirmed two sets at 18:15. The phone kept that answer.
    const renderedAt = Date.parse("2026-10-22T18:00:00.000Z")
    window.localStorage.setItem(
      "live-workout-copy-v1",
      JSON.stringify({ workout: { ...workout, sets: [saved(1, 100), saved(2, 80)] }, at: Date.parse("2026-10-22T18:15:00.000Z") })
    )
    // And one more ticked downstairs with no signal, still queued.
    window.localStorage.setItem("live-workout-queue-v1", JSON.stringify([queued(3, 80)]))

    // The stored page, as it was at 18:00: no sets at all.
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt }))
    await waitFor(() => expect(result.current.workout?.sets).toHaveLength(3))
    expect(result.current.workout?.sets.map((s) => s.setNumber)).toEqual([1, 2, 3])
  })

  it("a fresh page is believed over an older kept copy, and becomes the copy at its own time", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok(null))))
    window.localStorage.setItem("live-workout-copy-v1", JSON.stringify({ workout: { ...workout, sets: [saved(1, 100)] }, at: 1_000 }))
    const fresh = { ...workout, sets: [] }
    const { result } = renderHook(() => useLiveWorkout(fresh, { renderedAt: 5_000 }))
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("live-workout-copy-v1")!)).toEqual({ workout: fresh, at: 5_000 }))
    expect(result.current.workout?.sets).toEqual([])
  })

  it("keeps the server's answer to a tick as the copy, stamped with the server's clock", async () => {
    const answer = { ...workout, sets: [saved(1, 100)] }
    const sent = "Thu, 22 Oct 2026 18:15:00 GMT"
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(String(url).endsWith("/sets") ? ok(answer, sent) : ok(null))))
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt: Date.parse("2026-10-22T18:00:00Z") }))
    await act(async () => {
      await result.current.tick({ exerciseId: "mon_bench", exercise: "Bench Press", weight: 100, reps: 5, setNumber: 1, kind: "working", side: null })
    })
    const kept = JSON.parse(window.localStorage.getItem("live-workout-copy-v1")!)
    expect(kept.workout.sets).toHaveLength(1)
    // Not the phone's clock, which may be minutes out; the end of the
    // second the header names, so a tie with the page goes to the answer.
    expect(kept.at).toBe(Date.parse(sent) + 999)
  })

  it("an answer with no server time leaves the kept copy as it was", async () => {
    const before = { workout: { ...workout, sets: [saved(1, 100)] }, at: 1_000 }
    window.localStorage.setItem("live-workout-copy-v1", JSON.stringify(before))
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(ok(String(url).endsWith("/sets") ? { ...workout, sets: [saved(1, 100), saved(2, 80)] } : null))))
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt: 500 }))
    await act(async () => {
      await result.current.tick({ exerciseId: "mon_bench", exercise: "Bench Press", weight: 80, reps: 5, setNumber: 2, kind: "working", side: null })
    })
    expect(JSON.parse(window.localStorage.getItem("live-workout-copy-v1")!)).toEqual(before)
  })

  it("finishing forgets the kept copy and the stored page", async () => {
    const deleted: string[] = []
    vi.stubGlobal("caches", {
      keys: async () => ["app-shell-abc"],
      open: async () => ({ delete: async (path: string) => (deleted.push(path), true) }),
    })
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok({ workoutId: "w1", sets: 1 }))))
    window.localStorage.setItem("live-workout-copy-v1", JSON.stringify({ workout, at: Date.now() + 60_000 }))
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt: Date.now() }))
    await act(async () => {
      await result.current.finish({ intensity: 3 })
    })
    expect(result.current.workout).toBeNull()
    expect(window.localStorage.getItem("live-workout-copy-v1")).toBeNull()
    await waitFor(() => expect(deleted).toEqual(["/training/live"]))
  })

  it("throwing it away forgets them too", async () => {
    const deleted: string[] = []
    vi.stubGlobal("caches", {
      keys: async () => ["app-shell-abc"],
      open: async () => ({ delete: async (path: string) => (deleted.push(path), true) }),
    })
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok(null))))
    window.localStorage.setItem("live-workout-copy-v1", JSON.stringify({ workout, at: Date.now() }))
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt: Date.now() }))
    await act(async () => {
      await result.current.discard()
    })
    expect(window.localStorage.getItem("live-workout-copy-v1")).toBeNull()
    await waitFor(() => expect(deleted).toEqual(["/training/live"]))
  })
})

describe("signing out", () => {
  it("forgets the stored pages, the kept workout and its rest clock — and keeps sets not yet sent", async () => {
    const { forgetOfflineCopies } = await import("@/src/shared/offlineCopies")
    const dropped: string[] = []
    vi.stubGlobal("caches", {
      keys: async () => ["app-shell-abc", "someone-elses-store"],
      delete: async (name: string) => (dropped.push(name), true),
    })
    window.localStorage.setItem("live-workout-copy-v1", JSON.stringify({ workout, at: 1 }))
    window.localStorage.setItem("live-workout-rest-v1", JSON.stringify({ workoutId: "w1" }))
    window.localStorage.setItem("live-workout-queue-v1", JSON.stringify([queued(1, 100)]))

    await forgetOfflineCopies()

    expect(dropped).toEqual(["app-shell-abc"])
    expect(window.localStorage.getItem("live-workout-copy-v1")).toBeNull()
    expect(window.localStorage.getItem("live-workout-rest-v1")).toBeNull()
    // Sets somebody did and has not saved yet are theirs to lose, not ours.
    expect(JSON.parse(window.localStorage.getItem("live-workout-queue-v1")!)).toHaveLength(1)
  })
})

describe("another workout's waiting sets", () => {
  it("are not sent, not counted, do not hold Finish, and are still there afterwards", async () => {
    // Left by a workout thrown away elsewhere, or by the last person signed in here.
    const theirs = queued(1, 140, "w-someone-else")
    window.localStorage.setItem("live-workout-queue-v1", JSON.stringify([theirs]))
    const seen: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        seen.push(String(url))
        return Promise.resolve(ok({ workoutId: "w1", sets: 0 }))
      })
    )
    const { result } = renderHook(() => useLiveWorkout(workout, { renderedAt: Date.now() }))
    await waitFor(() => expect(result.current.workout).not.toBeNull())
    expect(result.current.unsaved).toBe(0)

    let summary: unknown
    await act(async () => {
      summary = await result.current.finish({ intensity: 3 })
    })
    expect(summary).toMatchObject({ workoutId: "w1" })
    expect(seen.some((u) => u.includes("w-someone-else"))).toBe(false)
    expect(JSON.parse(window.localStorage.getItem("live-workout-queue-v1")!)).toEqual([theirs])
  })
})
