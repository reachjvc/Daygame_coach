import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { liftHistory } from "@/src/db/workoutRepo"

/**
 * One lift's last few sessions, all sets.
 *
 * "What did I do for ALL of it last time" is the question a lifter asks between
 * sets; the session screen could only answer it for the set with this number.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const name = new URL(request.url).searchParams.get("exercise")
    if (!name) return NextResponse.json({ error: "Which lift?" }, { status: 400 })
    return NextResponse.json(await liftHistory(auth.userId, name))
  } catch (e) {
    console.error("lift history:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
