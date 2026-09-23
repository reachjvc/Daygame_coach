/**
 * WHAT A WORKOUT WAS — the same sheet you saw when you finished it.
 *
 * Every number here was WRITTEN AT THE TIME, in the transaction that closed
 * the workout. Recomputing them now would give a different answer once the
 * program has been edited, and no answer at all for anything finished before
 * receipts were stored — so a receipt is a record, not a re-derivation.
 *
 * A NUMBER THAT COULD NOT BE READ IS NOT ZERO. `recordsUnavailable` and
 * `changesUnavailable` are third states and print as "not kept" rather than as
 * "you beat nothing" and "nothing changed", which is what they used to look
 * like and is a different, false claim.
 */

import { Card, CardContent } from "@/components/ui/card"
import { BackLink } from "@/components/BackLink"
import { UNIT_CONFIG } from "../config"
import { TRAINING_COLUMN, TRAINING_CARD, TRAINING_CARD_BODY } from "./trainingStyles"
import { weekdayNameIn } from "../programsService"
import { PROGRAMS } from "@/src/shared/trainingRoutes"
import type { WorkoutSummary } from "../types"

/**
 * THE FIGURES AND THE LISTS — the same ones, wherever they are shown.
 *
 * The finish sheet drew its own version of this and the receipt page drew
 * another: two renderings of one workout, and they had already drifted (the
 * sheet knew about a lost reply, the page did not; the page named the day,
 * the sheet did not). A receipt is a record, so there is one of it.
 */
export function ReceiptBody({ summary }: { summary: WorkoutSummary }) {
  const unitLabel = UNIT_CONFIG[summary.unit].label

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure label="Minutes" value={summary.unavailable ? null : summary.durationMin} />
        <Figure label="Sets" value={summary.unavailable ? null : summary.sets} />
        <Figure
          label={`Volume (${unitLabel})`}
          value={summary.unavailable ? null : Math.round(summary.volume)}
        />
      </div>

      {summary.recordsUnavailable ? (
        // NOT "you beat nothing". The history could not be read, and those
        // are different things to be told.
        <p className="text-sm text-muted-foreground" data-testid="records-unavailable">
          Your best lifts were not checked for this workout.
        </p>
      ) : (
        <>
          {summary.personalRecords.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Personal bests
              </p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {summary.personalRecords.map((pr) => (
                  <li key={`${pr.exercise}-${pr.reps}`} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{pr.exercise}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pr.weight} {unitLabel} × {pr.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* A FIRST IS NOT A RECORD. With no history every set used to be
              announced as a personal best, so the very first set an account
              ever logged came back as "New best". */}
          {summary.firstTimeLifts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              First time logged: {summary.firstTimeLifts.join(", ")}
            </p>
          )}
        </>
      )}

      {summary.changesUnavailable ? (
        <p className="text-sm text-muted-foreground" data-testid="changes-unavailable">
          What the program did next was not kept for this workout.
        </p>
      ) : summary.changes.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Next time</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {summary.changes.map((c) => (
              <li key={c.exerciseId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="shrink-0 text-muted-foreground">{c.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function WorkoutReceipt({
  summary,
  timezone,
}: {
  summary: WorkoutSummary
  /** The account's zone — the only clock allowed to name a day here. */
  timezone: string
}) {
  const day = summary.startedAt ? weekdayNameIn(summary.startedAt, timezone) : null

  return (
    <div className="min-h-screen bg-background">
      {/* The column width every training screen shares, so the page does not
          change shape on the way here from the card that linked to it. */}
      <div className={`${TRAINING_COLUMN} pb-tab-bar pt-4`}>
        {/* The shared one: it reads `?from=` itself, checks it for the
            open-redirect tricks a URL can carry, and names the destination
            rather than saying "Back". A hand-rolled link here would be a
            second answer to "where does Back go". */}
        <BackLink
          fallback={PROGRAMS}
          fallbackLabel="Training"
          className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        />

        <h1 className="mb-3 text-base font-semibold">
          {day ? `${day}'s workout` : "That workout"}
        </h1>

        <Card className={TRAINING_CARD} data-testid="workout-receipt">
          <CardContent className={TRAINING_CARD_BODY}>
            <ReceiptBody summary={summary} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      {/* "—", not 0: a figure that could not be read is not a figure of zero. */}
      <p className="text-lg font-semibold tabular-nums">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
