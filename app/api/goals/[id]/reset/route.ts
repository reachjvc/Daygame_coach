import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { resetGoalPeriod } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const tz = await getUserTimezone(auth.userId)
    const goal = await resetGoalPeriod(auth.userId, id, tz)
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error resetting goal period:", error)
    return NextResponse.json(
      { error: "Failed to reset goal period" },
      { status: 500 }
    )
  }
}
