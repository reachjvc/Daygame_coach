import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createFieldReport, getUserFieldReports, getDraftFieldReports } from "@/src/tracking/trackingService"
import type { FieldReportInsert } from "@/src/tracking/trackingService"
import { CreateFieldReportSchema } from "@/src/tracking/schemas"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const body = await request.json()
    const parsed = CreateFieldReportSchema.safeParse(body)

    if (!parsed.success) {
      console.error("Field report validation failed:", {
        body: JSON.stringify(body, null, 2),
        errors: parsed.error.flatten(),
      })
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      template_id,
      system_template_slug,
      session_id,
      title,
      report_date,
      fields,
      approach_count,
      location,
      tags,
      is_draft,
    } = parsed.data

    const reportData: FieldReportInsert = {
      user_id: auth.userId,
      template_id,
      system_template_slug,
      session_id,
      title,
      fields,
      approach_count,
      location,
      tags,
      is_draft,
      reported_at: report_date || new Date().toISOString(),
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
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const drafts = searchParams.get("drafts") === "true"
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    if (drafts) {
      const reports = await getDraftFieldReports(auth.userId, limit)
      return NextResponse.json(reports)
    }

    const reports = await getUserFieldReports(auth.userId, limit, offset)
    return NextResponse.json(reports)
  } catch (error) {
    console.error("Error getting field reports:", error)
    return NextResponse.json(
      { error: "Failed to get field reports" },
      { status: 500 }
    )
  }
}
