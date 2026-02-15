import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalById, updateGoal, archiveGoal, deleteGoal } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import type { UserGoalUpdate } from "@/src/db/goalTypes"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const tz = await getUserTimezone(auth.userId)
    const goal = await getGoalById(auth.userId, (await params).id, tz)
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error getting goal:", error)
    return NextResponse.json({ error: "Failed to get goal" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const body: UserGoalUpdate = await request.json()
    const tz = await getUserTimezone(auth.userId)
    const goal = await updateGoal(auth.userId, (await params).id, body, tz)
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error updating goal:", error)
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const permanent = new URL(request.url).searchParams.get("permanent") === "true"
    permanent ? await deleteGoal(auth.userId, id) : await archiveGoal(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting goal:", error)
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 })
  }
}
