import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getReviewTemplates } from "@/src/db/trackingRepo"
import type { ReviewType } from "@/src/db/trackingTypes"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reviewType = searchParams.get("type") as ReviewType | null

    const templates = await getReviewTemplates(user.id, reviewType || undefined)

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error getting review templates:", error)
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    )
  }
}
