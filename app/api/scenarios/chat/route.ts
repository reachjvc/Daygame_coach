import { NextResponse } from "next/server"

import { requirePremium } from "@/src/db/auth"
import { handleChatMessage, persistScenarioAttempt } from "@/src/scenarios"
import { ChatRequestSchema } from "@/src/scenarios/schemas"

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

  const response = await handleChatMessage(parsed.data, auth.userId)

  // Fire-and-forget: persist on milestone evaluations only (every 5th turn).
  // This counts "sessions" not "turns" — one row per meaningful checkpoint.
  if (response.milestoneEvaluation) {
    void persistScenarioAttempt(
      auth.userId,
      parsed.data.scenario_type,
      parsed.data.message,
      null,
      response.milestoneEvaluation as unknown as Record<string, unknown>
    )
  }

  return NextResponse.json(response, { status: 200 })
}
