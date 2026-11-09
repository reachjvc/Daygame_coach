/**
 * THE AUDIT PAGE'S ONE READ (Plans/energy-audit.md, Phase 4).
 *
 * GET ?from&to&run → { run, runs, slots, timeEntries, suggestions, timezone }
 *   run          the open audit, or null
 *   runs         every audit, newest first
 *   slots        the answers of `?run=<id>` when given, else of the open audit
 *   timeEntries  Time's entries overlapping [from, to), for pre-filling; by
 *                default the open audit's start until now. At most 31 days.
 *   suggestions  the activities written most often, across every audit
 *
 * Errors are logged as a fixed tag plus the database's message, never
 * anything the person wrote.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { frequentActivities, readOpenRun, readRuns, readSlots } from "@/src/db/auditRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { readTimeEntriesBetween } from "@/src/db/timetrackRangeRepo"
import { isUuid } from "@/src/shared/ids"

const MAX_SPAN_MS = 31 * 24 * 60 * 60_000

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const url = new URL(req.url)
  const now = new Date()
  const runParam = url.searchParams.get("run")
  if (runParam !== null && !isUuid(runParam)) return NextResponse.json({ error: "No such audit" }, { status: 400 })

  try {
    const [run, runs, suggestions, timezone] = await Promise.all([
      readOpenRun(auth.userId, now),
      readRuns(auth.userId),
      frequentActivities(auth.userId, 200),
      getUserTimezone(auth.userId).catch(() => "UTC"),
    ])
    const shown = runParam ? runs.find((r) => r.id === runParam) ?? null : run
    if (runParam && !shown) return NextResponse.json({ error: "No such audit" }, { status: 404 })

    const fromParam = url.searchParams.get("from")
    const toParam = url.searchParams.get("to")
    let from = fromParam ? Date.parse(fromParam) : run ? Date.parse(run.startedAt) : NaN
    let to = toParam ? Date.parse(toParam) : now.getTime()
    if ((fromParam && !Number.isFinite(from)) || (toParam && !Number.isFinite(to))) {
      return NextResponse.json({ error: "from and to are times" }, { status: 400 })
    }
    if (Number.isFinite(from) && to - from > MAX_SPAN_MS) from = to - MAX_SPAN_MS
    if (to < from) to = from

    const [slots, timeEntries] = await Promise.all([
      shown ? readSlots(auth.userId, shown.id) : Promise.resolve([]),
      Number.isFinite(from) ? readTimeEntriesBetween(auth.userId, new Date(from).toISOString(), new Date(to).toISOString()) : Promise.resolve([]),
    ])
    return NextResponse.json({ run, runs, slots, timeEntries, suggestions, timezone, now: now.toISOString() })
  } catch (error) {
    console.error("[audit] read failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not read your audit" }, { status: 500 })
  }
}
