import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { createApproach, getUserApproaches } from "@/src/tracking/trackingService"
import { CreateApproachSchema } from "@/src/tracking/schemas"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateApproachSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { session_id, outcome, set_type, tags, mood, note, latitude, longitude, timestamp, voice_note_url } = parsed.data

    const approach = await createApproach({
      user_id: user.id,
      session_id: session_id ?? undefined,
      timestamp: timestamp ?? undefined,
      outcome: outcome ?? undefined,
      set_type: set_type ?? undefined,
      tags: tags ?? undefined,
      mood: mood ?? undefined,
      note: note ?? undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      voice_note_url: voice_note_url ?? undefined,
    })

    return NextResponse.json(approach)
  } catch (error) {
    console.error("Error creating approach:", error)
    return NextResponse.json(
      { error: "Failed to create approach" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const approaches = await getUserApproaches(user.id, limit, offset)

    return NextResponse.json(approaches)
  } catch (error) {
    console.error("Error getting approaches:", error)
    return NextResponse.json(
      { error: "Failed to get approaches" },
      { status: 500 }
    )
  }
}
