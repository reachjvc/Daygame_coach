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
import {
  useLiveWorkout,
  startKeyFor,
  clearStartKey,
  startWorkoutRequest,
} from "@/src/programs/hooks/useLiveWorkout"
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

/**
 * ASKING THE SERVER TO OPEN A WORKOUT — one helper for every Start button.
 *
 * In plain terms, the bug this closes: the retry key is there so that tapping
 * Start twice (because the first reply was lost) opens ONE workout. Nothing
 * ever forgot the key afterwards, so it outlived the workout it opened — finish
 * yesterday's session on the laptop, and every later Start on the phone was
 * refused with the database's own complaint, for ever.
 */
/**
 * A SET THE SERVER REFUSES IS NOT A SET WAITING FOR SIGNAL.
 *
 * In plain terms: every non-OK reply used to be treated as "offline" and put in
 * the retry queue. A 400 — a weight the server will not accept, say — then sat
 * on screen with a green ✓ and "not saved yet, waiting for signal" for up to
 * twenty seconds, while the rest clock counted down a rest from a set that was
 * never saved. A refusal will never succeed on a retry, so it comes off now.
 */
describe("a set the server will not take", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("a set the server refuses comes off the screen at once and is never queued", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 400,
          json: async () => ({ error: "Weight has to be between 0 and 999.99." }),
        }) as unknown as Response
      )
    )
    const { result } = renderHook(() => useLiveWorkout(workout))
    const outcomes: string[] = []
    await act(async () => {
      outcomes.push(await result.current.tick(aSet))
    })
    expect(outcomes[0]).toBe("refused")
    expect(result.current.unsaved, "never queued").toBe(0)
    expect(result.current.workout!.sets, "off the screen").toHaveLength(0)
    expect(result.current.error).toContain("Squat")
    expect(result.current.error).toContain("Weight has to be between 0 and 999.99.")
  })

  it("a set that cannot reach the server is queued and the result says so", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline")
    }))
    const { result } = renderHook(() => useLiveWorkout(workout))
    const outcomes: string[] = []
    await act(async () => {
      outcomes.push(await result.current.tick(aSet))
    })
    expect(outcomes[0]).toBe("queued")
    expect(result.current.unsaved).toBe(1)
    // And it stays on screen — the person did the set.
    expect(result.current.workout!.sets).toHaveLength(1)
  })

  it("a set that saves says so", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ ...workout, sets: [oneSet] })))
    const { result } = renderHook(() => useLiveWorkout(workout))
    const outcomes: string[] = []
    await act(async () => {
      outcomes.push(await result.current.tick(aSet))
    })
    expect(outcomes[0]).toBe("saved")
    expect(result.current.unsaved).toBe(0)
  })

  it("a 5xx is queued, because the row may yet be written", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response)
    )
    const { result } = renderHook(() => useLiveWorkout(workout))
    const outcomes: string[] = []
    await act(async () => {
      outcomes.push(await result.current.tick(aSet))
    })
    expect(outcomes[0]).toBe("queued")
    expect(result.current.unsaved).toBe(1)
  })
})

/**
 * A FINISH WHOSE REPLY GETS LOST.
 *
 * In plain terms: you tap Save in a gym basement and the answer never comes
 * back. The workout was very probably saved. The app used to say "Could not
 * reach the server. Nothing was finished." — a guess, and the wrong one exactly
 * then: no summary, and every later Save answered with "not open any more".
 *
 * There is one question that settles it — is a workout still open? — and these
 * tests hold the app to asking it.
 */
describe("a finish the browser never heard back from", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  const summaryBody = {
    workoutId: "w1",
    durationMin: 42,
    sets: 5,
    volumeKg: 2500,
    volume: 2500,
    unit: "kg",
    personalRecords: [],
    firstTimeLifts: [],
    changes: [],
  }

  /** Answers /finish by rejecting, and everything else from `answers`. */
  function stubFetch(answers: Record<string, Response | "reject">) {
    const seen: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        seen.push(url)
        for (const [pattern, answer] of Object.entries(answers)) {
          if (url.includes(pattern)) {
            if (answer === "reject") throw new Error("offline")
            return answer
          }
        }
        throw new Error(`unstubbed ${url}`)
      })
    )
    return seen
  }

  it("a lost finish reply is checked against the server, and the summary is shown when it went through", async () => {
    startKeyFor("e1")
    const seen = stubFetch({
      "/finish": "reject",
      "/api/workouts/live": ok(null),
      "/summary": ok(summaryBody),
    })
    const { result } = renderHook(() => useLiveWorkout(workout))
    let summary: unknown
    await act(async () => {
      summary = await result.current.finish({ intensity: 4 })
    })
    expect(summary).toMatchObject({ workoutId: "w1", sets: 5 })
    expect(seen.some((u) => u.includes("/summary"))).toBe(true)
    expect(result.current.workout).toBeNull()
    // The key is forgotten, so the next Start is not refused as spent.
    expect(window.localStorage.getItem("live-workout-start-key-v1")).not.toContain("e1")
  })

  it("a lost finish reply that did not go through says so and keeps the workout open", async () => {
    stubFetch({
      "/finish": "reject",
      "/api/workouts/live": ok(workout),
    })
    const { result } = renderHook(() => useLiveWorkout(workout))
    let summary: unknown = "unset"
    await act(async () => {
      summary = await result.current.finish({ intensity: 4 })
    })
    expect(summary).toBeNull()
    expect(result.current.error).toBe(
      "The reply was lost, and the workout is still open. Tap Save again."
    )
    expect(result.current.workout).not.toBeNull()
  })

  it("a finish the server refuses shows the server's sentence and never says the reply was lost", async () => {
    stubFetch({
      "/finish": {
        ok: false,
        status: 409,
        json: async () => ({ error: "A workout cannot end before it started." }),
      } as unknown as Response,
    })
    const { result } = renderHook(() => useLiveWorkout(workout))
    await act(async () => {
      await result.current.finish({ intensity: 4 })
    })
    expect(result.current.error).toBe("A workout cannot end before it started.")
    expect(result.current.workout).not.toBeNull()
  })

  it("a workout thrown away elsewhere is reported as thrown away, not as saved", async () => {
    stubFetch({
      "/finish": "reject",
      "/api/workouts/live": ok(null),
      "/summary": { ok: false, status: 404, json: async () => ({ error: "gone" }) } as unknown as Response,
    })
    const { result } = renderHook(() => useLiveWorkout(workout))
    let summary: unknown = "unset"
    await act(async () => {
      summary = await result.current.finish({ intensity: 4 })
    })
    expect(summary).toBeNull()
    expect(result.current.error).toBe("This workout was thrown away on another device.")
  })

  it("says the check itself could not be made, rather than treating silence as a no", async () => {
    stubFetch({ "/finish": "reject", "/api/workouts/live": "reject" })
    const { result } = renderHook(() => useLiveWorkout(workout))
    await act(async () => {
      await result.current.finish({ intensity: 4 })
    })
    expect(result.current.error).toBe(
      "Could not reach the server to check whether it went through. Tap Save again when you have signal."
    )
    expect(result.current.workout).not.toBeNull()
  })

  it("withholds every total when the workout saved but its summary cannot be read", async () => {
    stubFetch({
      "/finish": "reject",
      "/api/workouts/live": ok(null),
      "/summary": { ok: false, status: 500, json: async () => ({}) } as unknown as Response,
    })
    const { result } = renderHook(() => useLiveWorkout(workout))
    const summaries: Array<{ unavailable?: boolean } | null> = []
    await act(async () => {
      summaries.push(await result.current.finish({ intensity: 4 }))
    })
    expect(summaries[0]?.unavailable).toBe(true)
  })
})

describe("startWorkoutRequest", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  const started = (body: unknown) =>
    ({ ok: true, status: 201, json: async () => body }) as unknown as Response
  const refused = (status: number, body: unknown) =>
    ({ ok: false, status, json: async () => body }) as unknown as Response

  it("forgets the start key the moment the server answers, so a workout finished elsewhere cannot block the next start", async () => {
    const before = startKeyFor("e1")
    vi.stubGlobal("fetch", vi.fn(async () => started(workout)))
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome).toMatchObject({ kind: "started", workout: { id: "w1" } })
    expect(startKeyFor("e1")).not.toBe(before)
  })

  it("a key the server says is spent is replaced and the start retried once", async () => {
    const first = startKeyFor("e1")
    const keys: string[] = []
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const key = (JSON.parse(init.body) as { clientKey: string }).clientKey
      keys.push(key)
      return keys.length === 1
        ? refused(409, { error: "That start was already used.", code: "start_key_spent" })
        : started(workout)
    })
    vi.stubGlobal("fetch", fetchMock)
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome.kind).toBe("started")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(keys[0]).toBe(first)
    expect(keys[1]).not.toBe(first)
  })

  it("stops after one retry when the server says spent twice, rather than looping", async () => {
    const fetchMock = vi.fn(async () =>
      refused(409, { error: "That start was already used.", code: "start_key_spent" })
    )
    vi.stubGlobal("fetch", fetchMock)
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome).toEqual({ kind: "refused", message: "That start was already used." })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the key when the reply is lost", async () => {
    const before = startKeyFor("e1")
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline")
    }))
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome.kind).toBe("unreachable")
    // The same key, so the next tap is handed the workout this one may well
    // have opened rather than opening a second one.
    expect(startKeyFor("e1")).toBe(before)
  })

  it("keeps the key on a server error, because the row may exist", async () => {
    const before = startKeyFor("e1")
    vi.stubGlobal("fetch", vi.fn(async () => refused(500, { error: "boom" })))
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome).toEqual({ kind: "refused", message: "Could not start that workout." })
    expect(startKeyFor("e1")).toBe(before)
  })

  it("goes to the open workout when the server says one is already running", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      refused(409, {
        error: "A workout is already open — opening it.",
        code: "already_open",
        workout: { ...workout, id: "w-open" },
      })
    ))
    const outcome = await startWorkoutRequest({ enrollmentId: "e1" })
    expect(outcome).toMatchObject({ kind: "already-open", workout: { id: "w-open" } })
  })

  it("repeats the server's own sentence for anything else it refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      refused(409, { error: "That day is not part of this program.", code: "unknown_day" })
    ))
    const outcome = await startWorkoutRequest({ enrollmentId: "e1", dayId: "nope" })
    expect(outcome).toEqual({
      kind: "refused",
      message: "That day is not part of this program.",
    })
  })

  it("sends the day it was given, and nothing at all for a workout off any program", async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body) as Record<string, unknown>)
      return started(workout)
    }))
    await startWorkoutRequest({ enrollmentId: "e1", dayId: "legs_a" })
    await startWorkoutRequest({})
    expect(bodies[0]).toMatchObject({ enrollmentId: "e1", dayId: "legs_a" })
    expect(bodies[1]).not.toHaveProperty("enrollmentId")
    expect(bodies[1]).not.toHaveProperty("dayId")
  })
})
