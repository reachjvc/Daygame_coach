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

const QUEUE_KEY = "live-workout-queue-v1"

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
  /** Local time it was ticked, so the flush replays them in order. */
  at: number
}

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

export function useLiveWorkout(initial: LiveWorkout | null) {
  const [workout, setWorkout] = useState<LiveWorkout | null>(initial)
  const [queue, setQueue] = useState<QueuedSet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
   */
  const tick = useCallback(
    async (set: Omit<QueuedSet, "workoutId" | "at">) => {
      if (!workout) return
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
              weightKg: prev.unit === "lb" ? item.weight * 0.45359237 : item.weight,
              reps: item.reps,
              setNumber: item.setNumber,
              kind: item.kind,
              prescribedIndex: null,
              completedAt: new Date(item.at).toISOString(),
              rpe: null,
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
        if (!res.ok) throw new Error(String(res.status))
        applyServer(seq, (await res.json()) as LiveWorkout)
        setError(null)
      } catch {
        const next = [...readQueue().filter((q) => slotOf(q) !== slotOf(item)), item]
        writeQueue(next)
        setQueue(next)
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
          setError((body as { error?: string })?.error ?? "That workout could not be finished.")
          return null
        }
        clearStartKey(workout.enrollmentId)
        setWorkout(null)
        return body as WorkoutSummary
      } catch {
        setError("Could not reach the server. Nothing was finished.")
        return null
      } finally {
        setBusy(false)
      }
    },
    [workout]
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
    setWorkout(null)
  }, [workout])

  return {
    workout,
    /** Sets whose write FAILED and is waiting for signal. Shown to the person. */
    unsaved: queue.length,
    /** Sets whose write is on the wire right now. Finishing waits for these. */
    saving,
    error,
    busy,
    tick,
    removeSet,
    adjust,
    finish,
    discard,
    refresh,
    flush,
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
