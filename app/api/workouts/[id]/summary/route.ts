import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { summaryFor } from "@/src/db/workoutRepo"

/**
 * What a finished workout was.
 *
 * WHY IT EXISTS. Saving a workout on gym wifi can lose the reply on the way
 * back. The workout is saved; the screen heard nothing, and used to say
 * "Nothing was finished" — a guess, and the wrong one exactly then. It can now
 * ask: is a workout still open (no), and if not, what was this one? 404 means
 * there is no finished workout by that id — it is still running, or it was
 * thrown away on another device.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const summary = await summaryFor(auth.userId, id)
    if (!summary) return NextResponse.json({ error: "That workout was not found." }, { status: 404 })
    return NextResponse.json(summary)
  } catch (e) {
    console.error("workout summary:", e)
    return NextResponse.json({ error: "Could not read that workout." }, { status: 500 })
  }
}
