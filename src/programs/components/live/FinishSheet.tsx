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
import { Textarea } from "@/components/ui/textarea"
import type { LiveWorkout, WorkoutSummary } from "../../types"

interface Props {
  workout: LiveWorkout
  /** Lifts with sets left unticked, and what the engine will make of them. */
  unfinished: Array<{ exerciseId: string; name: string; done: number; asked: number }>
  /** Sets whose write failed and is waiting for signal. */
  unsaved: number
  /** Sets whose write is on the wire right now. */
  saving: number
  busy: boolean
  error: string | null
  onSkipLift: (exerciseId: string) => void
  onFinish: (input: {
    intensity: number
    endedAt?: string
    durationMin?: number
    notes?: string | null
    rpe?: number | null
  }) => Promise<WorkoutSummary | null>
  onCancel: () => void
}

/**
 * ISO instant to the `datetime-local` shape, in the browser's own clock.
 *
 * ROUNDED UP TO THE MINUTE. The input has no seconds, so a workout that started
 * at 20:43:37 and ended at 20:43:52 would come back as 20:43:00 — before it
 * began. Rounding up keeps the default at or after the moment it describes.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (d.getSeconds() > 0 || d.getMilliseconds() > 0) {
    d.setSeconds(0, 0)
    d.setMinutes(d.getMinutes() + 1)
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FinishSheet({
  workout,
  unfinished,
  unsaved,
  saving,
  busy,
  error,
  onSkipLift,
  onFinish,
  onCancel,
}: Props) {
  const lastTick = workout.sets
    .map((s) => s.completedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .pop()
  const [endedAt, setEndedAt] = useState(toLocalInput(lastTick ?? new Date().toISOString()))
  const [intensity, setIntensity] = useState(3)
  const [notes, setNotes] = useState("")
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)

  const started = new Date(workout.startedAt)
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - started.getTime()) / 60000))
  const longGap = Date.now() - started.getTime() > 4 * 60 * 60 * 1000
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
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="minutes" value={summary.durationMin} />
          <Stat label="sets" value={summary.sets} />
          <Stat label={`${summary.unit} lifted`} value={Math.round(summary.volume)} />
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

        {summary.changes.length > 0 && (
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
      {unfinished.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Not everything was ticked
          </p>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            {unfinished.map((u) => (
              <li key={u.exerciseId} className="flex items-center justify-between gap-2">
                <span>
                  {u.name} — {u.done} of {u.asked} sets, so it counts as a miss
                </span>
                <button
                  type="button"
                  onClick={() => onSkipLift(u.exerciseId)}
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
                >
                  Don&apos;t count it
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Started</span>
          <span className="text-sm tabular-nums">{started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Ended</span>
          <Input
            type="datetime-local"
            className="h-11 w-52 sm:h-9"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            aria-label="When the workout ended"
          />
        </label>
        <p className="text-sm text-muted-foreground">{minutes} min</p>
      </div>

      {tooLong && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
          That would be a {Math.round(minutes / 60)}-hour workout, which is longer than this can
          record. Set when it really ended above, or discard it.
        </p>
      )}

      {longGap && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This started {started.toLocaleDateString()} at{" "}
          {started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Check when it
          really ended before saving.
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">How hard was it? (1–5)</span>
        <select
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          aria-label="How hard the workout was, 1 to 5"
          className="h-11 w-24 rounded-md border border-input bg-background px-2 text-sm sm:h-9"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

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
          disabled={busy || unsaved > 0 || saving > 0 || tooLong}
          onClick={async () => {
            const result = await onFinish({
              intensity,
              endedAt: new Date(endedAt).toISOString(),
              durationMin: minutes,
              notes: notes.trim() || null,
            })
            if (result) setSummary(result)
          }}
        >
          {(busy || saving > 0) && <Loader2 className="mr-1 size-4 animate-spin" />}
          {saving > 0 ? "Saving your last set…" : "Save this workout"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Keep going
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
