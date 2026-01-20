import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient } from "@/src/db/server"
import { hasPurchased } from "@/src/db/profilesRepo"
import { scenariosService } from "@/src/scenarios/scenariosService"

const DifficultySchema = z.enum(["beginner", "intermediate", "advanced", "expert", "master"])
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
  difficulty: DifficultySchema,
  environment: EnvironmentSchema,
  includeHint: z.boolean().optional(),
  includeWeather: z.boolean().optional(),
})

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const premium = await hasPurchased(user.id)
  if (!premium) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 })
  }

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

  const encounter = await scenariosService.generateOpenerEncounter(parsed.data, user.id)

  return NextResponse.json({ encounter }, { status: 200 })
}
