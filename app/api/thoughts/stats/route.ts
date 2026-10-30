/** The Frequencies tab's numbers, counted in the database in the person's own day and hours. */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { readFrequencyStats } from "@/src/db/thoughtsRepo"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const timezone = await getUserTimezone(auth.userId)
    return NextResponse.json(await readFrequencyStats(timezone))
  } catch (error) {
    console.error("[thoughts] stats failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not count your thoughts" }, { status: 500 })
  }
}
