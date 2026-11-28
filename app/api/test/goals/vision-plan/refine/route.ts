import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { VisionRefineRequestSchema, buildGoalRefinePrompt, parseGoalRefineResponse } from "@/src/goals/visionPlanService"
import { queryVisionClaude } from "@/src/goals/visionPlanClaude"
import { aiCapReachedResponse } from "@/src/api_ai/capResponse"
import type { VisionGoalDraft } from "@/src/goals/types"

const err = (msg: string, s: number) => NextResponse.json({ error: msg }, { status: s })

/**
 * POST /api/test/goals/vision-plan/refine — apply a free-text change request to ONE
 * goal ("one more gym day", "make it calisthenics"). Fail-closed like generate:
 * invalid LLM output → explicit 502, never a silently unchanged goal.
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const parsed = VisionRefineRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  try {
    const goal = parsed.data.goal as unknown as VisionGoalDraft
    const raw = await queryVisionClaude(auth.userId, "refine", buildGoalRefinePrompt(parsed.data.vision, goal, parsed.data.instruction))
    const seed = Math.random().toString(36).slice(2, 8)
    return NextResponse.json({ goal: parseGoalRefineResponse(raw, goal, seed) })
  } catch (e) {
    const capped = aiCapReachedResponse(e)
    if (capped) return capped
    console.error("vision-plan goal refine failed:", e)
    return err("Goal refinement failed", 502)
  }
}
