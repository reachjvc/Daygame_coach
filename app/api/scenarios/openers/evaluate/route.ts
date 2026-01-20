import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient } from "@/src/db/server"
import { hasPurchased } from "@/src/db/profilesRepo"
import { scenariosService } from "@/src/scenarios/scenariosService"

const RequestSchema = z.object({
  opener: z.string().trim().min(1).max(280),
  encounter: z.unknown(),
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

  const result = await scenariosService.evaluateOpenerResponse(parsed.data, user.id)

  return NextResponse.json(result, { status: 200 })
}
