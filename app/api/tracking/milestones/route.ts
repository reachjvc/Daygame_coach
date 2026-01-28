import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getUserMilestones } from "@/src/db/trackingRepo"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const milestones = await getUserMilestones(user.id)

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error getting milestones:", error)
    return NextResponse.json(
      { error: "Failed to get milestones" },
      { status: 500 }
    )
  }
}
