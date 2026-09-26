import { NextResponse } from "next/server"
import { z } from "zod"

import { requirePremium } from "@/src/db/auth"
import { generateOpenerEncounter } from "@/src/scenarios"
import { DifficultyLevelSchema } from "@/src/settings/types"
const EnvironmentSchema = z.enum([
  "any",
  "high-street",
  "mall",
  "coffee-shop",
  "transit",
  "park",
  "gym",
  "campus",
])

const RequestSchema = z.object({
  difficulty: DifficultyLevelSchema,
  environment: EnvironmentSchema,
  includeHint: z.boolean().optional(),
  includeWeather: z.boolean().optional(),
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

  const encounter = await generateOpenerEncounter(parsed.data, auth.userId)

  return NextResponse.json({ encounter }, { status: 200 })
}
