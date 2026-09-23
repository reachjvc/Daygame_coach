"use client"

/**
 * The workout you are in the middle of.
 *
 * TWO THINGS THIS OWNS, and they pull in opposite directions.
 *
 * The server is the truth: every set is a row the moment it is ticked, which is
 * the whole point — logging used to be a form held in the open tab until one
 * button at the end, so a dead phone lost the lot.
 *
 * But a gym is where signal dies. So a tick lands on screen immediately and the
 * write is QUEUED if it fails, in `localStorage`, keyed by the slot it belongs
 * to. The queue is flushed on mount and whenever the browser says it is back
 * online. Nothing is silently dropped and nothing is silently duplicated: the
 * slot is the identity, so replaying a queued tick corrects the same set rather
 * than adding a second one.
 *
 * Finishing is blocked while anything is queued OR STILL IN FLIGHT, and says
 * why. A summary computed from sets that never reached the server would be a
 * lie about what you did.
 *
 * That second half was missing and it cost a set. Only FAILED writes were
 * counted, so a set whose request was still on the wire counted as saved —
 * tick the last set, tap Finish, tap Save, and the finish overtook the set on
 * the network. The summary said nothing was lifted, and worse, the engine judged
 * the lift as missed and held the weight back. Tapping quickly is not a rare
 * case at the end of a workout; it is what everybody does.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { LiveWorkout, LiveWorkoutSet, WorkoutSummary } from "../types"
import { toKg } from "@/src/shared/weight"

const QUEUE_KEY = "live-workout-queue-v1"
const REST_KEY = "live-workout-rest-v1"

/** A set the browser has shown but the server has not confirmed. */
export interface QueuedSet {
  workoutId: string
  exerciseId: string | null
  exercise: string
  weight: number
  reps: number
  setNumber: number
  kind: LiveWorkoutSet["kind"]
  side: "left" | "right" | null
  /**
   * How hard it was, if it was said BEFORE the tick.
   *
   * On the queued set rather than patched afterwards, because a set ticked
   * with no signal is written when the signal comes back — and a second
   * request to add the effort would have nothing to attach it to until then.
   */
  rpe?: number | null
  /** Local time it was ticked, so the flush replays them in order. */
  at: number
}

/**
 * What happened to a ticked set.
 *
 * "queued" is the offline case and it is expected — a gym is where signal dies.
 * "refused" is the server saying no, which a retry will never fix, so it must
 * not be treated as offline: the ✓ comes off and the rest clock it started is
 * cleared.
 */
export type TickOutcome = "saved" | "queued" | "refused" | "no-workout"

const slotOf = (s: {
  exerciseId: string | null
  exercise: string
  kind: string
  setNumber: number
  side: string | null
}) => `${s.exerciseId ?? s.exercise}|${s.kind}|${s.setNumber}|${s.side ?? ""}`

function readQueue(): QueuedSet[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as QueuedSet[]) : []
  } catch {
    // A queue that cannot be read is a queue that is gone; it must not take the
    // screen with it.
    return []
  }
}

function writeQueue(items: QueuedSet[]): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch {
    // Private browsing, or storage full. The set is still on screen and still
    // going to the server; only the retry is lost.
  }
}

/**
 * THE REST CLOCK SURVIVES A RELOAD.
 *
 * It was three `useState`s on the screen, so anything that remounted the page
 * took the countdown with it — and the thing most likely to do that is a
 * phone locking itself between sets, which is precisely when the clock is the
 * only reason you are looking at it. You came back to no timer and no way to
 * tell how long you had been standing there.
 *
 * Stored beside the offline queue, and the SAME rules apply: a rest that
 * cannot be read is a rest that is gone and must not take the screen with it.
 */
export interface RestClock {
  /** Whose rest this is, so another workout's clock is never restored. */
  workoutId: string
  exerciseId: string
  /** Browser time, both of them: the server's clock never decides this. */
  from: number
  seconds: number
  ours: boolean
}

/** Five seconds of grace, so a clock that has just run out still shows zero. */
const REST_GRACE_MS = 5_000

function readRest(workoutId: string | null): RestClock | null {
  if (typeof window === "undefined" || !workoutId) return null
  try {
    const raw = window.localStorage.getItem(REST_KEY)
    if (!raw) return null
    const rest = JSON.parse(raw) as RestClock
    if (rest?.workoutId !== workoutId) return null
    // An expired clock is not restored: coming back an hour later to a rest
    // bar counting a rest you took before lunch is worse than no bar.
    if (rest.from + rest.seconds * 1000 + REST_GRACE_MS <= Date.now()) return null
    return rest
  } catch {
    return null
  }
}

function writeRest(rest: RestClock | null): void {
  try {
    if (rest) window.localStorage.setItem(REST_KEY, JSON.stringify(rest))
    else window.localStorage.removeItem(REST_KEY)
  } catch {
    // Private browsing, or storage full. The clock still runs on this screen;
    // only its survival across a reload is lost.
  }
}

export function useLiveWorkout(initial: LiveWorkout | null) {
  const [workout, setWorkout] = useState<LiveWorkout | null>(initial)
  const [queue, setQueue] = useState<QueuedSet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /**
   * The rest clock, restored from storage on the first render.
   *
   * Lazily, so a reload has its countdown on the first paint rather than
   * flashing an empty bar and filling it in.
   */
  const [rest, setRestState] = useState<RestClock | null>(() => readRest(initial?.id ?? null))
  const flushing = useRef(false)
  /**
   * Writes on the wire right now. The ref is the truth, because `finish` has to
   * read it without being re-created on every change; the state exists only so
   * the screen re-renders when it moves.
   */
  const inFlight = useRef(0)
  const [saving, setSaving] = useState(0)
  /**
   * A COUNTER SO A SLOW ANSWER CANNOT UNDO A FAST ONE.
   *
   * Every response replaced the whole workout unconditionally. Tick set 1, tick
   * set 2; if set 1's reply is delayed on weak signal it lands second, carrying
   * a snapshot taken before set 2 existed — and set 2's green ✓ vanishes off the
   * screen. Nothing is lost on the server, but the finish sheet is computed from
   * this copy, so it then says a finished lift was short.
   */
  const issued = useRef(0)
  const applied = useRef(0)
  const bumpInFlight = useCallback((delta: number) => {
    inFlight.current = Math.max(0, inFlight.current + delta)
    setSaving(inFlight.current)
  }, [])

  useEffect(() => {
    setQueue(readQueue())
  }, [])

  /** Apply a server copy only if nothing newer has already been applied. */
  const applyServer = useCallback((seq: number, next: LiveWorkout | null) => {
    if (seq < applied.current) return
    applied.current = seq
    setWorkout(next)
  }, [])

  const refresh = useCallback(async () => {
    const seq = ++issued.current
    try {
      const res = await fetch("/api/workouts/live")
      if (res.ok) applyServer(seq, (await res.json()) as LiveWorkout | null)
    } catch {
      // Offline. What is on screen stays on screen.
    }
  }, [applyServer])

  /**
   * Send everything waiting, oldest first. Stops at the first failure.
   *
   * IT REMOVES WHAT IT SENT — it does not write back what it started with.
   *
   * The old version took a snapshot of the queue, spent seconds on the network,
   * and then saved that snapshot over `localStorage`. Anything ticked during
   * those seconds was erased: the ✓ stayed green, the "not saved yet" count went
   * to zero, Finish unlocked, and the set never reached the server. On flaky gym
   * wifi — which is exactly when a flush is running — that is a lost set and a
   * lift the program then scores as short.
   */
  const flush = useCallback(async () => {
    if (flushing.current) return
    const pending = readQueue()
    if (pending.length === 0) return
    flushing.current = true
    /** Slots this pass got onto the server; only these are removed. */
    const sent = new Set<string>()
    try {
      const left = [...pending].sort((a, b) => a.at - b.at)
      while (left.length > 0) {
        const item = left[0]
        const res = await fetch(`/api/workouts/${item.workoutId}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })
        if (!res.ok) {
          // A 4xx will never succeed on a retry, so it is dropped and said out
          // loud rather than jamming the queue for ever.
          if (res.status >= 400 && res.status < 500) {
            left.shift()
            sent.add(slotOf(item))
            // AND TAKE IT OFF THE SCREEN. It used to stay green and ticked, so
            // a set that the server had permanently refused still counted
            // towards "everything was done" and the finish sheet said nothing.
            setWorkout((prev) =>
              prev ? { ...prev, sets: prev.sets.filter((x) => slotOf(x) !== slotOf(item)) } : prev
            )
            setError(`That ${item.exercise} set could not be saved and has been removed.`)
            continue
          }
          break
        }
        left.shift()
        sent.add(slotOf(item))
        applyServer(++issued.current, (await res.json()) as LiveWorkout)
      }
      // Re-read: a tick that failed while this was running has since added
      // itself, and it must survive.
      const remaining = readQueue().filter((q) => !sent.has(slotOf(q)))
      writeQueue(remaining)
      setQueue(remaining)
    } finally {
      flushing.current = false
    }
  }, [applyServer])

  useEffect(() => {
    void flush()
    if (typeof window === "undefined") return
    /**
     * ON A TIMER TOO, not only on an `online` event.
     *
     * A captive-portal gym wifi or a one-off 500 never takes the browser
     * offline, so `online` never fires and the queue sat there for the rest of
     * the session — with Finish permanently disabled and a full page reload the
     * only way out, which nobody would think to try.
     */
    const onOnline = () => void flush()
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush()
    }
    const timer = setInterval(() => void flush(), 20_000)
    window.addEventListener("online", onOnline)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener("online", onOnline)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [flush])

  /**
   * Tick a set off.
   *
   * It appears immediately, because the person is standing at a rack. The write
   * follows; if it fails, the set is queued under its slot so replaying it
   * corrects the same set rather than adding a second one.
   *
   * IT SAYS WHAT HAPPENED, because the screen has a rest clock to clear.
   * Every non-OK reply used to be thrown and queued as though the phone were
   * offline — so a set the server had REFUSED sat there ticked and "waiting for
   * signal" for up to twenty seconds until the queue gave up on it, with the
   * rest clock already running for a set that was never saved.
   */
  const tick = useCallback(
    async (set: Omit<QueuedSet, "workoutId" | "at">): Promise<TickOutcome> => {
      if (!workout) return "no-workout"
      const item: QueuedSet = { ...set, workoutId: workout.id, at: Date.now() }

      // On screen first.
      setWorkout((prev) => {
        if (!prev) return prev
        const key = slotOf(item)
        const rest = prev.sets.filter((s) => slotOf(s) !== key)
        return {
          ...prev,
          sets: [
            ...rest,
            {
              id: `pending:${key}`,
              exerciseId: item.exerciseId,
              exercise: item.exercise,
              // Both, from the one number typed: `weight` is what the row shows
              // and re-sends, `weightKg` is what totals use. Optimistically they
              // are the same until the server answers in kilograms.
              weight: item.weight,
              weightKg: toKg(item.weight, prev.unit),
              reps: item.reps,
              setNumber: item.setNumber,
              kind: item.kind,
              prescribedIndex: null,
              completedAt: new Date(item.at).toISOString(),
              rpe: item.rpe ?? null,
              side: item.side,
            },
          ].sort((a, b) => a.setNumber - b.setNumber),
        }
      })

      bumpInFlight(1)
      const seq = ++issued.current
      try {
        const res = await fetch(`/api/workouts/${workout.id}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })
        if (res.status >= 400 && res.status < 500) {
          /**
           * A REFUSAL WILL NEVER SUCCEED ON A RETRY, so it is not queued. The
           * optimistic ✓ comes off NOW and the reason is named, rather than the
           * set sitting green and "waiting for signal" until the queue drops it.
           */
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          setWorkout((prev) =>
            prev ? { ...prev, sets: prev.sets.filter((x) => slotOf(x) !== slotOf(item)) } : prev
          )
          setError(
            `That ${item.exercise} set could not be saved: ${body?.error ?? "the server refused it"}`
          )
          return "refused"
        }
        if (!res.ok) throw new Error(String(res.status))
        applyServer(seq, (await res.json()) as LiveWorkout)
        setError(null)
        return "saved"
      } catch {
        const next = [...readQueue().filter((q) => slotOf(q) !== slotOf(item)), item]
        writeQueue(next)
        setQueue(next)
        return "queued"
      } finally {
        bumpInFlight(-1)
      }
    },
    [workout, bumpInFlight, applyServer]
  )

  const removeSet = useCallback(
    async (setId: string) => {
      if (!workout) return
      /**
       * A SET THE SERVER HAS NEVER SEEN IS UNDONE LOCALLY.
       *
       * An unconfirmed set carries the id `pending:<slot>`, and sending that to
       * `DELETE .../sets/pending:squat|working|1|` asked Postgres to cast it to
       * a UUID. The route 400'd, `if (res.ok)` swallowed it, and the ✓ simply
       * would not come off — tap after tap, offline, with no message. Worse, the
       * queued write then landed and saved the set they were trying to undo.
       */
      if (setId.startsWith("pending:")) {
        const slot = setId.slice("pending:".length)
        setWorkout((prev) =>
          prev ? { ...prev, sets: prev.sets.filter((s) => s.id !== setId) } : prev
        )
        const left = readQueue().filter((q) => slotOf(q) !== slot)
        writeQueue(left)
        setQueue(left)
        return
      }
      const seq = ++issued.current
      try {
        const res = await fetch(`/api/workouts/${workout.id}/sets/${setId}`, { method: "DELETE" })
        if (res.ok) applyServer(seq, (await res.json()) as LiveWorkout)
        else setError("That set could not be removed.")
      } catch {
        setError("Could not reach the server, so that set is still saved.")
      }
    },
    [workout, applyServer]
  )

  /**
   * CORRECT A SET THAT IS ALREADY WRITTEN — its kind, or what it cost.
   *
   * One request for both, because they are one PATCH on one row. Not queued
   * offline: unlike a tick, nothing is lost by failing loudly here — the set
   * itself is safe, and only the correction has to be made again.
   */
  const patchSet = useCallback(
    async (setId: string, patch: { kind?: LiveWorkoutSet["kind"]; rpe?: number }) => {
      if (!workout) return
      /**
       * An unconfirmed set has no row to patch. Its id is `pending:<slot>` and
       * sending that asks Postgres to cast it to a UUID — which is how undoing
       * an unsaved set used to 400 silently. The row's local choice is the one
       * that travels with the tick; this is only for sets the server has.
       */
      if (setId.startsWith("pending:")) {
        setError("That set has not reached the server yet — it will carry your change when it does.")
        return
      }
      const seq = ++issued.current
      try {
        const res = await fetch(`/api/workouts/${workout.id}/sets/${setId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (res.ok) {
          applyServer(seq, (await res.json()) as LiveWorkout)
          setError(null)
          return
        }
        // The server's own sentence: it names the set that is in the way.
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "That set could not be changed.")
      } catch {
        setError("Could not reach the server, so that set is unchanged.")
      }
    },
    [workout, applyServer]
  )

  const retagSet = useCallback(
    (setId: string, kind: LiveWorkoutSet["kind"]) => patchSet(setId, { kind }),
    [patchSet]
  )
  const rateSet = useCallback(
    (setId: string, rpe: number) => patchSet(setId, { rpe }),
    [patchSet]
  )

  const adjust = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!workout) return
      const seq = ++issued.current
      // try/catch, because offline this rejected into an unhandled promise and
      // a failed "Skip this one" looked exactly like a successful one.
      try {
        const res = await fetch(`/api/workouts/${workout.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (res.ok) applyServer(seq, (await res.json()) as LiveWorkout)
        else setError("That change could not be saved.")
      } catch {
        setError("Could not reach the server, so that change was not saved.")
      }
    },
    [workout, applyServer]
  )

  /**
   * Did that finish actually land? Asked of the server, never assumed.
   *
   * Three answers. The same workout is still open → it did not go through, say
   * so and keep the sheet. Nothing is open (or something else is) → it DID go
   * through, so forget the start key, clear the screen, and fetch the summary
   * the person earned. And if the check itself cannot be made, say that — an
   * unanswered question is not a "no".
   */
  const checkWhetherItLanded = useCallback(
    async (finished: LiveWorkout): Promise<WorkoutSummary | null> => {
      let stillOpen: LiveWorkout | null
      try {
        const res = await fetch("/api/workouts/live")
        if (!res.ok) throw new Error(String(res.status))
        stillOpen = (await res.json()) as LiveWorkout | null
      } catch {
        setError(
          "Could not reach the server to check whether it went through. Tap Save again when you have signal."
        )
        return null
      }

      if (stillOpen?.id === finished.id) {
        setError("The reply was lost, and the workout is still open. Tap Save again.")
        return null
      }

      clearStartKey(finished.enrollmentId)
      setWorkout(null)
      try {
        const res = await fetch(`/api/workouts/${finished.id}/summary`)
        if (res.ok) return (await res.json()) as WorkoutSummary
        if (res.status === 404) {
          // The row is gone. Not "saved with no totals" — deleted somewhere
          // else, and there is nothing to show for it.
          setError("This workout was thrown away on another device.")
          return null
        }
        throw new Error(String(res.status))
      } catch {
        /**
         * Saved, and that is all that is known. Every number is withheld rather
         * than shown as 0 — "0 sets, 0 kg lifted" after an hour of training is
         * a claim the app has no grounds for.
         */
        return {
          workoutId: finished.id,
          unit: finished.unit,
          unavailable: true,
          personalRecords: [],
          firstTimeLifts: [],
          changes: [],
          durationMin: 0,
          sets: 0,
          volumeKg: 0,
          volume: 0,
        }
      }
    },
    []
  )

  const finish = useCallback(
    async (input: { intensity: number; endedAt?: string; durationMin?: number; notes?: string | null; rpe?: number | null }): Promise<WorkoutSummary | null> => {
      if (!workout) return null
      /**
       * THE LAST SET HAS TO LAND FIRST. The button is disabled while anything
       * is outstanding, but the rule belongs here rather than in whichever
       * screen happens to call this: finishing early does not just misreport
       * the workout, it feeds the progression engine a lift it never saw.
       */
      if (inFlight.current > 0 || readQueue().length > 0) {
        setError("Hold on — the last set is still saving.")
        return null
      }
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(`/api/workouts/${workout.id}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          /**
           * THE SERVER SAID NO, AND SAID WHY. This is a REFUSAL, not a lost
           * reply — "A workout cannot end before it started", "Your program
           * moved on". It used to be answered with a guess about the
           * connection; the server's own sentence is the only honest thing to
           * show, and the sheet stays open so it can be acted on.
           */
          setError((body as { error?: string })?.error ?? "That workout could not be finished.")
          return null
        }
        clearStartKey(workout.enrollmentId)
        // The clock goes with the workout, as it does on discard: a rest bar
        // counting down over the receipt is a control with nothing behind it.
        writeRest(null)
        setRestState(null)
        setWorkout(null)
        return body as WorkoutSummary
      } catch {
        /**
         * NOBODY KNOWS WHETHER IT WENT THROUGH — so ASK, do not guess.
         *
         * A reply lost on the way back looks exactly like a request that never
         * arrived, and this used to say "Nothing was finished." That is wrong
         * precisely when it matters: the workout was saved, the person was told
         * it was not, the summary was never shown, and the next Save was
         * refused with "not open any more — reload".
         *
         * The one question that settles it is whether a workout is still open.
         */
        return await checkWhetherItLanded(workout)
      } finally {
        setBusy(false)
      }
    },
    [workout, checkWhetherItLanded]
  )

  const discard = useCallback(async () => {
    if (!workout) return
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, { method: "DELETE" })
      if (!res.ok) {
        setError("That workout could not be thrown away. It is still here.")
        return
      }
    } catch {
      setError("Could not reach the server, so nothing was thrown away.")
      return
    }
    clearStartKey(workout.enrollmentId)
    writeQueue([])
    setQueue([])
    // The clock goes with the workout. A rest bar counting down over the
    // receipt of a workout you have just finished is a control with nothing
    // behind it.
    writeRest(null)
    setRestState(null)
    setWorkout(null)
  }, [workout])

  /** Begin resting after a set. Replaces any clock already running. */
  const startRest = useCallback(
    (exerciseId: string, seconds: number, ours: boolean) => {
      if (!workout) return
      const next: RestClock = { workoutId: workout.id, exerciseId, from: Date.now(), seconds, ours }
      setRestState(next)
      writeRest(next)
    },
    [workout]
  )

  /**
   * Lengthen or shorten the clock that is RUNNING, not the saved target.
   *
   * Two different questions: "I need another thirty seconds today" and "this
   * lift wants three minutes from now on". Conflating them meant one long set
   * quietly rewrote the program.
   */
  const extendRest = useCallback((deltaSeconds: number) => {
    setRestState((current) => {
      if (!current) return current
      const next = { ...current, seconds: Math.max(0, current.seconds + deltaSeconds) }
      writeRest(next)
      return next
    })
  }, [])

  const dismissRest = useCallback(() => {
    setRestState(null)
    writeRest(null)
  }, [])

  /**
   * Stop the clock, but only if it is still the one that started at `from`.
   *
   * A refused set has nothing to rest from — but clearing unconditionally
   * took the wrong clock: tick set 1, tick set 2, and set 1's refusal arrives
   * second, wiping the rest set 2 had just started. The instant is the
   * clock's identity.
   *
   * The comparison happens INSIDE the setter because the caller is a promise
   * callback holding a render's worth of stale state — reading `rest` out
   * there compares against whatever was true before the clock started.
   */
  const dismissRestStartedAt = useCallback((from: number) => {
    setRestState((current) => {
      if (!current || current.from !== from) return current
      writeRest(null)
      return null
    })
  }, [])

  return {
    workout,
    rest,
    startRest,
    extendRest,
    dismissRest,
    dismissRestStartedAt,
    /** Sets whose write FAILED and is waiting for signal. Shown to the person. */
    unsaved: queue.length,
    /**
     * WHICH slots those are, not just how many.
     *
     * The count is the footer's; a row needs to know whether IT is the one
     * waiting. Without this the screen guessed from the optimistic id — which
     * is set the instant the ✓ is tapped, so every tick flashed "not saved"
     * for one frame on a perfectly good connection.
     */
    queuedSlots: queue.map(slotOf),
    /** Sets whose write is on the wire right now. Finishing waits for these. */
    saving,
    error,
    busy,
    tick,
    removeSet,
    retagSet,
    rateSet,
    adjust,
    finish,
    discard,
    refresh,
    flush,
  }
}

/**
 * What happened when a start was asked for.
 *
 * FOUR ANSWERS, because the three buttons that start a workout each invented
 * their own and disagreed. "started" and "already-open" both mean "you are in a
 * workout, go to it" — the second is what a race, or a second tap, comes back
 * as. "refused" is the server saying no, and its own sentence is carried.
 * "unreachable" is the one case where nobody knows whether it went through, and
 * the sentence has to say so rather than guess.
 */
export type StartOutcome =
  | { kind: "started"; workout: LiveWorkout }
  | { kind: "already-open"; workout: LiveWorkout }
  | { kind: "refused"; message: string }
  | { kind: "unreachable"; message: string }

/**
 * Ask the server to open a workout. THE ONLY PLACE THAT POSTS `/api/workouts`.
 *
 * Three buttons did this themselves — the Tracking card, the Training page's
 * today card and "start a workout now" — and all three got it slightly wrong in
 * different ways. None of them forgot the start key after a success, so the key
 * outlived the workout it opened: finish on the laptop and every later Start on
 * the phone was refused, for ever, with the database's own complaint. And they
 * disagreed on what to say when it failed; one said "nothing was started",
 * which is a guess, and the wrong one exactly when the signal drops.
 *
 * THE KEY IS FORGOTTEN THE MOMENT THE SERVER ANSWERS AT ALL. It exists to make
 * a retry after a LOST REPLY land on the same workout, so it is needed between
 * "sent" and "heard anything back", and not one moment longer. It is kept only
 * where the row might exist but we did not hear: a network failure, or a 5xx
 * after the insert.
 */
export async function startWorkoutRequest(input: {
  enrollmentId?: string | null
  dayId?: string | null
  /**
   * When the session actually happened, as an instant.
   *
   * Omitted for every workout started in the gym — the server uses now. Sent
   * only by "Log a past workout", which is why it goes through THIS helper
   * rather than posting itself: the retry rule above (keep the key on a lost
   * reply, forget it on any answer) is what makes a second tap land on the
   * same workout instead of opening a second one.
   */
  startedAt?: string | null
}): Promise<StartOutcome> {
  const bucket = input.enrollmentId ?? null

  const attempt = async (key: string) =>
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(input.enrollmentId ? { enrollmentId: input.enrollmentId } : {}),
        ...(input.dayId ? { dayId: input.dayId } : {}),
        ...(input.startedAt ? { startedAt: input.startedAt } : {}),
        clientKey: key,
      }),
    })

  try {
    let res = await attempt(startKeyFor(bucket))
    let body = (await res.json().catch(() => null)) as
      | { error?: string; code?: string; workout?: LiveWorkout }
      | null

    /**
     * A SPENT KEY IS RECOVERABLE, ONCE. The workout this key opened is over —
     * finished on another device, most likely. Forget it, mint a new one and
     * ask again. Exactly once: a second "spent" is a real refusal, never a loop.
     */
    if (res.status === 409 && body?.code === "start_key_spent") {
      clearStartKey(bucket)
      res = await attempt(startKeyFor(bucket))
      body = (await res.json().catch(() => null)) as typeof body
    }

    if (res.ok) {
      clearStartKey(bucket)
      return { kind: "started", workout: body as unknown as LiveWorkout }
    }
    if (res.status === 409 && body?.code === "already_open") {
      clearStartKey(bucket)
      /**
       * THE SENTENCE AND THE BEHAVIOUR HAVE TO AGREE.
       *
       * The server always sends the open workout with this code, and the caller
       * goes straight to it. If it ever does not, the person was shown the
       * server's own "a workout is already open — opening it" as an ERROR while
       * nothing opened: a sentence promising something the code was not doing.
       * Without the workout there is nothing to open, so it says the true thing
       * instead and names where to go.
       */
      if (!body.workout) {
        return {
          kind: "refused",
          message: "You already have a workout open. Open training to go back to it.",
        }
      }
      return { kind: "already-open", workout: body.workout }
    }
    if (res.status >= 400 && res.status < 500) {
      clearStartKey(bucket)
      return { kind: "refused", message: body?.error ?? "Could not start that workout." }
    }
    // 5xx: the row may well exist — the insert can succeed and a later read
    // fail. Keeping the key means the next tap is handed that same workout.
    return { kind: "refused", message: "Could not start that workout." }
  } catch {
    return {
      kind: "unreachable",
      message:
        "Could not reach the server. Tap Start again — if it did go through, this opens that same workout.",
    }
  }
}

const START_KEY = "live-workout-start-key-v1"

/**
 * The browser's id for the workout it is trying to start.
 *
 * IT HAS TO SURVIVE THE RETRY, which is the entire point. This was minted fresh
 * inside each request body, so every tap of Start carried a different key and
 * the idempotency it was built for could never fire: the `client_key` column,
 * its unique index and every comment about retries were inert. Tap Start, lose
 * the reply on the way back, tap again — and the second attempt was refused as
 * "a workout is already in progress" for the workout you had just started.
 *
 * Keyed per enrollment so starting a different program is a different workout.
 */
export function startKeyFor(enrollmentId: string | null): string {
  const bucket = enrollmentId ?? "loose"
  try {
    const raw = window.localStorage.getItem(START_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    if (typeof map[bucket] === "string") return map[bucket]
    const key = newClientKey()
    window.localStorage.setItem(START_KEY, JSON.stringify({ ...map, [bucket]: key }))
    return key
  } catch {
    // Private browsing. A retry then opens the "already in progress" path
    // instead, which is recoverable; a thrown error here would not be.
    return newClientKey()
  }
}

/** Forget the key once the workout it started is over. */
export function clearStartKey(enrollmentId: string | null): void {
  try {
    const raw = window.localStorage.getItem(START_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, string>
    delete map[enrollmentId ?? "loose"]
    window.localStorage.setItem(START_KEY, JSON.stringify(map))
  } catch {
    // Nothing to clean up that matters.
  }
}

/** A browser-side id for a workout, so a retried start is not a second one. */
export function newClientKey(): string {
  return `w-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
