/**
 * The Black Box, read and written.
 *
 * GET hands back every row of this account that changed after `?since=`, and
 * the instant the answer was taken at. PUT sends the rows this device has
 * changed. There is no revision and no 409, deliberately: two devices filing
 * two different nights is not a conflict, and refusing one of them would make
 * somebody choose which night to throw away. `viceSyncService` merges row by
 * row instead — see the rules at the top of that file.
 *
 * Nothing here deletes. A removal arrives as a row with `deleted_at` set.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { readViceRows, writeViceRows } from "@/src/db/viceRepo"
import type { ViceAttemptRow, ViceReportRow } from "@/src/db/viceTypes"

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const since = new URL(req.url).searchParams.get("since")
  if (since !== null && Number.isNaN(Date.parse(since))) {
    return NextResponse.json({ error: "since must be an ISO instant" }, { status: 400 })
  }

  try {
    // Taken BEFORE the read, not after. A row written while the read is in
    // flight would otherwise fall between the two and never be sent again,
    // because the next request would ask for changes after an instant it had
    // already passed. An overlap costs one redundant row; a gap costs a night.
    const takenAt = new Date().toISOString()
    const rows = await readViceRows(auth.userId, since)
    return NextResponse.json({ rows, takenAt })
  } catch (error) {
    console.error("[black-box] read failed", error)
    return NextResponse.json({ error: "Could not read your record" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || !body.rows || typeof body.rows !== "object") {
    return NextResponse.json({ error: "Send the rows that changed" }, { status: 400 })
  }
  const attempts = Array.isArray(body.rows.attempts) ? (body.rows.attempts as ViceAttemptRow[]) : []
  const reports = Array.isArray(body.rows.reports) ? (body.rows.reports as ViceReportRow[]) : []
  if (attempts.length === 0 && reports.length === 0) {
    return NextResponse.json({ error: "Send the rows that changed" }, { status: 400 })
  }

  try {
    // The owner is stamped by the repo, from the session — never taken from the
    // body, and never only at the top level.
    await writeViceRows(auth.userId, { attempts, reports })
    return NextResponse.json({ written: attempts.length + reports.length })
  } catch (error) {
    console.error("[black-box] write failed", error)
    return NextResponse.json({ error: "Could not save your record" }, { status: 500 })
  }
}
