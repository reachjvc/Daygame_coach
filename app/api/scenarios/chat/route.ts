import { NextResponse } from "next/server"

import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import { handleChatMessage } from "@/src/scenarios"
import { ChatRequestSchema } from "@/src/scenarios/schemas"

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const response = await handleChatMessage(parsed.data, user.id)
  return NextResponse.json(response, { status: 200 })
}
