import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getFieldReportTemplates } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const templates = await getFieldReportTemplates(auth.userId)

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error getting field report templates:", error)
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    )
  }
}
