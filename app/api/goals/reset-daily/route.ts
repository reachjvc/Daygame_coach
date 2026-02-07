import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { resetDailyGoals } from "@/src/db/goalRepo"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const count = await resetDailyGoals(auth.userId)
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("Error resetting daily goals:", error)
    return NextResponse.json(
      { error: "Failed to reset daily goals" },
      { status: 500 }
    )
  }
}
