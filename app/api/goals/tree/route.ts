import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalTree, getUserGoals, archiveGoalsBatch, syncLinkedGoals, resetDailyGoals, resetWeeklyGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getOrphanedGoalIds } from "@/src/goals/goalsService"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true"

  try {
    const tz = await getUserTimezone(auth.userId)
    await resetDailyGoals(auth.userId, tz).catch(() => {})
    await resetWeeklyGoals(auth.userId, tz).catch(() => {})
    await syncLinkedGoals(auth.userId, tz).catch((e) => console.error("syncLinkedGoals failed:", e))

    // Auto-archive goals referencing deleted templates (idempotent)
    const allGoals = await getUserGoals(auth.userId, false, tz)
    const orphanIds = getOrphanedGoalIds(allGoals)
    if (orphanIds.length > 0) {
      const count = await archiveGoalsBatch(auth.userId, orphanIds)
      console.log(`Archived ${count} orphaned goals for user ${auth.userId}`)
    }

    const tree = await getGoalTree(auth.userId, includeArchived, tz)
    return NextResponse.json(tree)
  } catch (error) {
    console.error("Error getting goal tree:", error)
    return NextResponse.json({ error: "Failed to get goal tree" }, { status: 500 })
  }
}
