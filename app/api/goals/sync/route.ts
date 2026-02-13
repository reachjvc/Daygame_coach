import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { syncLinkedGoals } from "@/src/db/goalRepo"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const synced = await syncLinkedGoals(auth.userId)
    return NextResponse.json({ synced })
  } catch (error) {
    console.error("Error syncing linked goals:", error)
    return NextResponse.json({ error: "Failed to sync goals" }, { status: 500 })
  }
}
