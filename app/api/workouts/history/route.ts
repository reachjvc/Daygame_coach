import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { readHistoryMonths } from "@/src/db/healthRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"

/**
 * History, a month at a time, all the way back.
 *
 * `?before=` is the instant the last page ended on, so paging back is the
 * caller handing the server where it got to. `?lift=` narrows both the
 * workouts and the sets, so a filtered month's total is that lift's alone.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const timezone = await getUserTimezone(auth.userId)
    const page = await readHistoryMonths(auth.userId, {
      timezone,
      before: params.get("before") ?? undefined,
      lift: params.get("lift") ?? undefined,
    })
    return NextResponse.json({ timezone, ...page })
  } catch (e) {
    // A 500, never an empty page: "no workouts" and "the read failed" look
    // identical once both are an empty list, and one is a claim about
    // somebody's training that is not true.
    console.error("workout history:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
