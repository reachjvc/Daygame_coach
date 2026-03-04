import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createGoalBatch } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { BatchCreateGoalSchema } from "@/src/db/goalSchemas"
import type { UserGoalInsert } from "@/src/db/goalTypes"

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const result = BatchCreateGoalSchema.safeParse(await request.json())
    if (!result.success)
      return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 })
    const tz = await getUserTimezone(auth.userId)
    // Zod refinement guarantees category||life_area; createGoalBatch fills defaults
    const created = await createGoalBatch(auth.userId, result.data.goals as (UserGoalInsert & { _tempId: string; _tempParentId: string | null })[], tz)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error batch creating goals:", error)
    const message = error instanceof Error ? error.message : "Failed to batch create goals"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
