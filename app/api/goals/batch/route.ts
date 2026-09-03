import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createGoalBatch, GoalMetricPeriodError } from "@/src/db/goalRepo"
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
    // A goal whose metric measures a different span than its period is a bad
    // request, not a server fault. It came back as a 500 with no explanation,
    // which is how a catalogue that produced such pairs looked like a broken
    // server instead of a wrong template.
    if (error instanceof GoalMetricPeriodError)
      return NextResponse.json({ error: error.message, reason: "metric_period_mismatch" }, { status: 400 })

    console.error("Error batch creating goals:", error)
    const message = error instanceof Error ? error.message : "Failed to batch create goals"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
