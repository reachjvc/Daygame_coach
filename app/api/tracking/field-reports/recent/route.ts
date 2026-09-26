import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getMostRecentlyUsedTemplateId } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const templateId = await getMostRecentlyUsedTemplateId(auth.userId)

    return NextResponse.json({ templateId })
  } catch (error) {
    console.error("Error getting recently used template:", error)
    return NextResponse.json(
      { error: "Failed to get recently used template" },
      { status: 500 }
    )
  }
}
