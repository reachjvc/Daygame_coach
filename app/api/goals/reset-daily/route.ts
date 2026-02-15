import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { resetDailyGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const tz = await getUserTimezone(auth.userId)
    const count = await resetDailyGoals(auth.userId, tz)
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("Error resetting daily goals:", error)
    return NextResponse.json(
      { error: "Failed to reset daily goals" },
      { status: 500 }
    )
  }
}
