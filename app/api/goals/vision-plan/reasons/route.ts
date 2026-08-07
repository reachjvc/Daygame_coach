import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { VisionReasonsRequestSchema, buildReasonsPrompt, parseReasonsResponse } from "@/src/goals/visionPlanService"
import { queryVisionClaude } from "@/src/goals/visionPlanClaude"

const err = (msg: string, s: number) => NextResponse.json({ error: msg }, { status: s })

/**
 * POST /api/goals/vision-plan/reasons — expand the 100-reasons drill for ONE
 * goal, written in the user's own voice. Fail-closed like generate/refine:
 * unparseable output or an all-duplicate batch → explicit 502, never a silent
 * empty list that looks like "the button does nothing".
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const parsed = VisionReasonsRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  try {
    const { goalTitle, why, existing, want } = parsed.data
    const raw = await queryVisionClaude(buildReasonsPrompt(goalTitle, why, existing, want))
    return NextResponse.json({ reasons: parseReasonsResponse(raw, existing) })
  } catch (e) {
    console.error("vision-plan reasons expansion failed:", e)
    return err(e instanceof Error ? e.message : "Reason expansion failed", 502)
  }
}
