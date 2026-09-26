import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getFavoriteTemplateIds, addFavoriteTemplate, removeFavoriteTemplate } from "@/src/tracking/trackingService"
import { FavoriteActionSchema } from "@/src/tracking/schemas"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const favoriteIds = await getFavoriteTemplateIds(auth.userId)
    return NextResponse.json({ favoriteIds })
  } catch (error) {
    console.error("Error getting favorite templates:", error)
    return NextResponse.json({ error: "Failed to get favorite templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const body = await request.json()
    const parsed = FavoriteActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const { templateId, action } = parsed.data
    const favoriteIds = action === "add"
      ? await addFavoriteTemplate(auth.userId, templateId)
      : await removeFavoriteTemplate(auth.userId, templateId)

    return NextResponse.json({ favoriteIds })
  } catch (error) {
    console.error("Error updating favorite templates:", error)
    const message = error instanceof Error ? error.message : "Failed to update favorite templates"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
