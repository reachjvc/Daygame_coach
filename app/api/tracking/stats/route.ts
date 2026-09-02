import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getTrackingStatsForDisplay } from "@/src/tracking/trackingService"

/**
 * The stats row as it should be shown: rolled to the current week, with expired
 * streaks reading 0.
 *
 * `SessionTrackerPage` and `GoalsHubContent` both fetch this and render a fire
 * badge from `current_week_streak`. Doing the corrections in one service
 * function rather than in each of them is the point — two components that each
 * decide when a streak is over will eventually disagree.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(await getTrackingStatsForDisplay(user.id))
  } catch (error) {
    console.error("Error getting stats:", error)
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    )
  }
}
