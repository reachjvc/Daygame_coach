import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { pullTimetrackRows, pushTimetrackRows, timetrackIsEmpty } from "@/src/db/timetrackRepo"
import type { TimetrackRows } from "@/src/db/timetrackTypes"

/** What changed since `since` (omit it for a full download). */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const since = new URL(request.url).searchParams.get("since")
  try {
    const result = await pullTimetrackRows(auth.userId, since)
    return NextResponse.json({
      ...result,
      userId: auth.userId,
      empty: since ? false : await timetrackIsEmpty(auth.userId),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read your time data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Here is what changed on this device. */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = (await request.json()) as { rows?: Partial<TimetrackRows> }
    if (!body.rows) return NextResponse.json({ error: "Missing rows" }, { status: 400 })
    return NextResponse.json(await pushTimetrackRows(auth.userId, body.rows))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save your time data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
