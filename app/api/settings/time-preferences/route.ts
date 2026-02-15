import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getTimePreferences } from "@/src/db/settingsRepo"
import { handleUpdateTimezone, handleUpdateWeekStartDay } from "@/src/settings/settingsService"

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
    const { timezone, week_start_day } = body

    if (timezone !== undefined) {
      await handleUpdateTimezone(auth.userId, timezone)
    }
    if (week_start_day !== undefined) {
      await handleUpdateWeekStartDay(auth.userId, week_start_day)
    }

    const updated = await getTimePreferences(auth.userId)
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
