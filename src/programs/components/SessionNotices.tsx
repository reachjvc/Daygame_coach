"use client"

/**
 * The things the app knows about your training that you might not.
 *
 * Lifted out of the session form so they survive it. Both are the same kind of
 * thing: a fact the engine can see and the person cannot, stated plainly, with
 * the decision left to them.
 */

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DONE } from "./trainingStyles"
import { daysSinceLastSession, staleLifts, LAYOFF_DAYS } from "../programsService"
import type { LoggedExercise, SessionPrescription } from "../types"

interface Props {
  prescription: SessionPrescription
  logs: { logged_at: string; entries: LoggedExercise[] }[]
  /**
   * NO `unit` HERE ANY MORE, and the prop is the reason the bug existed.
   *
   * Nothing in this component says a weight. `unit` was consumed by a lone
   * `<span className="sr-only">kg</span>` at the very end of the notices —
   * a screen reader reached the bottom of "you have been away 12 days" and
   * heard "kg", attached to nothing. On Couch to 5K, which has no weights
   * anywhere in it, it announced a unit the program never uses.
   *
   * It was there to keep the prop used. A prop that only a decorative element
   * reads is a prop the component does not need.
   */
  onFinish?: (choice: "archive" | "restart") => void
}

export function SessionNotices({ prescription, logs, onFinish }: Props) {
  const layoffDays = useMemo(() => daysSinceLastSession(logs), [logs])
  /**
   * WHICH lifts went stale, not just "you have been away". After a busy month
   * it is usually some lifts and not the program, and one line for the whole
   * program cannot say which weights below are the wrong ones.
   */
  const stale = useMemo(
    () => staleLifts(logs, (id) => prescription.exercises.find((e) => e.exerciseId === id)?.name ?? id),
    [logs, prescription]
  )

  return (
    <>
      {layoffDays !== null && layoffDays >= LAYOFF_DAYS && (
        <p
          data-testid="layoff-notice"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
        >
          You last trained this {layoffDays} days ago. The weights below are where you left them —
          take some off before your first session back if they look heavy now.
          {stale.length > 0 && stale.length < prescription.exercises.length && (
            <span className="mt-1 block" data-testid="stale-lifts">
              Longest untrained: {stale.slice(0, 3).map((l) => `${l.name} (${l.days}d)`).join(", ")}.
            </span>
          )}
        </p>
      )}

      {/* THE LANDING. `advanceCursor` holds at the last session once it is
          reached, so a finished plan used to re-offer its final session for
          ever — congratulating somebody and then giving them nowhere to go. */}
      {prescription.isComplete && onFinish && (
        <div data-testid="program-complete" className={DONE.notice}>
          <p className="font-medium">You have finished this program. 🎉</p>
          <p className="mt-0.5">
            Everything you logged is kept either way — ending it moves it to the programs you have
            finished, and starting it again begins from week one.
          </p>
          {/* `Button`, not two hand-rolled ones: these were `min-h-9` — 36 px,
              eight under the floor — and the second hovered `bg-accent`, which
              in this app is the sunset red, so "Run it again" flashed a warning
              colour at you for wanting to run it again. */}
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onFinish("archive")}>
              End it — I am done
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onFinish("restart")}>
              Run it again
            </Button>
          </div>
        </div>
      )}

      {prescription.isFinalSession && !prescription.isComplete && (
        <p className={`text-xs ${DONE.text}`}>
          Final session — you will have graduated the program. 🎉
        </p>
      )}
    </>
  )
}
