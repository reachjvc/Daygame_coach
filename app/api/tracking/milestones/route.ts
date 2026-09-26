import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserMilestones } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const milestones = await getUserMilestones(auth.userId, limit)

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error getting milestones:", error)
    return NextResponse.json(
      { error: "Failed to get milestones" },
      { status: 500 }
    )
  }
}
