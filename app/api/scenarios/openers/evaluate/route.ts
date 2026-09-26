import { NextResponse } from "next/server"
import { z } from "zod"

import { requirePremium } from "@/src/db/auth"
import { evaluateOpenerAttempt, persistScenarioAttempt } from "@/src/scenarios"

const RequestSchema = z.object({
  opener: z.string().trim().min(1).max(280),
  encounter: z.unknown(),
})

export async function POST(req: Request) {
  const auth = await requirePremium()
  if (!auth.success) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const result = await evaluateOpenerAttempt(parsed.data, auth.userId)

  // Fire-and-forget: persist attempt for badge tracking
  void persistScenarioAttempt(
    auth.userId,
    "practice-openers",
    parsed.data.opener,
    parsed.data.encounter as Record<string, unknown> | null,
    result as unknown as Record<string, unknown>
  )

  return NextResponse.json(result, { status: 200 })
}
