import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { TimetrackWriteRefused, pullTimetrackRows, pushTimetrackRows, timetrackIsEmpty } from "@/src/db/timetrackRepo"
import type { PushBases, TagSets, TimetrackRows } from "@/src/db/timetrackTypes"
import { afterResponse } from "@/src/shared/afterResponse"
import { announceTimerChange, watchTimer } from "@/src/timetrack/runningTimerService"

/**
 * The most rows one push may carry, four times what the client batches, so this can
 * only refuse a caller that is not this app. See the POST handler.
 */
const MAX_ROWS_PER_PUSH = 1_600

function isTagSets(value: unknown): value is TagSets {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  return Object.values(value).every((tags) => Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))
}

/**
 * What changed since `since` (omit it for a full download). `live=1` with no
 * `since`: the account without its deleted rows, answered with `live: true` —
 * see `pullTimetrackRows`.
 */
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const params = new URL(request.url).searchParams
  const since = params.get("since")
  try {
    const result = await pullTimetrackRows(auth.userId, since, { live: params.get("live") === "1" })
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
    const body = (await request.json()) as {
      rows?: Partial<TimetrackRows>
      bases?: PushBases
      tagSets?: TagSets
      account?: unknown
    }
    /**
     * ROWS NAMED FOR ANOTHER ACCOUNT ARE NOT WRITTEN INTO THIS ONE.
     *
     * The session is the browser's, not the page's: a tab opened by one person
     * keeps running after their session ends, and when somebody else signs in
     * on that browser its next upload arrived here as them. Their account took
     * the previous person's entries (a privacy audit, 2026-11-04). The app names
     * the account its queue belongs to; any other is refused, and the page
     * starts again for whoever is signed in now.
     *
     * A versioned write that names no account is a tracker page loaded before
     * this existed: it cannot say whose its queue is, so it is not written. That
     * page says "refused … reload to resync", and after the reload it names its
     * account and its queue goes up. A caller sending neither bases nor an
     * account is a script or a pre-versions app, and is treated as before.
     */
    if (body.account !== undefined && body.account !== auth.userId) {
      return NextResponse.json(
        { error: "These changes belong to another account than the one signed in.", accountChanged: true },
        { status: 409 },
      )
    }
    if (body.bases !== undefined && body.account === undefined) {
      return NextResponse.json(
        { error: "This page is from an older version of the app. Reload it to keep saving; nothing is lost." },
        { status: 409 },
      )
    }
    if (!body.rows) return NextResponse.json({ error: "Missing rows" }, { status: 400 })
    if (body.bases !== undefined && (typeof body.bases !== "object" || body.bases === null || Array.isArray(body.bases))) {
      return NextResponse.json({ error: "bases must be an object of table to row key to version" }, { status: 400 })
    }
    if (body.tagSets !== undefined && !isTagSets(body.tagSets)) {
      return NextResponse.json({ error: "tagSets must be an object of entry id to a list of tag ids" }, { status: 400 })
    }

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
    // a tag set is links in all but name, so it counts against the same cap
    const linkCount = Object.values(body.tagSets ?? {}).reduce((sum, tags) => sum + tags.length, 0)
    if (rowCount + linkCount > MAX_ROWS_PER_PUSH) {
      return NextResponse.json(
        { error: `That is ${rowCount + linkCount} rows in one request; the most this accepts is ${MAX_ROWS_PER_PUSH}.` },
        { status: 413 },
      )
    }

    /**
     * BASES MEAN THE VERSIONED WRITE; NO BASES MEAN THE OLD ONE.
     *
     * The app sends, beside each row, the server version it was based on, and the
     * answer says which rows were written (with their new versions) and which were
     * refused as stale (with the stored copy). See `pushTimetrackRows`. A request
     * without them is an older app or a script, and gets the unchecked upsert it
     * always got.
     */
    const versions = body.bases ? { bases: body.bases, tagSets: body.tagSets ?? {} } : undefined

    /**
     * THE RUNNING TIMER'S NOTIFICATION (Plans/time-tracker-like-toggl.md, Phase 7).
     *
     * Every device's starts and stops arrive here, so this is where a running
     * entry appears or ends. The running entries are read before the write;
     * once the answer has gone they are read again, and a start, stop or switch
     * is pushed to the person's devices that show the timer. In `finally`, so
     * a write refused part way is still looked at: the halves that went
     * through may have stopped a timer. Only a push that carries entries can
     * change one, so nothing else pays for the reads.
     */
    const watched = body.rows.timetrack_entries?.length ? await watchTimer(auth.userId) : null
    try {
      return NextResponse.json(await pushTimetrackRows(auth.userId, body.rows, versions))
    } finally {
      if (watched) afterResponse(() => announceTimerChange(auth.userId, watched))
    }
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
