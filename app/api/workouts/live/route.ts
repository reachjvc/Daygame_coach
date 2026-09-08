import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getLiveWorkout } from "@/src/db/workoutRepo"

/** The workout in progress, or null. At most one per person. */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await getLiveWorkout(auth.userId))
  } catch (e) {
    console.error("live workout:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
