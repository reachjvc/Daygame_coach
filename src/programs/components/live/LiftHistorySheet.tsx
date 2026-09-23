"use client"

/**
 * ONE LIFT'S LAST FIVE SESSIONS, behind its name.
 *
 * "What did I do for all of it last time" is the question a lifter asks
 * standing at the rack, and the live screen could only answer "what did I do
 * for the set with this number" — one cell of the PREVIOUS column, with no
 * date on it and no way to see the session it came from.
 *
 * IT READS EVERY WORKOUT, not this program's. The History panel elsewhere
 * reads one enrollment, so "my bench" resets the day you change program —
 * backwards, because the lift is the thing that persists and the program is
 * the thing that changes. `lastSetsForLifts` matches on the lift's library id
 * OR its name, so a self-built week calling it "Back Squat" counts too.
 *
 * THE FOUR STATES ARE FOUR DIFFERENT SENTENCES. "Could not load" and "nothing
 * logged" used to be the same blank list, which is the failure this app has
 * fixed in 59 places: a read that broke, presented as a fact about your
 * training.
 */

import { useLoad } from "@/src/shared/useLoad"
import { collapseSets } from "@/src/health/healthService"
import { BottomSheet } from "@/components/BottomSheet"
import { formatLoad } from "../../programsService"
import type { LiftSessions, UnitSystem } from "../../types"

interface Props {
  open: boolean
  onClose: () => void
  /** The lift as this screen knows it — the name is what the reader sees. */
  name: string
  libraryId?: string | null
  unit: UnitSystem
  unitLabel: string
  /** The ACCOUNT's zone: a session's date is a calendar fact, not an instant. */
  timezone: string
}

/** "Fri 12 Sep", in the account's own calendar. */
function dayIn(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  })
}

/** The heaviest set in these sessions, and the reps that went with it. */
function bestOf(sessions: LiftSessions[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null
  for (const session of sessions) {
    for (const set of session.sets) {
      // A warm-up is not a best, however heavy the number happens to be.
      if (set.kind === "warmup") continue
      if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
        best = { weight: set.weight, reps: set.reps }
      }
    }
  }
  return best
}

export function LiftHistorySheet({
  open,
  onClose,
  name,
  libraryId,
  unit,
  unitLabel,
  timezone,
}: Props) {
  /**
   * Asked for only while the sheet is open. `useLoad` fires on mount, and this
   * component is rendered once per lift on the screen — six lifts would be six
   * reads of a hundred workouts each, on a page somebody opens to tick a set.
   */
  const url = `/api/workouts/lifts?exercise=${encodeURIComponent(name)}${
    libraryId ? `&libraryId=${encodeURIComponent(libraryId)}` : ""
  }&unit=${unit}`
  const loaded = useLoad<LiftSessions[]>(url, (body) => {
    const parsed = body as { sessions?: LiftSessions[] } | null
    if (!parsed || !Array.isArray(parsed.sessions)) throw new Error("unexpected shape")
    return parsed.sessions
  })

  return (
    <BottomSheet open={open} onClose={onClose} title={`Last times for ${name}`} testId="lift-history-sheet">
      {loaded.state === "loading" && (
        <div className="space-y-1" data-testid="lift-history-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      )}

      {loaded.state === "failed" && (
        <p className="px-3 py-2 text-xs text-amber-500" data-testid="lift-history-sheet-failed">
          Could not load your past sets.{" "}
          <button type="button" onClick={loaded.retry} className="min-h-11 underline">
            Try again
          </button>
        </p>
      )}

      {loaded.state === "ready" && loaded.data.length === 0 && (
        <p className="px-3 py-2 text-sm text-muted-foreground" data-testid="lift-history-sheet-empty">
          {/* BOUNDED, AND IT SAYS SO. The read looks at a hundred finished
              workouts; "nothing logged, ever" would be a claim it cannot
              make. */}
          Nothing logged for this lift in your last 100 workouts.
        </p>
      )}

      {loaded.state === "ready" && loaded.data.length > 0 && (
        <div data-testid="lift-history-sheet-rows">
          {loaded.data.map((session, i) => (
            <div key={`${session.at}-${i}`} className="flex min-h-11 items-baseline gap-2 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">{dayIn(session.at, timezone)}</span>
              <span className="min-w-0 tabular-nums">
                {/* Identical sets said once: five rows of "100 kg × 5" is a
                    spreadsheet, and the set that DIFFERED is the only part
                    worth reading. */}
                {collapseSets(
                  session.sets.map((set) => ({
                    exercise: name,
                    weight: set.weight,
                    reps: set.reps,
                    kind: set.kind,
                    setNumber: set.setNumber,
                  }))
                )
                  .map(
                    (run) =>
                      `${run.count > 1 ? `${run.count} × ` : ""}${formatLoad(run.weight)} ${unitLabel} × ${run.reps}${
                        run.kind === "warmup" ? " (W)" : ""
                      }`
                  )
                  .join(" · ")}
              </span>
            </div>
          ))}
          {(() => {
            const best = bestOf(loaded.data)
            return best ? (
              <p className="px-3 pb-1 text-xs text-muted-foreground" data-testid="lift-history-best">
                Best: {formatLoad(best.weight)} {unitLabel} × {best.reps}
              </p>
            ) : null
          })()}
        </div>
      )}
    </BottomSheet>
  )
}
