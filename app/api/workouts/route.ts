import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { startWorkout, StartRefused } from "@/src/db/workoutRepo"
import { StartWorkoutSchema } from "@/src/programs/schemas"
import { workoutErrorResponse } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Start a workout. Idempotent on `clientKey`, so a retry does not open a second. */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = StartWorkoutSchema.safeParse(await request.json())
    if (!parsed.success) return err("Could not start that workout", 400)
    return NextResponse.json(await startWorkout(auth.userId, parsed.data), { status: 201 })
  } catch (e) {
    /**
     * A REFUSAL IS NOT A CRASH. Every failure used to come back as 409 carrying
     * whatever text was thrown — including the database's "duplicate key value
     * violates unique constraint", printed verbatim on the card. A refusal now
     * names itself, so the browser can act on it (go to the workout that is
     * already open) instead of only showing it; anything else is a bug here and
     * says one sentence.
     */
    if (e instanceof StartRefused) {
      return NextResponse.json(
        { error: e.message, code: e.code, workout: e.workout ?? null },
        { status: e.status }
      )
    }
    console.error("start workout:", e)
    /**
     * AND EVERYTHING ELSE THROUGH THE SHARED HELPER.
     *
     * `startWorkout` reads the open workout first, and that read answers
     * `CouldNotTell` — a 503, because it may work on a retry. This flattened
     * every non-`StartRefused` error to a flat 500 "Could not start the
     * workout", so the one state that says "try again in a moment" arrived as
     * "we are broken". The exemption this route used to hold in the
     * architecture guard is what kept it quiet; there is no exemption now.
     */
    const answer = workoutErrorResponse(e, 500)
    /**
     * A 500 KEEPS THE FIXED SENTENCE. The helper hands back `e.message` for
     * anything it does not recognise, and this route's fallback has always
     * been a written line — handing the browser whatever was thrown would be
     * a step back towards the thing this whole area is being dug out of, for
     * the one case where nobody has written a sentence.
     *
     * 409 and 503 DO carry theirs: those are `errors.ts` classes whose
     * messages exist to be read.
     */
    return answer.status === 500
      ? err("Could not start the workout.", 500)
      : NextResponse.json(answer.body, { status: answer.status })
  }
}
