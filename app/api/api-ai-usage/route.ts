import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserSpendingSummary } from "@/src/api_ai/apiAiService"

/**
 * GET /api/api-ai-usage
 *
 * Returns user's AI API usage summary including:
 * - Total cost and budget remaining
 * - Total API calls made
 * - Breakdown by feature (keep-it-going, etc.)
 * - Warning level
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const summary = await getUserSpendingSummary(auth.userId)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Error getting AI usage:", error)
    return NextResponse.json({ error: "Failed to get AI usage" }, { status: 500 })
  }
}
