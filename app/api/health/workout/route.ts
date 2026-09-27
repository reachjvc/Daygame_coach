import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getWorkoutLogs, getWorkoutLogsWithSets, deleteWorkoutLog } from "@/src/db/healthRepo"
import { workoutErrorResponse } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const days = Number(params.get("days") ?? 90)
    const withSets = params.get("include") === "sets"
    return NextResponse.json(await (withSets ? getWorkoutLogsWithSets(auth.userId, days) : getWorkoutLogs(auth.userId, days)))
  } catch (e) { console.error("Error getting workout logs:", e); return err("Failed to get workout logs") }
}

/**
 * THERE IS NO POST HERE ANY MORE.
 *
 * It took a whole workout — its sets, its duration, its intensity — in one
 * call, and it was the second way to record one. The two disagreed: this path
 * read weights as kilograms whatever the account trains in, had its own
 * 90-day personal-best rule, and wrote the workout row before its sets, so a
 * refused set left an empty session counting towards the streak.
 *
 * A workout is recorded by starting one and finishing it: POST /api/workouts,
 * POST /api/workouts/[id]/sets, POST /api/workouts/[id]/finish — the same
 * three calls whether you are in the gym or writing up Tuesday on Thursday.
 * GET and DELETE stay: History reads and deletes through them.
 */

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    // WHAT ACTUALLY HAPPENED. This answered a fixed "Failed to delete workout
    // log" whatever went wrong, and `{ success: true }` whatever went right —
    // so a refused delete and a delete that moved the weights back read the
    // same. `recalculated` says whether a program was moved; the message is the
    // server's own sentence.
    const result = await deleteWorkoutLog(auth.userId, id)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error("Error deleting workout log:", e)
    /**
     * THROUGH THE SHARED HELPER, like every other route that can refuse a
     * workout. This asked `statusFor` for the number and wrote its own body,
     * so it never sent `code: "workout_gone"` — and it is one of the TWO
     * routes that delete a workout, the pair named in
     * `src/db/workoutLifecycle.ts`'s own comment. The guard written to stop
     * this drift scanned `app/api/workouts` and could not see either of them.
     */
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
