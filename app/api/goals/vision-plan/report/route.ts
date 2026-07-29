import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { VisionReportRequestSchema, buildReportCommentaryPrompt, parseReportCommentary } from "@/src/goals/visionPlanService"
import type { VisionMonthlyReport } from "@/src/goals/visionPlanService"
import { queryVisionClaude } from "@/src/goals/visionPlanClaude"

const err = (msg: string, s: number) => NextResponse.json({ error: msg }, { status: s })

/**
 * POST /api/goals/vision-plan/report — coach commentary on a deterministic
 * Monthly Goals Report (PLM layer). Fail-closed like generate/refine: empty or
 * unusable LLM output → explicit 502, never fabricated commentary.
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const parsed = VisionReportRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  try {
    const report = parsed.data.report as unknown as VisionMonthlyReport
    const raw = await queryVisionClaude(buildReportCommentaryPrompt(parsed.data.vision, report))
    return NextResponse.json({ commentary: parseReportCommentary(raw) })
  } catch (e) {
    console.error("vision-plan report commentary failed:", e)
    return err(e instanceof Error ? e.message : "Report commentary failed", 502)
  }
}
