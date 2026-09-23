import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { lastSetsForLifts } from "@/src/db/workoutRepo"

/**
 * One lift's last few sessions, all sets, in the unit the caller reads in.
 *
 * "What did I do for ALL of it last time" is the question a lifter asks between
 * sets; the session screen could only answer it for the set with this number.
 *
 * THE UNIT IS THE CALLER'S, not kilograms. This returned stored kilograms to a
 * screen labelled in pounds, which is the same class of bug as the weight box
 * on the live screen: a number is meaningless without the unit it was read in,
 * so the answer carries the unit it is in.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const name = params.get("exercise")
    if (!name) return NextResponse.json({ error: "Which lift?" }, { status: 400 })
    const unit = params.get("unit") === "lb" ? "lb" : "kg"
    const libraryId = params.get("libraryId")
    const byLift = await lastSetsForLifts(auth.userId, [{ key: name, name, libraryId }], unit, SESSIONS)
    return NextResponse.json({ unit, sessions: byLift[name] ?? [] })
  } catch (e) {
    console.error("lift history:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/** Five is a month of a twice-a-week lift — enough to see a direction. */
const SESSIONS = 5
