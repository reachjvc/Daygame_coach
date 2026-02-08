import { NextResponse } from "next/server"
import { getStatsByFeature, getStatsByScenario } from "@/src/api_ai/apiAiRepo"

/**
 * GET /api/admin/api-ai-stats
 *
 * Get aggregated AI usage stats by feature and scenario.
 * Requires X-Admin-Key header.
 */
export async function GET(req: Request) {
  const adminKey = req.headers.get("X-Admin-Key")
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [byFeature, byScenario] = await Promise.all([
      getStatsByFeature(),
      getStatsByScenario(),
    ])

    return NextResponse.json({ by_feature: byFeature, by_scenario: byScenario })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
