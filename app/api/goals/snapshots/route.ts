import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalSnapshots, getSnapshotsForDateRange } from "@/src/db/goalRepo"

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const params = req.nextUrl.searchParams
    const goalId = params.get("goal_id")
    const startDate = params.get("start_date")
    const endDate = params.get("end_date")
    const days = params.get("days")

    if (goalId) {
      const snapshots = await getGoalSnapshots(auth.userId, goalId, days ? parseInt(days) : 90)
      return NextResponse.json(snapshots)
    }

    if (startDate && endDate) {
      const snapshots = await getSnapshotsForDateRange(auth.userId, startDate, endDate)
      return NextResponse.json(snapshots)
    }

    return NextResponse.json({ error: "Provide goal_id or start_date+end_date" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching snapshots:", error)
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 })
  }
}
