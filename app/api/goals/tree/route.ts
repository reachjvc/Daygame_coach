import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalTree, syncLinkedGoals } from "@/src/db/goalRepo"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    // Sync linked goals before returning tree to ensure fresh data
    await syncLinkedGoals(auth.userId).catch(() => {})
    const tree = await getGoalTree(auth.userId)
    return NextResponse.json(tree)
  } catch (error) {
    console.error("Error getting goal tree:", error)
    return NextResponse.json({ error: "Failed to get goal tree" }, { status: 500 })
  }
}
