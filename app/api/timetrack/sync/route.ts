import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { TimetrackWriteRefused, pullTimetrackRows, pushTimetrackRows, timetrackIsEmpty } from "@/src/db/timetrackRepo"
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
    /**
     * A refused row is a 400, not a 500, and it names what was refused.
     *
     * The difference decides what the browser does next: 5xx means try again,
     * 4xx means this will never be accepted — stop, and tell the person which
     * entry to fix. Retrying a refused row is how one bad end time stopped an
     * account saving at all.
     */
    if (error instanceof TimetrackWriteRefused) {
      return NextResponse.json({ error: error.message, table: error.table, ids: error.ids }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Could not save your time data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
