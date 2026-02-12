import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getUserMilestones } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const milestones = await getUserMilestones(user.id, limit)

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error getting milestones:", error)
    return NextResponse.json(
      { error: "Failed to get milestones" },
      { status: 500 }
    )
  }
}
