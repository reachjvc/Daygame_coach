import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getActiveSession, getSessionApproaches } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await getActiveSession(user.id)

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
