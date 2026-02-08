import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { reorderGoals } from "@/src/db/goalRepo"

export async function PATCH(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { goalIds } = await request.json()

    if (!Array.isArray(goalIds) || goalIds.length === 0) {
      return NextResponse.json(
        { error: "goalIds must be a non-empty array" },
        { status: 400 }
      )
    }

    await reorderGoals(auth.userId, goalIds)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering goals:", error)
    return NextResponse.json(
      { error: "Failed to reorder goals" },
      { status: 500 }
    )
  }
}
