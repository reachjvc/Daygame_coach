import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { finishWorkout } from "@/src/db/workoutRepo"
import { FinishWorkoutSchema } from "@/src/programs/schemas"

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
  } catch (e) { console.error("finish workout:", e); return err((e as Error).message, 409) }
}
