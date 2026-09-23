/**
 * THE BROWSER'S SIDE OF `/api/black-box`.
 *
 * A module rather than a hook or a component, for the reason `lifePlanClient`
 * next door is one: the architecture test keeps an allowlist of files that may
 * call `fetch`, and that allowlist only ever shrinks.
 *
 * WHAT THIS FILE NEVER DOES IS GUESS. A read that fails returns `undefined` —
 * which is not `null`, and the difference is the whole safety design:
 *
 *   `null`      the account holds no rows
 *   `undefined` nobody knows, because the request did not come back
 *
 * Collapsing the two is how one flaky request turns into an emptied record.
 * `viceSyncService.decideOnLoad` is built on that distinction and cannot
 * protect anything if this file launders it.
 */

import type { ViceRows } from "@/src/db/viceTypes"
import type { BlackBoxRecord } from "../types"
import { recordToRows, rowsToRecord } from "./blackBoxRows"

export interface FetchedRecord {
  /** The account's rows. Null when it holds none at all. */
  record: BlackBoxRecord | null
  /**
   * The instant the server read at, to ask "what changed since" next time.
   *
   * Taken by the route BEFORE its read, so a row written while that read was in
   * flight is re-sent next time rather than falling in the gap. An overlap
   * costs one redundant row; a gap costs a night.
   */
  takenAt: string
}

/**
 * The account's record, or `undefined` when it could not be read.
 *
 * Three outcomes and they are all different: rows, no rows, or no answer.
 */
export async function fetchBlackBox(since: string | null): Promise<FetchedRecord | undefined> {
  try {
    const url = since === null ? "/api/black-box" : `/api/black-box?since=${encodeURIComponent(since)}`
    const res = await fetch(url)
    if (!res.ok) return undefined
    const body = (await res.json()) as { rows?: ViceRows; takenAt?: string }
    if (!body.rows || typeof body.takenAt !== "string") return undefined

    const record = rowsToRecord(body.rows)
    // NULL ONLY ON A FULL READ. A delta that comes back empty means "nothing
    // changed since you last asked", which is the ordinary quiet case — reading
    // it as "the account holds nothing" would hand `decideOnLoad` the one input
    // that makes it treat a full account as a new one.
    const holdsNothing = since === null && record.attempts.length === 0 && record.reports.length === 0
    return { record: holdsNothing ? null : record, takenAt: body.takenAt }
  } catch {
    return undefined
  }
}

/**
 * Send the rows this device has changed.
 *
 * Returns whether they landed. A false is never treated as "saved anyway": the
 * watermark only moves on a true, so anything that did not land is sent again
 * next time rather than being quietly forgotten.
 */
export async function pushBlackBox(record: BlackBoxRecord): Promise<boolean> {
  if (record.attempts.length === 0 && record.reports.length === 0) return true
  try {
    const res = await fetch("/api/black-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: recordToRows(record) }),
    })
    return res.ok
  } catch {
    return false
  }
}
