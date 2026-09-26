import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { aggregateDailyReviewsForWeek } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end) {
    return NextResponse.json({ error: "start and end params required" }, { status: 400 })
  }

  const summary = await aggregateDailyReviewsForWeek(auth.userId, start, end)
  return NextResponse.json(summary)
}
