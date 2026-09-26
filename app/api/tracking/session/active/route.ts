import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getActiveSession, getSessionApproaches } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const session = await getActiveSession(auth.userId)

    if (!session) {
      return NextResponse.json({ session: null, approaches: [] })
    }

    const approaches = await getSessionApproaches(session.id)

    return NextResponse.json({ session, approaches })
  } catch (error) {
    console.error("Error getting active session:", error)
    return NextResponse.json(
      { error: "Failed to get active session" },
      { status: 500 }
    )
  }
}
