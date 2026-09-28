import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { TimetrackWriteRefused, pullTimetrackRows, pushTimetrackRows, timetrackIsEmpty } from "@/src/db/timetrackRepo"
import type { TimetrackRows } from "@/src/db/timetrackTypes"

/**
 * The most rows one push may carry, four times what the client batches, so this can
 * only refuse a caller that is not this app. See the POST handler.
 */
const MAX_ROWS_PER_PUSH = 1_600

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

    /**
     * THE BATCH SIZE THE CLIENT PROMISES, ENFORCED WHERE IT MATTERS.
     *
     * `MAX_ROWS_PER_REQUEST = 400` is a constant in `useTimetrackSync`, and the server
     * enforced nothing — so one authenticated request could ask for an unbounded
     * upsert across nineteen tables. Theoretical against Supabase at one user, and a
     * write-amplification vector against our own Postgres after the platform move; the
     * calendar route beside this one has been rate-limited since it was written.
     *
     * The cap is generous on purpose — four times what the client sends — so it can
     * only ever refuse something that is not this app, and a first upload of a large
     * workspace still goes through in its own batches.
     *
     * NOT a rate limit. That needs a number: a first upload of a 5,000-row workspace
     * is thirteen legitimate requests in a few seconds, so the calendar route's 10/60s
     * would break the import it is meant to protect. Left as a decision rather than
     * guessed at.
     */
    const rowCount = Object.values(body.rows).reduce((sum, rows) => sum + (rows?.length ?? 0), 0)
    if (rowCount > MAX_ROWS_PER_PUSH) {
      return NextResponse.json(
        { error: `That is ${rowCount} rows in one request; the most this accepts is ${MAX_ROWS_PER_PUSH}.` },
        { status: 413 },
      )
    }

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
