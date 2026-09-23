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
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { instantToWallClock, wallClockToInstant } from "@/src/shared/dateUtils"
import {
  distanceUnitFor,
  toKmFromDisplay,
  missOutcome,
  missWording,
} from "../../programsService"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ReceiptBody } from "../WorkoutReceipt"
import type { KeepableChanges, LiveWorkout, WorkoutSummary } from "../../types"
import type { MissRule } from "../../types"

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
  /**
   * What a miss costs, per lift, read from the program and the enrollment.
   * Absent for a loose workout, which has no program to deload.
   */
  missRules?: Record<string, MissRule>
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
  /**
   * How much of a run happened: blocks ticked, and blocks prescribed.
   *
   * NO MISS WORDING. A run cut short is not a failed lift — there is no weight
   * to hold or drop, and an endurance program's progression is its weekly
   * plan, not this session's judgement. It says what happened and stops there.
   */
  blocks?: { done: number; asked: number }
  /**
   * What of today's changes the PROGRAM can keep, decided on the server by
   * `keepableChanges`. Absent for a loose workout, which has no program.
   *
   * The switch is not offered when there is nothing to keep — an inert control
   * is a question nobody can answer — and a week-by-week plan says it cannot
   * be edited instead, because that is a fact about the plan rather than about
   * today.
   */
  keepable?: KeepableChanges | null
  /** This program is a fixed week-by-week plan, so nothing can be kept. */
  fixedPlan?: boolean
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
  missRules,
  timezone,
  past = false,
  endurance = false,
  blocks,
  keepable,
  fixedPlan = false,
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
  /**
   * OFF BY DEFAULT. Changing the program is a bigger thing than recording a
   * workout, and a switch that starts on would edit next Tuesday for anybody
   * who swapped a lift once and tapped Save without reading.
   */
  const [keepChanges, setKeepChanges] = useState(false)
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

        {/* THE SAME RECEIPT THE PAGE SHOWS. This drew its own version of the
            figures, the bests and what the program does next — and the two
            had already drifted: this one knew about a lost reply and the page
            did not, the page named the day and this one did not. A receipt is
            a record, so there is one of it. */}
        <ReceiptBody summary={summary} />

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
              {/* WHAT HAPPENS IS PER LIFT, and it is on each row below. This
                  said "these count as misses and will bring the weight down"
                  over all of them — false two times in three on StrongLifts,
                  whose rule is three consecutive misses before a deload. A
                  sentence that threatens a drop that is not coming is how you
                  teach somebody to fake a set. */}
              Say so if you stopped for another reason.
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
                  {missRules && (
                    <span className="block text-xs text-muted-foreground">
                      {missWording(missOutcome(missRules[u.exerciseId]), missRules[u.exerciseId])}
                    </span>
                  )}
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

      {blocks && blocks.asked > 0 && (
        <p data-testid="finish-blocks" className="text-sm text-muted-foreground">
          {blocks.done} of {blocks.asked} blocks
        </p>
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
                intensity === n ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/*
        KEEP TODAY'S CHANGES — offered only when there is something to keep.
        The rack was taken, you did front squats, and next Tuesday the program
        asks for squats again. Strong asks this question; nothing here did, so
        every swap was a one-off and the same fight happened every week.
      */}
      {keepable?.any && (
        <div className="space-y-1">
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>Keep these changes for next time</span>
            <Switch
              checked={keepChanges}
              onCheckedChange={setKeepChanges}
              data-testid="keep-changes"
              aria-label="Keep these changes for next time"
            />
          </label>
          {/*
            WHAT CANNOT BE KEPT, AND WHY. A lift typed by hand has no
            prescription to write, and a lift with no ticked set has no
            starting weight — and guessing one is the invented number the rest
            of this rebuild removes. Named, so it is a decision rather than a
            surprise.
          */}
          {keepable.oneOffs.map((one) => (
            <p key={one.name} className="text-xs text-muted-foreground" data-testid="keep-one-off">
              {one.name} stays a one-off — {one.why}
            </p>
          ))}
        </div>
      )}

      {fixedPlan && (
        <p className="text-xs text-muted-foreground" data-testid="fixed-plan">
          This plan cannot be edited, so today&apos;s changes are for today only.
        </p>
      )}

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
              ...(keepChanges ? { keepChanges: true } : {}),
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
/**
 * `Stat` lived here. It is `Figure` inside `ReceiptBody` now — the finish
 * sheet and the receipt page were drawing the same three numbers two ways.
 */
