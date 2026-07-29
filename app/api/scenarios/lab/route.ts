import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { LabRequestSchema } from "@/src/scenarios/schemas"
import { startLabSession, labRespond, labDebrief } from "@/src/scenarios/scenarioLabService"

/**
 * POST /api/scenarios/lab — corpus-grounded Scenario Lab (test-page beta).
 * Actions: start | respond | debrief. LLM via Claude CLI headless.
 * Fail-closed: LLM/dataset failure → explicit 502, never a fallback.
 */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const parsed = LabRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  const req = parsed.data
  try {
    if (req.action === "start") return NextResponse.json(await startLabSession(req.kind, req.seed))
    if (req.action === "respond")
      return NextResponse.json(await labRespond(req.kind, req.momentId, req.history, req.message))
    return NextResponse.json(await labDebrief(req.kind, req.momentId, req.history))
  } catch (e) {
    console.error("scenario-lab failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lab request failed" }, { status: 502 })
  }
}
