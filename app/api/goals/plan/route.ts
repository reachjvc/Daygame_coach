import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { saveFrameworkPlan, getFrameworkPlanGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { buildFrameworkPlanInserts, parseFrameworkPlan } from "@/src/goals/goalsService"
import { ensureEnrollment, listActiveSelections } from "@/src/db/programRepo"
import { NewGoalsPlanSchema } from "@/src/db/goalSchemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const plan = parseFrameworkPlan(await getFrameworkPlanGoals(auth.userId))
    const programSelections = await listActiveSelections(auth.userId)
    return NextResponse.json({ ...plan, programSelections })
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
    // Idempotently enroll in attached programs (no-op if already enrolled → preserves progress).
    // THE ENROLLMENTS COME BACK. This used to discard them, so a program started
    // here was the one of three entry points that left the Life Mastery plan
    // claiming whatever it claimed before — the plan and the database asserting
    // different things with no way to disagree out loud.
    const enrolled = []
    for (const sel of parsed.data.programSelections ?? []) {
      const { enrollment } = await ensureEnrollment(auth.userId, sel)
      enrolled.push({
        programId: enrollment.program_id,
        enrollmentId: enrollment.id,
        startedAt: enrollment.started_at,
      })
    }
    return NextResponse.json({ saved: created.length, enrolled }, { status: 201 })
  } catch (e) { console.error("Error saving goal plan:", e); return err(e instanceof Error ? e.message : "Failed to save plan") }
}
