import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getWeeklyReviewSnapshots, getSnapshotsForDateRange, getUserGoals, updateGoal } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { computeWeeklyReviewData, detectAllPhaseTransitions } from "@/src/goals/goalsService"

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const weekStart = req.nextUrl.searchParams.get("week_start")
    if (!weekStart) {
      return NextResponse.json({ error: "week_start is required" }, { status: 400 })
    }

    const tz = await getUserTimezone(auth.userId)

    // Fetch current week snapshots + 8 weeks of history for phase detection
    const historyStart = new Date(weekStart)
    historyStart.setDate(historyStart.getDate() - 56) // 8 weeks back
    const historyStartStr = historyStart.toISOString().split("T")[0]

    const [snapshots, historySnapshots, goals] = await Promise.all([
      getWeeklyReviewSnapshots(auth.userId, weekStart),
      getSnapshotsForDateRange(auth.userId, historyStartStr, weekStart),
      getUserGoals(auth.userId, false, tz),
    ])

    const data = computeWeeklyReviewData(snapshots, goals)

    // Detect phase transitions and persist them
    const transitions = detectAllPhaseTransitions(goals, historySnapshots)
    for (const t of transitions) {
      await updateGoal(auth.userId, t.goalId, { goal_phase: t.newPhase }, tz)
    }
    data.phaseTransitions = transitions

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error computing weekly review data:", error)
    return NextResponse.json({ error: "Failed to compute review data" }, { status: 500 })
  }
}
