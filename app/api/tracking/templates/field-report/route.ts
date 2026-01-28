import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getFieldReportTemplates } from "@/src/db/trackingRepo"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templates = await getFieldReportTemplates(user.id)

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error getting field report templates:", error)
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    )
  }
}
