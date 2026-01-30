import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { createSession, getUserSessions } from "@/src/tracking/trackingService"
import { CreateSessionSchema } from "@/src/tracking/schemas"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      goal,
      primary_location,
      session_focus,
      technique_focus,
      if_then_plan,
      custom_intention,
      pre_session_mood,
    } = parsed.data

    const session = await createSession({
      user_id: user.id,
      goal: goal ?? undefined,
      primary_location: primary_location ?? undefined,
      session_focus: session_focus ?? undefined,
      technique_focus: technique_focus ?? undefined,
      if_then_plan: if_then_plan ?? undefined,
      custom_intention: custom_intention ?? undefined,
      pre_session_mood: pre_session_mood ?? undefined,
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
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
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const sessions = await getUserSessions(user.id, limit, offset)

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Error getting sessions:", error)
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    )
  }
}
