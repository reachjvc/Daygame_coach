import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { syncLinkedGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const tz = await getUserTimezone(auth.userId)
    const synced = await syncLinkedGoals(auth.userId, tz)
    return NextResponse.json({ synced })
  } catch (error) {
    console.error("Error syncing linked goals:", error)
    return NextResponse.json({ error: "Failed to sync goals" }, { status: 500 })
  }
}
