import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { startWorkout, StartRefused } from "@/src/db/workoutRepo"
import { StartWorkoutSchema } from "@/src/programs/schemas"

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
    return err("Could not start the workout.", 500)
  }
}
