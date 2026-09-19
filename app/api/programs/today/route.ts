import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getTrainingDoorFacts } from "@/src/db/trainingDoorRepo"

/**
 * ONE REQUEST FOR THE TRACKING CARD.
 *
 * It used to make three, in sequence, from the browser — so the card arrived
 * in instalments and flipped from Start to Resume in front of you when the
 * last one landed.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await getTrainingDoorFacts(auth.userId))
  } catch (e) {
    console.error("training door:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
