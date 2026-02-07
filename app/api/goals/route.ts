import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserGoals, getGoalsByCategory, createGoal } from "@/src/db/goalRepo"
import type { UserGoalInsert } from "@/src/db/goalTypes"

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const goals = category
      ? await getGoalsByCategory(auth.userId, category)
      : await getUserGoals(auth.userId)

    return NextResponse.json(goals)
  } catch (error) {
    console.error("Error getting goals:", error)
    return NextResponse.json({ error: "Failed to get goals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body: UserGoalInsert = await request.json()

    if (!body.title || !body.category || !body.target_value) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, target_value" },
        { status: 400 }
      )
    }

    if (body.target_value < 1) {
      return NextResponse.json(
        { error: "Target value must be at least 1" },
        { status: 400 }
      )
    }

    const goal = await createGoal(auth.userId, body)
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("Error creating goal:", error)
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
  }
}
