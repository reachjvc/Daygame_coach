import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalById, getChildGoals } from "@/src/db/goalRepo"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    const parent = await getGoalById(auth.userId, id)
    if (!parent) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const children = await getChildGoals(auth.userId, id)
    return NextResponse.json(children)
  } catch (error) {
    console.error("Error getting child goals:", error)
    return NextResponse.json({ error: "Failed to get child goals" }, { status: 500 })
  }
}
