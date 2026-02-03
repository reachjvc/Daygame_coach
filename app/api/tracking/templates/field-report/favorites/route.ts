import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getFavoriteTemplateIds, addFavoriteTemplate, removeFavoriteTemplate } from "@/src/tracking/trackingService"
import { FavoriteActionSchema } from "@/src/tracking/schemas"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const favoriteIds = await getFavoriteTemplateIds(user.id)
    return NextResponse.json({ favoriteIds })
  } catch (error) {
    console.error("Error getting favorite templates:", error)
    return NextResponse.json({ error: "Failed to get favorite templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = FavoriteActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const { templateId, action } = parsed.data
    const favoriteIds = action === "add"
      ? await addFavoriteTemplate(user.id, templateId)
      : await removeFavoriteTemplate(user.id, templateId)

    return NextResponse.json({ favoriteIds })
  } catch (error) {
    console.error("Error updating favorite templates:", error)
    const message = error instanceof Error ? error.message : "Failed to update favorite templates"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
