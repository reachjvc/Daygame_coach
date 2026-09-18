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
    const { timezone, source } = body

    if (timezone !== undefined) {
      // 'detected' is the browser telling us once, unasked, and is the only
      // value a caller may send; anything else — including a missing one, and
      // including somebody trying "chosen" by hand — is a person choosing,
      // which is the stronger claim and the safe one to record.
      await handleUpdateTimezone(auth.userId, timezone, source === "detected" ? "detected" : "chosen")
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
