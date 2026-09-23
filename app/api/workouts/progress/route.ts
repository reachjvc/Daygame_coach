import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getWorkoutLogsWithSets } from "@/src/db/healthRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { progressSnapshot } from "@/src/health/healthService"

/**
 * Everything the Progress tab shows, worked out once, here.
 *
 * The tab used to download a year of workouts with every set attached and do
 * this arithmetic in the browser — and the panel inside it downloaded three
 * years of the same rows again. Two reads of one table for one screen, on a
 * phone, after the screen had already painted.
 *
 * ALL OF IT, not a window: "your bests" means your bests, and a heavier set
 * fourteen months ago is still the best.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const [logs, timezone] = await Promise.all([
      getWorkoutLogsWithSets(auth.userId, "all"),
      getUserTimezone(auth.userId),
    ])
    return NextResponse.json(progressSnapshot(logs, { timezone }))
  } catch (e) {
    /**
     * A 500, and the tab says it could not load. It must not answer with an
     * empty snapshot: "no workouts" and "the read failed" look identical once
     * both are an empty list, and one of them is a claim about somebody's
     * training that is not true.
     */
    console.error("progress snapshot:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
