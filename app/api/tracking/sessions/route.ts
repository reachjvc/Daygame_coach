import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getSessionSummaries } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    const sessions = await getSessionSummaries(auth.userId, limit)

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Error getting session summaries:", error)
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    )
  }
}
