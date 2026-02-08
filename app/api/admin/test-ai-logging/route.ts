import { NextResponse } from "next/server"
import { testLogging } from "@/src/api_ai/apiAiService"

/**
 * GET /api/admin/test-ai-logging
 *
 * Test endpoint to verify AI usage logging is working.
 * Requires X-Admin-Key header.
 */
export async function GET(req: Request) {
  // Admin authentication
  const adminKey = req.headers.get("X-Admin-Key")
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await testLogging()

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  })
}
