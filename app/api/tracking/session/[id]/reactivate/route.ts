import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getSession, reactivateSession, getActiveSession } from "@/src/tracking/trackingService"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const session = await getSession(id)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (session.is_active) {
      return NextResponse.json({ error: "Session is already active" }, { status: 400 })
    }

    // Check if user already has an active session
    const existingActive = await getActiveSession(user.id)
    if (existingActive) {
      return NextResponse.json(
        { error: "You already have an active session. End it first before reactivating this one." },
        { status: 400 }
      )
    }

    const reactivated = await reactivateSession(id)

    return NextResponse.json({
      session: reactivated,
      approaches: reactivated.approaches,
    })
  } catch (error) {
    console.error("Error reactivating session:", error)
    return NextResponse.json(
      { error: "Failed to reactivate session" },
      { status: 500 }
    )
  }
}
