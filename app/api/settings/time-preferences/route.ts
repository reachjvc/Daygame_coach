import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getTimePreferences } from "@/src/db/settingsRepo"
import { handleUpdateTimezone } from "@/src/settings/settingsService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const prefs = await getTimePreferences(auth.userId)
    return NextResponse.json(prefs)
  } catch (error) {
    console.error("Error getting time preferences:", error)
    return NextResponse.json({ error: "Failed to get time preferences" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { timezone } = body

    if (timezone !== undefined) {
      await handleUpdateTimezone(auth.userId, timezone)
    }
    // `week_start_day` is deliberately not accepted. Nothing honours it — every
    // period in the app is Monday-based — and a setting that silently does
    // nothing is worse than one that is absent.

    const updated = await getTimePreferences(auth.userId)
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
