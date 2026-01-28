import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getDailyStats } from "@/src/db/trackingRepo"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30", 10)

    const stats = await getDailyStats(user.id, days)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error getting daily stats:", error)
    return NextResponse.json(
      { error: "Failed to get daily stats" },
      { status: 500 }
    )
  }
}
