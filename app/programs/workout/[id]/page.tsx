/**
 * WHAT A WORKOUT WAS, after it is over.
 *
 * Two cards already had a button pointing here — "See today's workout", the
 * honest alternative to a Start button on a day somebody has already trained.
 * The route did not exist, so both buttons were a 404. That is worse than no
 * button: it turns "you trained today" into a dead end.
 *
 * It reads the receipt WRITTEN AT THE TIME, in the same transaction that
 * closed the workout. Recomputing it now would give a different answer once
 * the program has been edited, and no answer at all for anything finished
 * before receipts were stored — so the only honest record of what somebody was
 * told is the one taken when they were told it.
 */

import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/src/db/auth"
import { summaryFor } from "@/src/db/workoutRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { WorkoutReceipt } from "@/src/programs/components/WorkoutReceipt"
import { receiptHeading } from "@/src/programs/programsService"
import { dateKeyLabel, getTodayInTimezone, toDateISO, toZonedDate } from "@/src/shared/dateUtils"
import { WorkoutActions } from "@/src/programs/components/WorkoutActions"

export default async function WorkoutReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  // A page must return a page. `auth.response` is a Response, which is right
  // for a route handler and not a thing this can hand back.
  if (!auth.success) redirect("/auth/login?next=/programs")

  const { id } = await params

  const summary = await summaryFor(auth.userId, id)
  // `summaryFor` returns null for a workout that is not yours or not finished.
  // A workout still open has a screen of its own; sending somebody to a
  // receipt for it would show a session that has not happened yet.
  if (!summary) notFound()
  if (summary.unavailable) redirect("/programs")

  const timezone = await getUserTimezone(auth.userId)

  /**
   * THE DAY, DECIDED HERE, because this is where the account's zone is.
   *
   * The heading used to be `weekdayNameIn(startedAt)` inside the component —
   * "Tue's workout" for a session from March as much as for one from
   * Tuesday. Reached from History that named a day without saying which.
   */
  const startedOn = summary.startedAt
    ? toDateISO(toZonedDate(new Date(summary.startedAt), timezone))
    : null

  /**
   * CORRECT THIS AND DELETE LIVE HERE NOW, not in the History list.
   *
   * A destructive control does not belong beside the row you tap to open a
   * workout — and the editor needed every set of every workout in that list to
   * open one, which is the read that outgrew the database's response limit and
   * left each session quietly missing its later sets.
   */
  return (
    <WorkoutReceipt
      summary={summary}
      heading={receiptHeading(startedOn, getTodayInTimezone(timezone))}
      actions={
        <WorkoutActions
          workoutId={summary.workoutId}
          unit={summary.unit}
          onProgram={Boolean(summary.enrollmentId)}
          setCount={summary.sets}
          /**
           * THE SAME OWNER AS THE HEADING. This built its own date inline from
           * the instant, three lines from `receiptHeading`, which is how the
           * page came to disagree with itself in the first place. `startedOn`
           * is already the account's calendar day and `dateKeyLabel` prints a
           * day key without a second zone getting a vote.
           */
          day={
            startedOn
              ? dateKeyLabel(startedOn, { weekday: "short", day: "numeric", month: "short" })
              : "this workout"
          }
        />
      }
    />
  )
}
