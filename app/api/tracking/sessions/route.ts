import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getSessionSummaries } from "@/src/db/trackingRepo"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    const sessions = await getSessionSummaries(user.id, limit)

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Error getting session summaries:", error)
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    )
  }
}
