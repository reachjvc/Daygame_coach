import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getDailyStats } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30", 10)

    const stats = await getDailyStats(auth.userId, days)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error getting daily stats:", error)
    return NextResponse.json(
      { error: "Failed to get daily stats" },
      { status: 500 }
    )
  }
}
