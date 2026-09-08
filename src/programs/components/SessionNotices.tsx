"use client"

/**
 * The things the app knows about your training that you might not.
 *
 * Lifted out of the session form so they survive it. Both are the same kind of
 * thing: a fact the engine can see and the person cannot, stated plainly, with
 * the decision left to them.
 */

import { useMemo } from "react"
import { daysSinceLastSession, staleLifts, LAYOFF_DAYS } from "../programsService"
import { UNIT_CONFIG } from "../config"
import type { LoggedExercise, SessionPrescription, UnitSystem } from "../types"

interface Props {
  prescription: SessionPrescription
  logs: { logged_at: string; entries: LoggedExercise[] }[]
  unit: UnitSystem
  onFinish?: (choice: "archive" | "restart") => void
}

export function SessionNotices({ prescription, logs, unit, onFinish }: Props) {
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
        <div
          data-testid="program-complete"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-400"
        >
          <p className="font-medium">You have finished this program. 🎉</p>
          <p className="mt-0.5">
            Everything you logged is kept either way — ending it moves it to the programs you have
            finished, and starting it again begins from week one.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFinish("archive")}
              className="min-h-9 rounded-md border border-emerald-500/40 px-2 py-1 transition-colors hover:bg-emerald-500/15"
            >
              End it — I am done
            </button>
            <button
              type="button"
              onClick={() => onFinish("restart")}
              className="min-h-9 rounded-md border border-border px-2 py-1 text-muted-foreground transition-colors hover:bg-accent"
            >
              Run it again
            </button>
          </div>
        </div>
      )}

      {prescription.isFinalSession && !prescription.isComplete && (
        <p className="text-xs text-emerald-600">
          Final session — you will have graduated the program. 🎉
        </p>
      )}
      <span className="sr-only">{UNIT_CONFIG[unit].label}</span>
    </>
  )
}
