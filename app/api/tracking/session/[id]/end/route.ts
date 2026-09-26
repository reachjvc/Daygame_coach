import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getSession, endSession } from "@/src/tracking/trackingService"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { id } = await params
    const session = await getSession(id)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.user_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!session.is_active) {
      return NextResponse.json({ error: "Session already ended" }, { status: 400 })
    }

    const endedSession = await endSession(id)

    return NextResponse.json(endedSession)
  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    )
  }
}
