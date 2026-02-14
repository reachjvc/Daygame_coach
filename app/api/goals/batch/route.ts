import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createGoalBatch } from "@/src/db/goalRepo"

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { goals } = await request.json()
    if (!Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: "goals array required" }, { status: 400 })
    }
    if (goals.length > 50) {
      return NextResponse.json({ error: "Max 50 goals per batch" }, { status: 400 })
    }
    for (const g of goals) {
      if (!g.title || !g._tempId) {
        return NextResponse.json({ error: "Each goal needs title and _tempId" }, { status: 400 })
      }
    }
    const created = await createGoalBatch(auth.userId, goals)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error batch creating goals:", error)
    return NextResponse.json({ error: "Failed to batch create goals" }, { status: 500 })
  }
}
