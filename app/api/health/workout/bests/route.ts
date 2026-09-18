import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { liftBestsAllTime } from "@/src/db/healthRepo"

/**
 * The best you have done on each lift, all time.
 *
 * WHY IT IS A ROUTE. The Progress screen used to work this out in the browser
 * from a 365-day window of workouts it had already loaded, which made "Your
 * bests" mean "your bests this year" — a different answer from the one the
 * finish summary gave for the same set. One definition, one place, and the
 * date on each best is on the account's own calendar rather than the server's.
 *
 * A failure is a failure. It must never come back as an empty list: "you have
 * no bests" to somebody three years into training is a claim, not a blank.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await liftBestsAllTime(auth.userId))
  } catch (e) {
    console.error("lift bests:", e)
    return NextResponse.json({ error: "Could not read your bests." }, { status: 500 })
  }
}
