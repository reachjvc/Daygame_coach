import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { generateCandidates, generateFailureReason } from "@/src/goals/northStarGenerateService"

/**
 * Candidate goals and experiences from what somebody wrote.
 *
 * Same two guards as every other AI route here: off in production, and only for
 * the allowlisted accounts. This one costs money per press and takes free text
 * from an unauthenticated page, so both matter.
 */
const ALLOWED_AI_EMAILS = ["reachjvc@gmail.com"]

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "This endpoint is disabled in production" }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !ALLOWED_AI_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Your account is not authorized to use AI features" }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (typeof body?.text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }
    return NextResponse.json(await generateCandidates(body))
  } catch (error) {
    console.error("[north-star-generate]", error)
    // The real reason, classified. "Generation failed" sent somebody round a
    // retry loop while the actual message was "your credit balance is too low"
    // — a thing no amount of pressing the button fixes. The provider's own
    // wording stays in the log: it is written for whoever holds the account,
    // not for whoever is looking at the page.
    return NextResponse.json({ error: "Generation failed", reason: generateFailureReason(error) }, { status: 500 })
  }
}
