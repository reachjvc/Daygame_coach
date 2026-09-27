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

import { DISPLAY_LOCALE } from "@/src/shared/dateUtils"
import { Card, CardContent } from "@/components/ui/card"
import { BackLink } from "@/components/BackLink"
import { DEFAULT_SESSION_TYPE, UNIT_CONFIG } from "../config"
import { TRAINING_COLUMN, TRAINING_CARD, TRAINING_CARD_BODY } from "./trainingStyles"
import { describeLoggedSet } from "../programsService"
import { collapseSets, describeSessionRow } from "@/src/health/healthService"
import { PROGRAMS } from "@/src/shared/trainingRoutes"
import type { ReactNode } from "react"
import type { WorkoutSummary } from "../types"

/**
 * THE FIGURES AND THE LISTS — the same ones, wherever they are shown.
 *
 * The finish sheet drew its own version of this and the receipt page drew
 * another: two renderings of one workout, and they had already drifted (the
 * sheet knew about a lost reply, the page did not; the page named the day,
 * the sheet did not). A receipt is a record, so there is one of it.
 */
/** Tailwind cannot take a column count built at runtime, so it is looked up. */
const FIGURE_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
}

export function ReceiptBody({ summary }: { summary: WorkoutSummary }) {
  const unitLabel = UNIT_CONFIG[summary.unit].label
  /**
   * A RUN IS NOT A LIFTING SESSION THAT WENT BADLY.
   *
   * This receipt described every workout by its sets, and a run, a class and a
   * mobility session have none — so a finished 5 km read "Minutes 31 · Sets 0 ·
   * Volume 0" and never said the word "run" anywhere on the page. The two
   * zeroes are the part that matters: they are not missing numbers, they are a
   * frame that says a lifting session where nothing was lifted.
   *
   * The wording is `describeSessionRow`'s, shared with History, so the row you
   * tapped and the page it opens cannot disagree about what the session was.
   */
  const sessionType = summary.sessionType ?? DEFAULT_SESSION_TYPE
  const lifting = sessionType === DEFAULT_SESSION_TYPE
  const figures: Array<{ label: string; value: number | null }> = [
    { label: "Minutes", value: summary.unavailable ? null : summary.durationMin },
  ]
  // A distance the session did not have is left out rather than shown as 0 km.
  if (!lifting && summary.distanceKm !== null && summary.distanceKm !== undefined) {
    figures.push({ label: "km", value: summary.unavailable ? null : summary.distanceKm })
  }
  // On a lifting session "Sets 0" is the truth — a workout somebody opened and
  // logged nothing into. On a run it is noise with a false implication.
  if (lifting || summary.sets > 0) {
    figures.push({ label: "Sets", value: summary.unavailable ? null : summary.sets })
    figures.push({
      label: `Volume (${unitLabel})`,
      value: summary.unavailable ? null : Math.round(summary.volume),
    })
  }

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

      {/* THE WORKOUT SAVED AND THE PROGRAM DID NOT CHANGE. Two facts, and the
          finish only failed at the second one — so this is a note beside a
          successful receipt rather than an error about the workout. Somebody
          who ticked that switch would otherwise find out next Tuesday. */}
      {summary.scheduleNotKept && (
        <p
          data-testid="summary-schedule-not-kept"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
        >
          Saved, but the program could not be changed for next time.
        </p>
      )}

      {!lifting && (
        <p className="text-sm font-medium" data-testid="receipt-session-kind">
          {describeSessionRow(
            { session_type: sessionType, distance_km: summary.distanceKm ?? null },
            { minutes: false }
          )}
        </p>
      )}

      <div className={`grid ${FIGURE_COLUMNS[figures.length] ?? "grid-cols-3"} gap-2 text-center`}>
        {figures.map((figure) => (
          <Figure key={figure.label} label={figure.label} value={figure.value} />
        ))}
      </div>

      {/*
        WHAT YOU WROTE, given back to you. "Anything worth remembering?" is
        asked at the end of every session and was shown on no screen in the
        app — not here, not in History, not in the correction editor, not in
        the CSV. An open question at the most loaded moment of the session,
        and the answer swallowed.
      */}
      {summary.notes?.trim() ? (
        <div data-testid="receipt-note">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">What you noted</p>
          <p className="mt-1 whitespace-pre-line text-sm">{summary.notes.trim()}</p>
        </div>
      ) : null}

      {/*
        WHAT THE SESSION WAS, set by set.
        The receipt carried the totals and what the program does next, and not
        the sets — survivable while the History row unfolded the session in
        place, and a hole the moment that row became a link to this page.
        Identical sets are said once, so the set that DIFFERED is the one that
        stands out; a warm-up is marked, because a five-set session where one
        was a warm-up reads wrong otherwise.
      */}
      {(summary.loggedSets ?? []).length > 0 && (
        <div data-testid="receipt-sets">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">What you did</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {Object.entries(
              (summary.loggedSets ?? []).reduce<Record<string, typeof summary.loggedSets>>(
                (byLift, set) => {
                  byLift[set.exercise] = [...(byLift[set.exercise] ?? []), set]
                  return byLift
                },
                {}
              )
            ).map(([exercise, sets]) => (
              <li key={exercise} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{exercise}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {collapseSets(
                    (sets ?? []).map((set) => ({
                      exercise,
                      weight: set.weightKg,
                      reps: set.reps,
                      kind: set.kind,
                      setNumber: set.setNumber,
                    }))
                  )
                    .map(
                      (run) =>
                        `${describeLoggedSet(
                          { exercise, weightKg: run.weight, reps: run.reps, count: run.count },
                          summary.unit
                        )}${run.kind === "warmup" ? " (W)" : ""}`
                    )
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              <ul className="mt-1 space-y-0.5 text-sm" data-testid="receipt-bests">
                {summary.personalRecords.map((pr) => (
                  <li key={`${pr.exercise}-${pr.reps}`} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{pr.exercise}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {/* One wording for a set, shared with History and
                          Progress: a pull-up best reads "12 reps" rather than
                          "0 kg × 12". The kilogram figure is passed because
                          that is what the rule converts from. */}
                      {describeLoggedSet(
                        { exercise: pr.exercise, weightKg: pr.weight_kg, reps: pr.reps },
                        summary.unit
                      )}
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
              /**
               * THE LIFT'S NAME IS THE POINT OF THE ROW, and it was being
               * squeezed to nothing.
               *
               * `justify-between` with a `shrink-0` reason and a `min-w-0
               * truncate` name means the reason takes what it wants and the
               * name takes the rest — and the reasons here are whole sentences
               * ("Only 1 of 5 sets → same weight next time"). Measured at 390px
               * on Chromium, Firefox and WebKit: the name rendered 0px wide and
               * the page scrolled 219px sideways, on the screen somebody reads
               * straight after training. Three bare reasons and no way to tell
               * which lift each belonged to.
               *
               * Stacked below `sm:`, side by side above it, and the reason may
               * wrap instead of pushing the page.
               */
              <li
                key={c.exerciseId}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="font-medium">{c.name}</span>
                <span className="min-w-0 text-muted-foreground sm:text-right">{c.reason}</span>
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
  heading,
  actions,
}: {
  summary: WorkoutSummary
  /**
   * The heading, already decided. Built by the PAGE, which is a server
   * component and holds the account's timezone: naming the day here would
   * mean this component knowing what "today" is, and the only clock it could
   * ask is the wrong one.
   */
  heading: string
  /**
   * Correct this / Delete, for a receipt somebody has come back to.
   *
   * Passed in rather than rendered here, because the live screen shows this
   * same receipt the moment a workout is saved — and offering to correct a
   * workout you finished four seconds ago, on the screen you finished it on,
   * is a control in the wrong place.
   */
  actions?: ReactNode
}) {
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

        <h1 className="mb-3 text-base font-semibold">{heading}</h1>

        <Card className={TRAINING_CARD} data-testid="workout-receipt">
          <CardContent className={TRAINING_CARD_BODY}>
            <ReceiptBody summary={summary} />
            {actions}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      {/*
        "—", not 0: a figure that could not be read is not a figure of zero.

        GROUPED, like every other screen that shows this number. The receipt
        printed `1600` while History said "1,600 kg" and Progress "1,600" for
        the same workout — `ProgressTab`'s own comment gives the reason
        ("'25293 kg' is a number you have to count the digits of") and this
        was the one place that did not follow it.
      */}
      <p className="text-lg font-semibold tabular-nums">
        {value === null ? "—" : value.toLocaleString(DISPLAY_LOCALE)}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
