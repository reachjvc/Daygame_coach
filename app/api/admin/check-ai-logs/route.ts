import { NextResponse } from "next/server"
import { getDetailedLogs } from "@/src/api_ai/apiAiRepo"

/**
 * GET /api/admin/check-ai-logs
 *
 * Get AI usage logs with pagination and filtering.
 * Query params: limit, offset, feature, days, user_id
 * Requires X-Admin-Key header.
 */
export async function GET(req: Request) {
  const adminKey = req.headers.get("X-Admin-Key")
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get("limit") || "100")
    const offset = parseInt(url.searchParams.get("offset") || "0")
    const feature = url.searchParams.get("feature") || undefined
    const days = parseInt(url.searchParams.get("days") || "30")
    const userId = url.searchParams.get("user_id") || undefined

    const { logs, total } = await getDetailedLogs({ limit, offset, feature, days, userId })

    return NextResponse.json({ logs, total, limit, offset })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
