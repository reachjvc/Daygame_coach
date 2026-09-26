import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { finishWorkout } from "@/src/db/workoutRepo"
import { FinishWorkoutSchema } from "@/src/programs/schemas"
import { workoutErrorResponse } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/**
 * Close it and move the weights, in one transaction. A second call is refused
 * rather than advancing the program twice.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = FinishWorkoutSchema.safeParse(await request.json())
    // The first problem in plain words. A blanket "could not finish that
    // workout" is what a 10-hour-plus duration used to produce, with nothing
    // saying the end time was the thing to change.
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Could not finish that workout", 400)
    return NextResponse.json(await finishWorkout(auth.userId, id, parsed.data))
  } catch (e) {
    console.error("finish workout:", e)
    /**
     * 409 for all of it, and the BODY says which.
     *
     * This used to pick 404 by matching the sentence "That workout no longer
     * exists." — a status decided by prose, which broke the moment the sentence
     * changed. That case is a `WorkoutGone` now, and `errorBody` gives it
     * `code: "workout_gone"`, which is what the live screen reads. Everything
     * else here is a refusal the person can act on ("A workout cannot end
     * before it started", "Your program moved on"), and 409 is what a refusal
     * is: the request was fine, the state of the account said no.
     */
    const answer = workoutErrorResponse(e, 409)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
