import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { startWorkout } from "@/src/db/workoutRepo"
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
    console.error("start workout:", e)
    return err((e as Error).message, 409)
  }
}
