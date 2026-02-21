import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserGoals, getGoalsByCategory, getGoalsByLifeArea, createGoal, deleteAllGoals, DuplicateGoalError } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import type { UserGoalInsert } from "@/src/db/goalTypes"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const lifeArea = searchParams.get("life_area")
    const category = searchParams.get("category")
    const tz = await getUserTimezone(auth.userId)
    const goals = lifeArea
      ? await getGoalsByLifeArea(auth.userId, lifeArea, tz)
      : category ? await getGoalsByCategory(auth.userId, category, tz) : await getUserGoals(auth.userId, false, tz)
    return NextResponse.json(goals)
  } catch (e) { console.error("Error getting goals:", e); return err("Failed to get goals") }
}

export async function DELETE() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const count = await deleteAllGoals(auth.userId)
    return NextResponse.json({ success: true, deleted: count })
  } catch (e) { console.error("Error deleting all goals:", e); return err("Failed to delete all goals") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const body: UserGoalInsert = await request.json()
    if (!body.title || (!body.category && !body.life_area) || !body.target_value)
      return err("Missing required fields", 400)
    if (body.target_value < 1) return err("Target value must be at least 1", 400)
    if (body.goal_type && !["recurring", "milestone", "habit_ramp"].includes(body.goal_type))
      return err("Invalid goal_type", 400)
    if (!body.category && body.life_area) body.category = body.life_area
    const tz = await getUserTimezone(auth.userId)
    return NextResponse.json(await createGoal(auth.userId, body, tz), { status: 201 })
  } catch (e) {
    if (e instanceof DuplicateGoalError) {
      return NextResponse.json({ error: "Goal already exists", reason: e.reason, existingGoalId: e.existingGoalId }, { status: 409 })
    }
    console.error("Error creating goal:", e); return err("Failed to create goal")
  }
}
