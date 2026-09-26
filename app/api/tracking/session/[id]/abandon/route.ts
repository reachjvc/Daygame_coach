import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getSession, abandonSession } from "@/src/tracking/trackingService"

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

    const abandonedSession = await abandonSession(id)

    return NextResponse.json(abandonedSession)
  } catch (error) {
    console.error("Error abandoning session:", error)
    return NextResponse.json(
      { error: "Failed to abandon session" },
      { status: 500 }
    )
  }
}
