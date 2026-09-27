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

/**
 * IS THIS 4xx REALLY PERMANENT? Not all of them are, and the cost of guessing
 * wrong is a set the person did and the app deleted.
 *
 * The rule here was "any 4xx will never succeed on a retry", which was written
 * about the refusals `workoutRepo` raises — a set the schema will not take, a
 * workout that is gone. It is false for the statuses that mean "not now":
 *
 *   401  the access token expired mid-session. `requireAuth` answers 401 and
 *        `proxy.ts`'s matcher does not cover `/api/workouts/*`, so a live
 *        screen open for a whole gym session refreshes only through the route
 *        handlers themselves. One failed refresh used to delete every queued
 *        set, each with "has been removed".
 *   408  the request timed out on the way. Nothing was decided.
 *   425  too early — the server is asking for the retry itself.
 *   429  rate limited. This is a retry instruction with a number on it.
 *
 * `errors.ts` calls deleting a set the person did "the worst outcome in this
 * whole file", and the one already fixed (`CouldNotTell` → 503) was the same
 * mistake in the 5xx direction. Anything not listed here stays permanent:
 * 403 on these routes means the row is not yours, and 400 means the schema
 * refused it, and both are true however many times you ask.
 */
const RETRYABLE_REFUSALS = new Set([401, 408, 425, 429])

/** A 4xx the caller must not treat as "this can never be saved". */
const permanentlyRefused = (status: number): boolean =>
  status >= 400 && status < 500 && !RETRYABLE_REFUSALS.has(status)

/**
 * AND IT HAS TO SAY SOMETHING, or the fix trades one silent failure for
 * another.
 *
 * Keeping the set was right; keeping it with no message was not. A dead
 * session answers 401 to every retry, so the footer read "waiting for signal"
 * for the rest of the workout, Finish stayed disabled on `unsaved > 0`, and
 * nothing anywhere said "you are signed out". Before the retryable statuses
 * were exempted the sets were destroyed and the workout could at least be
 * finished; after, it could not be finished at all. A reviewer caught the
 * trade within the hour.
 *
 * `null` for the rest — a genuinely offline tick has no status at all and the
 * "not saved yet" footer is the right and only thing to say there.
 */
function retryableRefusalMessage(status: number): string | null {
  if (status === 401) {
    return "You have been signed out. Your sets are kept — reload, sign in, and they will be sent."
  }
  if (status === 429) return "The server is busy. Your sets are kept and will be sent shortly."
  if (status === 408 || status === 425) {
    return "That did not get through in time. Your sets are kept and will be sent again."
  }
  return null
}

export function useLiveWorkout(initial: LiveWorkout | null) {
  const [workout, setWorkout] = useState<LiveWorkout | null>(initial)
  const [queue, setQueue] = useState<QueuedSet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /**
   * The rest clock, restored from storage AFTER MOUNT — never during render.
   *
   * It used to be a lazy `useState(() => readRest(...))`, "so a reload has its
   * countdown on the first paint". That is not a thing a server render can do:
   * `localStorage` does not exist there, so the server printed no rest bar and
   * the browser's first render printed one, and React threw the whole live
   * screen away and rebuilt it. Caught by opening the page on 2026-09-26 —
   * tick a set, reload while the clock is running — with the component stack
   * naming `RestBar` and a `+` beside the element only the client had.
   *
   * It is the reload this feature exists for, too: the clock is stored because
   * a phone locks itself mid-rest and Safari reloads the tab when you come
   * back. So the one path that most wanted the clock was the one that broke the
   * screen.
   *
   * The cost of the effect is that the bar appears a frame after hydration
   * instead of in the server's HTML. The countdown is unaffected — it is
   * measured from a stored instant, not counted up from mount.
   */
  const [rest, setRestState] = useState<RestClock | null>(null)
  useEffect(() => {
    setRestState(readRest(initial?.id ?? null))
  }, [initial?.id])
  const flushing = useRef(false)
  /**
   * Writes on the wire right now. The ref is the truth, because `finish` has to
   * read it without being re-created on every change; the state exists only so
   * the screen re-renders when it moves.
   */
  const inFlight = useRef(0)
  const [saving, setSaving] = useState(0)
  /**
   * The workout stopped existing while this screen was showing it.
   *
   * Two devices and one account is ordinary — discard it on the laptop, and the
   * phone in your hand is holding a workout that is not there. The phone used
   * to find out one set at a time, printing the database's own complaint
   * against each tick, and if it ever did clear the screen it said "This
   * workout is finished", which is a different thing and not true.
   *
   * Separate from `workout === null` because null is also what a NORMAL finish
   * leaves behind, and those two states owe the person different sentences.
   */
  const [vanished, setVanished] = useState(false)
  /**
   * WHY THIS SCREEN HAS NO WORKOUT ANY MORE, in words.
   *
   * There are three ways to get here and they are not the same news:
   *
   *   finished    "This workout is finished."
   *   discarded   nothing was recorded, and that was the point
   *   gone        it went away somewhere else — the server's own sentence
   *
   * `null` means the first. The screen used to infer all three from
   * `workout === null` and say "finished" for every one, so tapping Throw away
   * — and confirming a dialog that correctly said "2 sets will be thrown away.
   * This cannot be undone." — answered "This workout is finished." The file's
   * own comment calls that "the one thing this screen must never get
   * backwards", and the two-device case was fixed twice while the ordinary
   * local one went on saying it.
   */
  const [endedMessage, setEndedMessage] = useState<string | null>(null)
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

  /**
   * THE SERVER SAYS THIS WORKOUT NO LONGER EXISTS. Take it off the screen once,
   * rather than letting every later tick discover it again.
   *
   * The queue goes with it, and only the part of the queue that belonged to
   * this workout: a set whose workout is gone has nowhere to land, so leaving
   * it waiting for signal would keep Finish disabled for ever on a workout that
   * cannot be finished. The rest clock goes too — a countdown over a workout
   * that does not exist is a control with nothing behind it.
   */
  const workoutVanished = useCallback((workoutId: string, message: string) => {
    /**
     * AND SAY HOW MANY WENT WITH IT. Three sets ticked offline, the workout
     * finished on the other device, and the queue is emptied with one singular
     * sentence — "so that change was not saved" — naming neither the count nor
     * the lifts. They cannot be saved, which is exactly why the person needs to
     * know what they were.
     */
    const stranded = readQueue().filter((q) => q.workoutId === workoutId)
    const lost =
      stranded.length > 0
        ? ` ${stranded.length} ${stranded.length === 1 ? "set that had not" : "sets that had not"} reached the server ${stranded.length === 1 ? "was" : "were"} lost: ${[...new Set(stranded.map((q) => q.exercise))].join(", ")}.`
        : ""
    setEndedMessage(`${message}${lost}`)
    /**
     * FENCED, like every other state change here.
     *
     * `applyServer` only rejects an answer older than the last one APPLIED, and
     * this cleared the workout without moving that mark — so a reply already on
     * the wire when the workout went away would land afterwards and put it back
     * on screen, with `vanished` still true. The one state change that opted
     * out of the counter the rest of this file is built around.
     */
    applied.current = ++issued.current
    setVanished(true)
    setError(`${message}${lost}`)
    setWorkout(null)
    const left = readQueue().filter((q) => q.workoutId !== workoutId)
    writeQueue(left)
    setQueue(left)
    writeRest(null)
    setRestState(null)
  }, [])

  /**
   * Is this refusal "the workout is gone"? The routes send `code`, because
   * matching on the sentence would break the moment the sentence is reworded.
   */
  const goneFrom = (body: { code?: string } | null): boolean => body?.code === "workout_gone"

  useEffect(() => {
    setQueue(readQueue())
  }, [])

  /**
   * The workout as it stands, readable from a callback without re-creating it.
   *
   * `refresh` has to know whether a screen was showing a workout when the
   * server said there is none, and it cannot close over `workout` without
   * being rebuilt on every set — which would restart the interval that calls
   * it.
   */
  const workoutRef = useRef<LiveWorkout | null>(initial)
  useEffect(() => {
    workoutRef.current = workout
  }, [workout])

  /**
   * Apply a server copy only if nothing newer has been ISSUED.
   *
   * This compared against `applied.current` — "nothing newer has already been
   * APPLIED" — which lets a reply that is already stale overwrite an
   * optimistic write made after it was sent. Three endurance ticks at 700ms
   * apart, an ordinary pace against a ~900ms round trip:
   *
   *   click 0  -> seq 1, optimistic [0]
   *   click 1  -> seq 2, optimistic [0,1]
   *   reply 1  -> [0] applied over it, and the second tick disappears
   *   click 2  -> reads [0], writes [0,2]
   *   server   -> [0,2]; the finish sheet says "2 of 3 blocks"
   *
   * Reproduced twice, identically, with no error anywhere — on the only
   * control that records how much of a run happened. Round 10 added the
   * optimistic write and closed the "three taps read the same list" shape;
   * this is the other half, and the fence is where it lives.
   *
   * `issued` is bumped by every request, so a reply is stale the moment
   * anything else has gone out — which is exactly when its copy of the
   * workout is older than what the screen already shows. It subsumes the old
   * check, because `applied` can never exceed `issued`.
   */
  const applyServer = useCallback((seq: number, next: LiveWorkout | null) => {
    if (seq < issued.current) return
    applied.current = seq
    setWorkout(next)
  }, [])

  const refresh = useCallback(async () => {
    const seq = ++issued.current
    try {
      const res = await fetch("/api/workouts/live")
      if (!res.ok) return
      const next = (await res.json()) as LiveWorkout | null
      /**
       * NOTHING OPEN, WHILE THIS SCREEN IS SHOWING SOMETHING. The server has
       * just said the workout is not there — finished or thrown away
       * elsewhere — and clearing it without saying so leaves the screen on
       * "This workout is finished", which is the one thing it must not claim
       * wrongly.
       *
       * Nothing calls `refresh` today; it is exported and the live screen does
       * not use it. That is exactly why this is here rather than in a comment:
       * the first caller would otherwise reintroduce the lie, and nothing would
       * say so.
       */
      if (next === null && workoutRef.current !== null) {
        workoutVanished(workoutRef.current.id, "This workout is no longer open.")
        return
      }
      applyServer(seq, next)
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
          if (permanentlyRefused(res.status)) {
            /**
             * A QUEUE FLUSHED INTO A WORKOUT THAT IS GONE. Every item would be
             * refused for the same reason, so the loop stops and says it once
             * instead of naming each lift in turn.
             */
            const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
            if (goneFrom(body)) {
              workoutVanished(item.workoutId, body?.error ?? "This workout is no longer open.")
              return
            }
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
          // A retryable refusal keeps the queue AND names itself. A 5xx or a
          // dropped connection says nothing: the footer's "not saved yet" is
          // already the right sentence for that.
          setError(retryableRefusalMessage(res.status))
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
        if (permanentlyRefused(res.status)) {
          /**
           * A REFUSAL WILL NEVER SUCCEED ON A RETRY, so it is not queued. The
           * optimistic ✓ comes off NOW and the reason is named, rather than the
           * set sitting green and "waiting for signal" until the queue drops it.
           */
          const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
          /**
           * THE WHOLE WORKOUT IS GONE, NOT JUST THIS SET. Saying "that Squat set
           * could not be saved" would be true and useless: every remaining tick
           * would say the same thing, and the screen would keep offering a
           * workout that cannot take another set.
           */
          if (goneFrom(body)) {
            workoutVanished(item.workoutId, body?.error ?? "This workout is no longer open.")
            return "refused"
          }
          setWorkout((prev) =>
            prev ? { ...prev, sets: prev.sets.filter((x) => slotOf(x) !== slotOf(item)) } : prev
          )
          setError(
            `That ${item.exercise} set could not be saved: ${body?.error ?? "the server refused it"}`
          )
          return "refused"
        }
        if (!res.ok) {
          // Queued by the catch below, and named here — `retryableRefusalMessage`
          // returns null for a 5xx, which leaves the footer to speak.
          const why = retryableRefusalMessage(res.status)
          if (why) setError(why)
          throw new Error(String(res.status))
        }
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
        if (res.ok) {
          applyServer(seq, (await res.json()) as LiveWorkout)
          return
        }
        const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        if (goneFrom(body)) {
          workoutVanished(workout.id, body?.error ?? "This workout is no longer open.")
          return
        }
        setError(body?.error ?? "That set could not be removed.")
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
        /**
         * NOT "it will carry your change", which is what this used to say and
         * was not true: the queued write replays the set as it was ticked, so
         * nothing would have carried anything. It is a second or two on a good
         * connection, and the person can see the row saying so.
         */
        setError("That set is still saving — change it in a moment.")
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
        const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        if (goneFrom(body)) {
          workoutVanished(workout.id, body?.error ?? "This workout is no longer open.")
          return
        }
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
      /**
       * APPLIED HERE FIRST, so the NEXT tap reads this one.
       *
       * Every caller builds the whole field from `shown.adjustments` at click
       * time — "The WHOLE list, every time … building it from one index at
       * the call site is how one tick wipes another", says the comment above
       * the endurance ticks. But `shown` only changed when the response
       * landed, ~900ms away on localhost and longer on a phone, so three taps
       * in a row all read the SAME list:
       *
       *   REQ {"blocksDone":[0]}
       *   REQ {"blocksDone":[1]}
       *   REQ {"blocksDone":[2]}
       *   RES {"blocksDone":[2]}      <- two ticks gone, no error
       *
       * Reproduced at 600ms between taps, which is an ordinary tapping speed.
       * One tick still wiped another, by the other route. The same shape sat
       * behind "Skip this one" and Move up/down, which build `skipped` and
       * `order` the same way.
       *
       * Every field `AdjustWorkoutSchema` accepts is an adjustment, so merging
       * the patch in is right for all five callers. The server's answer still
       * arrives under `applyServer`'s fence and wins.
       */
      const before = workout.adjustments
      setWorkout((prev) =>
        prev ? { ...prev, adjustments: { ...prev.adjustments, ...patch } } : prev
      )
      // try/catch, because offline this rejected into an unhandled promise and
      // a failed "Skip this one" looked exactly like a successful one.
      try {
        const res = await fetch(`/api/workouts/${workout.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (res.ok) {
          applyServer(seq, (await res.json()) as LiveWorkout)
          return
        }
        const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        if (goneFrom(body)) {
          workoutVanished(workout.id, body?.error ?? "This workout is no longer open.")
          return
        }
        // PUT BACK. An optimistic tick that the server refused must not stay
        // on screen — that is the "it looked like it worked" this whole hook
        // is built against.
        setWorkout((prev) => (prev ? { ...prev, adjustments: before } : prev))
        setError(body?.error ?? "That change could not be saved.")
      } catch {
        setWorkout((prev) => (prev ? { ...prev, adjustments: before } : prev))
        setError("Could not reach the server, so that change was not saved.")
      }
    },
    [workout, applyServer, workoutVanished]
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
          /**
           * The row is gone. Not "saved with no totals" — deleted somewhere
           * else, and there is nothing to show for it.
           *
           * AND `vanished`, not just a sentence. The finish sheet is rendered
           * while `shown` is truthy, and `shown` is `workout ?? finished` — so
           * clearing the workout here without the flag left the sheet on screen
           * with Save enabled and nothing behind it: pressing it hits
           * `if (!workout) return null` and sends no request at all. That is
           * the dead control the previous round fixed on the OTHER path into
           * this state, one function away.
           */
          setVanished(true)
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
           *
           * EXCEPT WHEN THERE IS NOTHING LEFT TO ACT ON. A workout finished or
           * thrown away on another device cannot be finished here however many
           * times Save is pressed, so the sheet closes and the screen says what
           * happened rather than inviting a retry that can only fail.
           */
          if (goneFrom(body as { code?: string } | null)) {
            workoutVanished(workout.id, (body as { error?: string })?.error ?? "This workout is no longer open.")
            return null
          }
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
    /** Counted before the row goes, so the sentence can name what was lost. */
    const setsTickedNow = workout.sets.filter((set) => set.completedAt).length
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, { method: "DELETE" })
      if (!res.ok) {
        /**
         * ALREADY GONE IS NOT A FAILED DISCARD.
         *
         * "It is still here" is the one thing this must never say about a
         * workout that is not. Throw it away on the laptop, tap Throw away on
         * the phone, and the phone was told the workout survived — so the
         * person goes looking for it. The outcome they asked for has happened;
         * the screen just has to catch up.
         */
        const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        if (goneFrom(body)) {
          workoutVanished(workout.id, body?.error ?? "This workout is no longer open.")
          return
        }
        /**
         * AND NOT "IT IS STILL HERE" WHEN NOBODY KNOWS.
         *
         * A 503 is `CouldNotTell`: the server could not read the workout, so
         * whether it survived is exactly the thing it declined to answer.
         * Claiming it did is the third state collapsed into a definite one —
         * in the branch whose own comment three lines up says that sentence is
         * the one thing it must never get wrong.
         */
        setError(
          (body as { error?: string } | null)?.error ??
            "That workout could not be thrown away. It is still here."
        )
        return
      }
    } catch {
      /**
       * A LOST REPLY IS NOT A REQUEST THAT NEVER ARRIVED, and this said it was.
       *
       * The DELETE may well have committed; the answer is what went missing. So
       * "nothing was thrown away" is a claim about the one thing nobody knows,
       * and it sends somebody back to a workout that is gone. `finish` has
       * `checkWhetherItLanded` for exactly this shape — ask, do not guess.
       */
      setError(
        "Could not tell whether that went through. Reload to see whether the workout is still here."
      )
      return
    }
    clearStartKey(workout.enrollmentId)
    // What the screen says next. Not "finished": nothing was recorded, which is
    // exactly what the person asked for and the opposite of what it said.
    setEndedMessage(
      setsTickedNow > 0
        ? `Thrown away. ${setsTickedNow} ${setsTickedNow === 1 ? "set was" : "sets were"} deleted and nothing was recorded.`
        : "Thrown away. Nothing was recorded."
    )
    // FENCED, like `workoutVanished`. Tap Throw away while a tick's 200 is on
    // the wire and `applyServer` lands afterwards, putting the workout back on
    // a screen that has already cleared it.
    applied.current = ++issued.current
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
    /**
     * The workout was thrown away or finished somewhere else while this screen
     * had it open. The screen owes a different sentence than a normal finish.
     */
    vanished,
    /** Why there is no workout: null means an ordinary finish. */
    endedMessage,
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
    if (permanentlyRefused(res.status)) {
      clearStartKey(bucket)
      return { kind: "refused", message: body?.error ?? "Could not start that workout." }
    }
    /**
     * A RETRYABLE 4xx KEEPS THE KEY, like a 5xx. This read the raw range, so
     * a 401 or a 429 on Start threw away the idempotency key and reported a
     * permanent refusal — the third of the three status checks in this file,
     * and the one the fix for the other two did not reach.
     */
    if (res.status >= 400 && res.status < 500) {
      return {
        kind: "refused",
        message: retryableRefusalMessage(res.status) ?? "Could not start that workout.",
      }
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
