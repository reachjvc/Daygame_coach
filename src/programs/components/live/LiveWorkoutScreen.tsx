"use client"

/**
 * The workout, while you are in it.
 *
 * THE SCREEN THIS REPLACES was a form: every lift pre-filled with the plan's
 * numbers, nothing saved until one orange button at the end that said "I did
 * all of this — save it". That is not how anybody trains. You do a set, you
 * write it down, you rest, you do the next one — over an hour, with the phone
 * locking twenty times in between.
 *
 * So: one row per set, a ✓ that saves that set the moment you tap it, the rest
 * timer starting itself where your thumb already is, and what you did last time
 * sitting beside what you are about to do.
 *
 * SUPERSETS DO NOT START THE CLOCK EARLY. A pair is done alternating, so the
 * rest belongs after the second lift, not between them — a timer that goes off
 * in the middle of A2 is a timer people learn to ignore.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/BackLink"
import { SetRow } from "./SetRow"
import { RestBar } from "./RestBar"
import { FinishSheet } from "./FinishSheet"
import { useLiveWorkout } from "../../hooks/useLiveWorkout"
import { describeSets, restSecondsFor, describePlates, platesFor } from "../../programsService"
import { REST_SECONDS, UNIT_CONFIG } from "../../config"
import type {
  LiveWorkout,
  LiveWorkoutSet,
  PlateSetup,
  PrescribedExercise,
  SessionPrescription,
  UnitSystem,
} from "../../types"

interface Props {
  initial: LiveWorkout
  prescription: SessionPrescription | null
  programName: string | null
  unit: UnitSystem
  plates?: PlateSetup
  /** What each lift did the last time it came round, keyed by exercise id. */
  lastTime: Record<string, { weight: number; reps: number }[]>
}

export function LiveWorkoutScreen({
  initial,
  prescription,
  programName,
  unit,
  plates,
  lastTime,
}: Props) {
  const live = useLiveWorkout(initial)
  const router = useRouter()
  const [restFrom, setRestFrom] = useState<number | null>(null)
  const [restSeconds, setRestSeconds] = useState<number>(REST_SECONDS.accessory)
  const [restOurs, setRestOurs] = useState(true)
  const [finishing, setFinishing] = useState(false)
  /**
   * The workout as it was when Finish was pressed. Kept because finishing
   * clears the live one, and the summary is rendered from this side of that.
   */
  const [finished, setFinished] = useState<LiveWorkout | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const workout = live.workout
  const unitLabel = UNIT_CONFIG[unit].label

  const exercises = prescription?.exercises ?? []

  /**
   * The workout the screen is describing. `live.workout` goes null the moment a
   * finish succeeds, and the summary is rendered after that, so everything read
   * for display falls back to the copy taken when Finish was pressed.
   */
  const shown = workout ?? finished

  /** Sets already ticked, by lift. */
  const doneByLift = useMemo(() => {
    const map = new Map<string, LiveWorkoutSet[]>()
    for (const s of shown?.sets ?? []) {
      const key = s.exerciseId ?? s.exercise
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [shown])

  const skipped = new Set(shown?.adjustments.skipped ?? [])

  const unfinished = exercises
    .filter((ex) => !skipped.has(ex.exerciseId))
    .map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      done: (doneByLift.get(ex.exerciseId) ?? []).filter((s) => s.kind !== "warmup").length,
      asked: ex.sets.length,
    }))
    .filter((u) => u.done < u.asked)

  /**
   * THE SUMMARY OUTLIVES THE WORKOUT.
   *
   * Saving clears the live workout, and the empty state used to be checked
   * first — so the moment somebody pressed save, the sheet holding "63 minutes,
   * 4,200 kg, a new best" was replaced by "this workout is finished". The whole
   * reward for an hour, gone in the frame it arrived. The finish sheet is
   * therefore rendered from `shown`, which survives the clearing, and only a
   * screen that was never finishing falls through to the empty state.
   */
  if (finishing && shown) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <FinishSheet
          workout={shown}
          unfinished={unfinished}
          unsaved={live.unsaved}
          saving={live.saving}
          busy={live.busy}
          error={live.error}
          onSkipLift={(id) =>
            void live.adjust({ skipped: [...(shown.adjustments.skipped ?? []), id] })
          }
          onFinish={live.finish}
          // Before saving this is "Keep going" and goes back to the sets. After
          // saving there are no sets to go back to, so it leaves.
          onCancel={() => (workout ? setFinishing(false) : router.push("/programs"))}
        />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">This workout is finished.</p>
        <Button asChild className="mt-3">
          <Link href="/programs">Back to training</Link>
        </Button>
      </div>
    )
  }

  /** The last lift of a superset pair — the one the rest belongs after. */
  const isLastOfGroup = (ex: PrescribedExercise, i: number) => {
    if (!ex.supersetGroup) return true
    const next = exercises[i + 1]
    return !next || next.supersetGroup !== ex.supersetGroup
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <Elapsed
        startedAt={workout.startedAt}
        programName={programName}
        dayLabel={prescription?.dayLabel}
        onFinish={() => {
          setFinished(workout)
          setFinishing(true)
        }}
      />

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-3">
        {exercises.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing prescribed for this one — add what you did as you go.
          </p>
        )}

        {exercises.map((ex, i) => {
          const done = doneByLift.get(ex.exerciseId) ?? []
          const isSkipped = skipped.has(ex.exerciseId)
          const previous = lastTime[ex.exerciseId] ?? []
          const rest = restSecondsFor({ name: ex.name })

          return (
            <Card key={ex.exerciseId} className={isSkipped ? "opacity-60" : undefined}>
              <CardContent className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {ex.supersetGroup && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          {ex.supersetGroup}
                          {i + 1}
                        </span>
                      )}
                      <span className="truncate">{ex.name}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describeSets(ex, unitLabel)}
                      {ex.note ? ` · ${ex.note}` : ""}
                      {isSkipped ? " · skipped" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Options for ${ex.name}`}
                    onClick={() => setOpenMenu(openMenu === ex.exerciseId ? null : ex.exerciseId)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <MoreHorizontal className="size-5" />
                  </button>
                </div>

                {openMenu === ex.exerciseId && (
                  <div className="flex flex-wrap gap-2 border-t pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const now = workout.adjustments.skipped ?? []
                        void live.adjust({
                          skipped: isSkipped ? now.filter((id) => id !== ex.exerciseId) : [...now, ex.exerciseId],
                        })
                        setOpenMenu(null)
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
                    >
                      {isSkipped ? "I did do this one" : "Skip this one"}
                    </button>
                    <span className="self-center text-xs text-muted-foreground">
                      Rest {Math.round(rest.seconds / 60)} min{rest.ours ? " (our suggestion)" : ""}
                    </span>
                  </div>
                )}

                {!isSkipped &&
                  ex.sets.map((set, index) => {
                    const ticked = done.find((s) => s.setNumber === set.setNumber && s.kind !== "warmup")
                    return (
                      <SetRow
                        key={set.setNumber}
                        setNumber={set.setNumber}
                        prescribed={{
                          weight: set.weight,
                          reps: set.reps,
                          repRangeMax: set.repRangeMax,
                          amrap: set.amrap,
                        }}
                        previous={previous[index] ?? previous[previous.length - 1] ?? null}
                        done={ticked}
                        /**
                         * A set the server has not confirmed still carries the
                         * optimistic id it was given on screen. Saying so on
                         * the row itself matters more than the count at the
                         * bottom: it names WHICH set is at risk.
                         */
                        unsaved={ticked?.id.startsWith("pending:")}
                        unitLabel={unitLabel}
                        repUnit={ex.repUnit ?? "reps"}
                        bodyweight={ex.bodyweight}
                        onTick={(weight, reps) => {
                          void live.tick({
                            exerciseId: ex.exerciseId,
                            exercise: ex.name,
                            weight,
                            reps,
                            setNumber: set.setNumber,
                            kind: set.amrap ? "amrap" : "working",
                            side: null,
                          })
                          // The clock starts here, and only after the second
                          // lift of a superset pair.
                          if (isLastOfGroup(ex, i)) {
                            setRestSeconds(rest.seconds)
                            setRestOurs(rest.ours)
                            setRestFrom(Date.now())
                          }
                        }}
                        onUndo={ticked ? () => void live.removeSet(ticked.id) : undefined}
                      />
                    )
                  })}

                {!isSkipped && !ex.bodyweight && ex.sets[0] && (
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Bar: {describePlates(platesFor(ex.sets[0].weight, unit, plates), unitLabel)}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* ERRORS BELONG ON THE SCREEN THE PERSON IS LOOKING AT. This was only
            rendered inside the finish sheet, so "one set could not be saved and
            has been dropped" — a permanently lost set — was announced to nobody
            until an hour later, if at all. */}
        {live.error && (
          <p
            data-testid="live-error"
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
          >
            {live.error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
            if (confirm("Throw this workout away? Nothing will be recorded.")) void live.discard()
          }}>
            Discard workout
          </Button>
          {live.unsaved > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {live.unsaved} not saved yet
            </span>
          )}
        </div>
      </div>

      <RestBar
        startedAt={restFrom}
        targetSeconds={restSeconds}
        ours={restOurs}
        onDismiss={() => setRestFrom(null)}
        onExtend={(delta) => setRestSeconds((s) => Math.max(15, s + delta))}
      />
    </div>
  )
}

/**
 * How long you have been here. Derived from the stored start instant, so it is
 * right after the phone has been locked — the same rule as the rest timer.
 */
function Elapsed({
  startedAt,
  programName,
  dayLabel,
  onFinish,
}: {
  startedAt: string
  programName: string | null
  dayLabel?: string
  onFinish: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  // useEffect, not useMemo: a memo's return value is a value, not a cleanup, so
  // that version started a new interval on every remount and cleared none.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const mins = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000))

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        {/* THE ONE WAY BACK, shared. Hand-rolling a link with a back arrow is
            how thirteen of them ended up disagreeing about where "back" was;
            `tests/unit/navigation/backNavigation.test.ts` fails on a new one. */}
        <BackLink fallback="/programs" fallbackLabel="Training" className="shrink-0 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {dayLabel ?? "Workout"}
            {programName ? <span className="text-muted-foreground"> · {programName}</span> : null}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">{mins} min</p>
        </div>
        <Button size="sm" onClick={onFinish} data-testid="finish-workout">
          Finish
        </Button>
      </div>
    </div>
  )
}
