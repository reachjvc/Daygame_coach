import { NextResponse } from "next/server"
import { testUserLogging } from "@/src/api_ai/apiAiService"

/**
 * POST /api/admin/test-user-logging
 *
 * Test AI usage logging with a specific user ID.
 * Requires X-Admin-Key header and user_id in body.
 */
export async function POST(req: Request) {
  // Admin authentication
  const adminKey = req.headers.get("X-Admin-Key")
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const userId = body.user_id

  if (!userId) {
    return NextResponse.json({ error: "user_id required in body" }, { status: 400 })
  }

  const result = await testUserLogging(userId)

  const statusCode = result.success ? 200 : result.diagnostics.userExists ? 500 : 404

  return NextResponse.json(result, { status: statusCode })
}
