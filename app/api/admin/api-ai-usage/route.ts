import { NextResponse } from "next/server"
import { getAllUsersSpendingSummary } from "@/src/api_ai/apiAiService"

/**
 * GET /api/admin/api-ai-usage
 *
 * Admin-only endpoint for viewing all users' AI API usage.
 * Requires X-Admin-Key header matching ADMIN_SECRET_KEY env var.
 *
 * Returns:
 * - total_users: Number of users who have used AI
 * - total_spending_cents: Total spending across all users
 * - users: Array of {user_id, total_cost_cents, total_calls}
 */
export async function GET(req: Request) {
  // Admin authentication via secret key
  const adminKey = req.headers.get("X-Admin-Key")

  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const allUsers = await getAllUsersSpendingSummary()

    // Sort by spending descending (biggest spenders first)
    allUsers.sort((a, b) => b.total_cost_cents - a.total_cost_cents)

    const totalSpending = allUsers.reduce((sum, u) => sum + u.total_cost_cents, 0)

    return NextResponse.json({
      total_users: allUsers.length,
      total_spending_cents: totalSpending,
      total_spending_dollars: totalSpending / 100,
      users: allUsers,
    })
  } catch (error) {
    console.error("Error getting admin AI usage:", error)
    return NextResponse.json({ error: "Failed to get usage" }, { status: 500 })
  }
}
