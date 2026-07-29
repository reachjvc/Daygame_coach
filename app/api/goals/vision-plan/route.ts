import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { VisionPlanRequestSchema, buildGoalGenPrompt, parseGoalGenResponse } from "@/src/goals/visionPlanService"
import { queryVisionClaude } from "@/src/goals/visionPlanClaude"

const err = (msg: string, s: number) => NextResponse.json({ error: msg }, { status: s })

/**
 * POST /api/goals/vision-plan — turn a vision + its embedding-derived intents
 * into framework-grounded goal drafts via the Claude CLI (test-page beta).
 * Fail-closed: LLM failure or invalid output → explicit 502, never a fallback.
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const parsed = VisionPlanRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  try {
    const raw = await queryVisionClaude(buildGoalGenPrompt(parsed.data))
    return NextResponse.json({ goals: parseGoalGenResponse(raw) })
  } catch (e) {
    console.error("vision-plan goal generation failed:", e)
    return err(e instanceof Error ? e.message : "Goal generation failed", 502)
  }
}
