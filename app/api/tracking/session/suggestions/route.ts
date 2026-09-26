import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getSessionIntentionSuggestions } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const suggestions = await getSessionIntentionSuggestions(auth.userId)

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error getting session suggestions:", error)
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    )
  }
}
