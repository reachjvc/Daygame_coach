import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { incrementGoalProgress } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const amount = typeof body.amount === "number" ? body.amount : 1
    const tz = await getUserTimezone(auth.userId)

    const goal = await incrementGoalProgress(auth.userId, id, amount, tz)
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error incrementing goal:", error)
    return NextResponse.json(
      { error: "Failed to increment goal" },
      { status: 500 }
    )
  }
}
