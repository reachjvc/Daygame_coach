import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getSessionIntentionSuggestions } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const suggestions = await getSessionIntentionSuggestions(user.id)

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error getting session suggestions:", error)
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    )
  }
}
