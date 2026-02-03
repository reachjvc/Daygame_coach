import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getMostRecentlyUsedTemplateId } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateId = await getMostRecentlyUsedTemplateId(user.id)

    return NextResponse.json({ templateId })
  } catch (error) {
    console.error("Error getting recently used template:", error)
    return NextResponse.json(
      { error: "Failed to get recently used template" },
      { status: 500 }
    )
  }
}
