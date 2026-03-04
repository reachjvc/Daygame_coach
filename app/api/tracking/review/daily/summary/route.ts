import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { aggregateDailyReviewsForWeek } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end) {
    return NextResponse.json({ error: "start and end params required" }, { status: 400 })
  }

  const summary = await aggregateDailyReviewsForWeek(user.id, start, end)
  return NextResponse.json(summary)
}
