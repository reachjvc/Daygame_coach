import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { createFieldReport, getUserFieldReports, getDraftFieldReports } from "@/src/db/trackingRepo"
import type { FieldReportInsert } from "@/src/db/trackingTypes"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      template_id,
      session_id,
      fields,
      approach_count,
      location,
      tags,
      is_draft = false,
    } = body

    if (!fields || typeof fields !== "object") {
      return NextResponse.json(
        { error: "Fields are required" },
        { status: 400 }
      )
    }

    const reportData: FieldReportInsert = {
      user_id: user.id,
      template_id,
      session_id,
      fields,
      approach_count,
      location,
      tags,
      is_draft,
      reported_at: new Date().toISOString(),
    }

    const report = await createFieldReport(reportData)

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error("Error creating field report:", error)
    return NextResponse.json(
      { error: "Failed to create field report" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const drafts = searchParams.get("drafts") === "true"
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    if (drafts) {
      const reports = await getDraftFieldReports(user.id)
      return NextResponse.json(reports)
    }

    const reports = await getUserFieldReports(user.id, limit, offset)
    return NextResponse.json(reports)
  } catch (error) {
    console.error("Error getting field reports:", error)
    return NextResponse.json(
      { error: "Failed to get field reports" },
      { status: 500 }
    )
  }
}
