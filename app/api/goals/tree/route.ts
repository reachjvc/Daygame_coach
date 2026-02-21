import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalTree, syncLinkedGoals, resetDailyGoals, resetWeeklyGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true"

  try {
    const tz = await getUserTimezone(auth.userId)
    // Auto-reset daily/weekly goals if needed (snapshots + streak logic, idempotent via period_start_date check)
    await resetDailyGoals(auth.userId, tz).catch(() => {})
    await resetWeeklyGoals(auth.userId, tz).catch(() => {})
    // Sync linked goals before returning tree to ensure fresh data
    await syncLinkedGoals(auth.userId, tz).catch((e) => console.error("syncLinkedGoals failed:", e))
    const tree = await getGoalTree(auth.userId, includeArchived, tz)
    return NextResponse.json(tree)
  } catch (error) {
    console.error("Error getting goal tree:", error)
    return NextResponse.json({ error: "Failed to get goal tree" }, { status: 500 })
  }
}
