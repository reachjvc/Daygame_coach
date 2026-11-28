import { NextResponse } from "next/server"

import { requirePremium } from "@/src/db/auth"
import { handleChatMessage, persistScenarioAttempt } from "@/src/scenarios"
import { ChatRequestSchema } from "@/src/scenarios/schemas"
import { aiCapReachedResponse } from "@/src/api_ai/capResponse"

export async function POST(req: Request) {
  const auth = await requirePremium()
  if (!auth.success) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  let response: Awaited<ReturnType<typeof handleChatMessage>>
  try {
    response = await handleChatMessage(parsed.data, auth.userId)
  } catch (e) {
    const capped = aiCapReachedResponse(e)
    if (capped) return capped
    throw e
  }

  // Fire-and-forget: persist on milestone evaluations only (every 5th turn).
  // This counts "sessions" not "turns" — one row per meaningful checkpoint.
  if (response.milestoneEvaluation) {
    void persistScenarioAttempt(auth.userId, parsed.data.scenario_type, response.milestoneEvaluation, response.archetype)
  }

  return NextResponse.json(response, { status: 200 })
}
