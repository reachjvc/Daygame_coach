"use client"

/**
 * The end of a workout.
 *
 * WHEN IT ENDED IS ASKED FOR, NOT ASSUMED. Deriving it from "now" makes a
 * workout you forgot to close on Tuesday and finish on Thursday a 2,880-minute
 * workout — which the 600-minute ceiling refuses outright, so "finish or
 * discard" would collapse to "discard" and take the sets with it. The default
 * is the last set you ticked, which is the honest answer nearly every time.
 *
 * AND IT SAYS WHAT YOU DID. The old confirmation was a green box that appeared
 * for a moment and was replaced by a refetch. What a person wants at the end of
 * an hour is the hour: how long, how much, what they beat, and what the program
 * will ask for next time.
 */

import { useState } from "react"
import { Award, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { instantToWallClock, wallClockToInstant } from "@/src/shared/dateUtils"
import { distanceUnitFor, toKmFromDisplay } from "../../programsService"
import { Textarea } from "@/components/ui/textarea"
import type { LiveWorkout, WorkoutSummary } from "../../types"

interface Props {
  workout: LiveWorkout
  /** Lifts with sets left unticked, and what the engine will make of them. */
  unfinished: Array<{ exerciseId: string; name: string; done: number; asked: number }>
  /**
   * Lifts added on the day with nothing ticked. Listed, because you meant to do
   * them — but never with a count, and never as misses: nothing prescribed
   * them, so there is no plan for them to have fallen short of.
   */
  untouchedAdded: Array<{ exerciseId: string; name: string }>
  /** Sets whose write failed and is waiting for signal. */
  unsaved: number
  /** Sets whose write is on the wire right now. */
  saving: number
  busy: boolean
  error: string | null
  onSkipLift: (exerciseId: string) => void
  onFinish: (input: {
    intensity: number
    startedAt?: string
    endedAt?: string
    notes?: string | null
    rpe?: number | null
    distanceKm?: number | null
    sessionType?: "weights" | "cardio" | "mobility" | "yoga" | "running"
  }) => Promise<WorkoutSummary | null>
  onCancel: () => void
  /**
   * The ACCOUNT's zone. Every time on this sheet is read and written in it.
   *
   * It used to be the browser's, so somebody who trained at 18:00 in
   * Copenhagen and opened the app on a laptop still set to Tokyo was shown
   * 01:00 the next day — and "correcting" it broke a time that was right.
   */
  timezone: string
  /**
   * This session happened earlier, so both times are open and nothing about
   * "now" is assumed. Same six-hour rule as the door's still-open state: a
   * workout left open since Monday and one deliberately backdated are the
   * same situation.
   */
  past?: boolean
  /** The day prescribes blocks rather than lifts, so ask how far. */
  endurance?: boolean
  /** No program, so nothing knows what kind of session this was but the person. */
  loose?: boolean
}

/**
 * `toLocalInput` used to live here and read the BROWSER's clock.
 *
 * `instantToWallClock` / `wallClockToInstant` in `src/shared/dateUtils.ts` do
 * the same job in the account's zone, which is the zone every other date in
 * this app is filed by. The rounding-up it did is kept below, where the
 * default end time is set.
 */
/**
 * The input has no seconds, so a workout that started at 20:43:37 and ended
 * fifteen seconds later would default to 20:43:00 — before it began. Rounding
 * up keeps the default at or after the moment it describes.
 */
function roundUpToMinute(iso: string): string {
  const at = new Date(iso)
  if (at.getSeconds() > 0 || at.getMilliseconds() > 0) {
    at.setSeconds(0, 0)
    at.setMinutes(at.getMinutes() + 1)
  }
  return at.toISOString()
}

export function FinishSheet({
  workout,
  unfinished,
  untouchedAdded,
  unsaved,
  saving,
  busy,
  error,
  onSkipLift,
  onFinish,
  onCancel,
  timezone,
  past = false,
  endurance = false,
  loose = false,
}: Props) {
  const lastTick = workout.sets
    .map((s) => s.completedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .pop()
  /**
   * NOTHING IS INVENTED IN PAST MODE.
   *
   * A live workout defaults its end to the last set you ticked. A session you
   * are writing up has no such moment worth guessing from, so Ended starts
   * EMPTY and Save says why it is disabled — rather than offering a plausible
   * time somebody will accept without reading.
   */
  const [startedAt, setStartedAt] = useState(() => instantToWallClock(workout.startedAt, timezone))
  const [endedAt, setEndedAt] = useState(() =>
    past ? "" : instantToWallClock(roundUpToMinute(lastTick ?? new Date().toISOString()), timezone)
  )
  const [editingEnd, setEditingEnd] = useState(past)
  const [intensity, setIntensity] = useState(3)
  const [notes, setNotes] = useState("")
  const [distance, setDistance] = useState("")
  const [kind, setKind] = useState<"weights" | "cardio" | "mobility" | "yoga" | "running" | null>(
    // Preselected only when there is evidence: a ticked set is a gym session
    // unless somebody says otherwise. Nothing ticked means nothing is known.
    loose && workout.sets.some((set) => set.completedAt) ? "weights" : null
  )
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)

  /**
   * AN EMPTY BOX IS A STATE, NOT A CRASH.
   *
   * `startedAt` was read straight into `new Date(wallClockToInstant(…))`, which
   * throws on "". Clearing the Started field — the first thing anybody does
   * before typing a different time — threw during render and took the whole
   * live screen down mid-workout, with every unsaved set on it.
   */
  const started = startedAt ? new Date(wallClockToInstant(startedAt, timezone)) : null
  const endedInstant = endedAt ? new Date(wallClockToInstant(endedAt, timezone)) : null
  const minutes =
    endedInstant && started
      ? Math.max(1, Math.round((endedInstant.getTime() - started.getTime()) / 60000))
      : 0
  // In past mode the open row IS the message; the note would repeat it.
  const longGap = !past && started !== null && Date.now() - started.getTime() > 4 * 60 * 60 * 1000

  const distanceUnit = distanceUnitFor(workout.unit)
  const askDistance = endurance || kind === "running" || kind === "cardio"
  /** Why Save cannot be pressed yet, in the person's words. */
  const blocked = !startedAt
    ? "Say when it started"
    : past && !endedAt
      ? "Say when it ended"
      : loose && !kind
        ? "Say what kind of session it was"
        : null
  /**
   * TOO LONG TO BE A WORKOUT — said HERE, not as a 400 after the fact.
   *
   * Start a session on Tuesday, get called away, come back Thursday: the end
   * time defaults to now, the duration comes out at 2,220 minutes, and the
   * server refused it with "Could not finish that workout". Since only one
   * workout may be open at a time, that left the person unable to start ANY
   * workout, with nothing on screen saying the Ended field was the way out.
   */
  const MAX_MINUTES = 599
  const tooLong = minutes > MAX_MINUTES

  if (summary) {
    return (
      <div data-testid="workout-summary" className="space-y-4">
        <h2 className="text-lg font-semibold">Done.</h2>

        {/* SAVED, AND NOTHING ELSE IS KNOWN. The reply was lost, the server has
            confirmed the workout did close, and the totals could not be read
            back. "0 sets, 0 kg lifted" after an hour of training would be a
            claim about the person that is not true, so every number is withheld
            instead. */}
        {summary.unavailable && (
          <p
            data-testid="summary-unavailable"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
          >
            Saved, but the totals could not be worked out.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="minutes" value={summary.unavailable ? "—" : summary.durationMin} />
          <Stat label="sets" value={summary.unavailable ? "—" : summary.sets} />
          <Stat
            label={`${summary.unit} lifted`}
            value={summary.unavailable ? "—" : Math.round(summary.volume)}
          />
        </div>

        {/* A RECORD CANNOT BE CLAIMED, OR RULED OUT, AGAINST A HISTORY NOBODY
            COULD READ. Saying nothing here would read as "you beat nothing
            today", which is a claim, and one the app has no grounds for. */}
        {summary.recordsUnavailable && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
            Your past workouts could not be read just now, so this one has not been checked against
            your bests. The workout itself is saved.
          </p>
        )}

        {summary.personalRecords.length > 0 && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
              <Award className="size-4" /> New best
            </p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {summary.personalRecords.map((pr) => (
                <li key={`${pr.exercise}-${pr.weight_kg}-${pr.reps}`}>
                  {pr.exercise} {pr.weight} {summary.unit} × {pr.reps}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* A LIFT YOU HAD NEVER DONE HAS NOTHING TO BEAT. Every set used to be
            announced as a personal best against an empty history, which made
            "New best" mean nothing on the first session. A first is named as a
            first — true, and still worth seeing. */}
        {summary.firstTimeLifts.length > 0 && (
          <p data-testid="first-time-lifts" className="text-sm text-muted-foreground">
            First time logged: {summary.firstTimeLifts.join(", ")}
          </p>
        )}

        {/* NOT KEPT IS NOT NOTHING. A workout finished before the receipt was
            stored on the row has no record of what the program did next, and
            saying nothing here would read as "nothing changed". */}
        {summary.changesUnavailable && (
          <p className="text-sm text-muted-foreground">
            What changed for next time was not kept for this workout.
          </p>
        )}

        {!summary.changesUnavailable && summary.changes.length > 0 && (
          <div>
            <p className="text-sm font-medium">Next time</p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {summary.changes.map((c) => (
                <li key={c.exerciseId}>
                  <span className="text-foreground">{c.name}:</span> {c.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button className="w-full" onClick={onCancel}>
          Back to training
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Finish this workout</h2>

      {/* LIFTS LEFT UNDONE, AND WHAT THE PROGRAM WILL MAKE OF THEM — before you
          save, not discovered next session. Stopping short because the gym is
          closing is not the same as failing, and the engine cannot tell unless
          you say. */}
      {(unfinished.length > 0 || untouchedAdded.length > 0) && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          {/* THE RULE ONCE, THE LIFTS AS A LIST. It read "so it counts as a
              miss" on every row — three lifts meant the same clause three
              times, and three bordered "Don't count it" buttons stacked down
              the right made a warning box look like a form. The consequence is
              stated once, at the top, where a rule belongs. */}
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Not everything was ticked
          </p>
          {unfinished.length > 0 && (
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
              These count as misses and will bring the weight down. Say so if you stopped for
              another reason.
            </p>
          )}
          <ul className="mt-2 space-y-1 text-sm">
            {unfinished.map((u) => (
              <li key={u.exerciseId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {u.name}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    {u.done} of {u.asked}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onSkipLift(u.exerciseId)}
                  className="min-h-11 shrink-0 rounded-md px-2 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground sm:min-h-0 sm:py-1"
                >
                  not a miss
                </button>
              </li>
            ))}
            {/* NO "of N" AND NO MISS WORDING. Nothing asked for these, so there
                is no count to be short of and no weight to bring down. */}
            {untouchedAdded.map((a) => (
              <li key={a.exerciseId} className="min-w-0 truncate">
                {a.name} <span className="text-muted-foreground">— added, nothing ticked</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        THE TIME READS AS A SENTENCE, AND THE EDITOR IS BEHIND A TAP.
        This put a raw `datetime-local` — the operating system's own widget, with
        its own calendar button and its own date format — in the middle of a dark
        themed sheet, next to a plain text "Started 02:38 PM" and a bare
        "1 min". Three alignments, two date formats, one foreign control, on the
        last screen you see after training. Almost nobody needs to change the end
        time; the few who do can still reach it.
      */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="tabular-nums">
            {started
              ? started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })
              : "—"}
          </span>
          <span className="text-muted-foreground"> → </span>
          <span className="tabular-nums">
            {endedInstant
              ? endedInstant.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })
              : "—"}
          </span>
          {endedInstant && <span className="ml-2 text-muted-foreground">{minutes} min</span>}
        </p>
        {!past && (
          <button
            type="button"
            onClick={() => setEditingEnd((v) => !v)}
            aria-expanded={editingEnd}
            className="min-h-11 shrink-0 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:py-1"
          >
            {editingEnd ? "Done" : "Change"}
          </button>
        )}
      </div>
      {editingEnd && (
        <div className="grid gap-2 sm:grid-cols-2">
          {/* BOTH TIMES. Only the end could be edited, so a session written up
              later was stuck with the moment Start happened to be pressed. */}
          <div className="flex flex-col gap-1">
            <label htmlFor="finish-started" className="text-xs text-muted-foreground">
              Started
            </label>
            <Input
              id="finish-started"
              type="datetime-local"
              className="h-11 w-full sm:h-9"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              aria-label="When the workout started"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="finish-ended" className="text-xs text-muted-foreground">
              Ended
            </label>
            <Input
              id="finish-ended"
              type="datetime-local"
              className="h-11 w-full sm:h-9"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              aria-label="When the workout ended"
            />
          </div>
        </div>
      )}

      {/* WHAT WAS THIS? Only where nothing else knows: a loose workout has no
          program to ask, and a run recorded as one was stored as a gym session
          and appeared in no running total anywhere. */}
      {loose && (
        <div className="flex flex-col gap-1" data-testid="finish-kind">
          <span className="text-xs text-muted-foreground">What was this?</span>
          <div className="flex flex-wrap gap-1.5">
            {(["weights", "cardio", "mobility", "yoga", "running"] as const).map((k) => (
              <Button
                key={k}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 capitalize sm:min-h-9 ${kind === k ? "border-primary/50 bg-primary/10 text-primary" : ""}`}
              >
                {k}
              </Button>
            ))}
          </div>
        </div>
      )}

      {askDistance && (
        <div className="flex flex-col gap-1">
          <label htmlFor="finish-distance" className="text-xs text-muted-foreground">
            How far ({distanceUnit})
          </label>
          <Input
            id="finish-distance"
            type="number"
            inputMode="decimal"
            className="h-11 w-full sm:h-9"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            // Asked in miles for a pounds lifter, stored as kilometres either
            // way — one unit in the database, as with weight.
            aria-label={`How far, in ${distanceUnit}`}
          />
        </div>
      )}

      {tooLong && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
          That would be a {Math.round(minutes / 60)}-hour workout, which is longer than this can
          record. Set when it really ended above, or discard it.
        </p>
      )}

      {longGap && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {/* The account's zone, like every other time on this sheet. Read in
              the device's, this told a traveller their session started on a
              day they were not even training. */}
          This started {started?.toLocaleDateString([], { timeZone: timezone })} at{" "}
          {started?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })}.
          Check when it really ended before saving.
        </p>
      )}

      {/* Five choices is a row of five, not a dropdown you open, scroll and
          close. The native select was also the second unstyled OS control on
          this sheet. */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">How hard was it?</span>
        <div
          role="group"
          aria-label="How hard the workout was, 1 to 5"
          className="inline-flex w-fit overflow-hidden rounded-md border border-input"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIntensity(n)}
              aria-pressed={intensity === n}
              className={`min-h-11 w-11 border-r border-input text-sm tabular-nums transition-colors last:border-r-0 sm:min-h-9 ${
                intensity === n ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Anything worth remembering?</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>

      {unsaved > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Waiting for signal — {unsaved} {unsaved === 1 ? "set is" : "sets are"} not saved yet.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          // Saving before the last set lands would report a workout that did
          // not happen and progress the program on it.
          disabled={busy || unsaved > 0 || saving > 0 || tooLong || blocked !== null}
          onClick={async () => {
            const result = await onFinish({
              intensity,
              // Both read in the ACCOUNT's zone. The start is sent only when
              // it was actually changed, so a live finish leaves it alone.
              ...(startedAt !== instantToWallClock(workout.startedAt, timezone)
                ? { startedAt: wallClockToInstant(startedAt, timezone) }
                : {}),
              endedAt: wallClockToInstant(endedAt, timezone),
              // NO durationMin. The server derives it from the two instants;
              // sending a third number is how "45 minutes at effort 3" got in.
              notes: notes.trim() || null,
              ...(askDistance && distance.trim()
                ? { distanceKm: toKmFromDisplay(Number(distance), workout.unit) }
                : {}),
              ...(loose && kind ? { sessionType: kind } : {}),
            })
            if (result) setSummary(result)
          }}
        >
          {(busy || saving > 0) && <Loader2 className="mr-1 size-4 animate-spin" />}
          {/* WHY IT IS OFF, on the button itself. A disabled control with no
              reason is a dead end somebody taps twice and then leaves. */}
          {blocked ?? (saving > 0 ? "Saving your last set…" : "Save this workout")}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Keep going
        </Button>
      </div>
    </div>
  )
}

/** `value` takes a string so an unknown total can read "—" rather than 0. */
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
