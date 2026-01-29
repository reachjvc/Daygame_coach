import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getOrCreateUserTrackingStats } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await getOrCreateUserTrackingStats(user.id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error getting stats:", error)
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    )
  }
}
