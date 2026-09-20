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

  return <WorkoutReceipt summary={summary} timezone={timezone} />
}
