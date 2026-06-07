import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { saveFrameworkPlan, getFrameworkPlanGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { buildFrameworkPlanInserts, parseFrameworkPlan } from "@/src/goals/goalsService"
import { NewGoalsPlanSchema } from "@/src/db/goalSchemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(parseFrameworkPlan(await getFrameworkPlanGoals(auth.userId)))
  } catch (e) { console.error("Error loading goal plan:", e); return err("Failed to load plan") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = NewGoalsPlanSchema.safeParse(await request.json())
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    const inserts = buildFrameworkPlanInserts(parsed.data)
    if (inserts.length === 0) return err("Nothing to save — select at least one goal", 400)
    const tz = await getUserTimezone(auth.userId)
    const created = await saveFrameworkPlan(auth.userId, inserts, tz)
    return NextResponse.json({ saved: created.length }, { status: 201 })
  } catch (e) { console.error("Error saving goal plan:", e); return err(e instanceof Error ? e.message : "Failed to save plan") }
}
