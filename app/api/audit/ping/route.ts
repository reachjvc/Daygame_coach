/**
 * THE PING'S TWO BUTTONS, posted by the service worker (Plans/energy-audit.md,
 * D-BUTTONS). POST { action: "same" | "mute", slotAt, sendId }.
 *
 *   "same"  copies the previous quarter's answer to this one (never its "why")
 *           200 "Saved for 10:00–10:15 (same as before)"
 *           409 "Not saved. Tap to answer." when the previous quarter is
 *               unanswered or this one is already answered
 *   "mute"  mutes the pings for 1 h: 200 "Muted until 11:15"
 *
 * Each answer carries `title` and `body`, which the worker shows as they are.
 * NO ACTIVITY OR "WHY" TEXT EVER APPEARS IN A BODY: the lock screen shows only
 * times.
 *
 * WHO IT LISTENS TO: the signed-in person (`requireAuth`), from a same-origin
 * JSON request only, as Time's Stop button (`app/api/timetrack/stop/route.ts`).
 * It acts only on a ping the server sent this person for exactly this quarter.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { copyPreviousSlot, pingSendMatches, readOpenRun, updateRun } from "@/src/db/auditRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { checkQuarter, muteUntil } from "@/src/audit/auditService"
import { refuseCrossSite } from "@/src/audit/requestGuard"
import { AUDIT_TITLE } from "@/src/audit/pingService"
import { clockLabel, quarterLabel } from "@/src/audit/quarterService"
import { isUuid } from "@/src/shared/ids"

const refused = (status: number) =>
  NextResponse.json({ title: AUDIT_TITLE, body: "Not saved. Tap to answer." }, { status })

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const crossSite = refuseCrossSite(req)
  if (crossSite) return crossSite

  const body = (await req.json().catch(() => null)) as { action?: unknown; slotAt?: unknown; sendId?: unknown } | null
  const action = body?.action
  if ((action !== "same" && action !== "mute") || typeof body?.slotAt !== "string" || !isUuid(body?.sendId)) {
    return NextResponse.json({ error: "Send an action, a quarter and a ping", title: AUDIT_TITLE, body: "Not saved. Tap to answer." }, { status: 400 })
  }

  try {
    const now = new Date()
    const run = await readOpenRun(auth.userId, now)
    if (!run) return refused(409)
    // The quarter rules of an answer (on a quarter, in this run, already started).
    const quarter = checkQuarter(body.slotAt, run, now)
    if ("error" in quarter) return refused(400)
    const slotAt = new Date(quarter.slotMs)
    if (!(await pingSendMatches(auth.userId, body.sendId, run.id, slotAt))) return refused(404)

    const timezone = await getUserTimezone(auth.userId).catch(() => "UTC")
    if (action === "mute") {
      const until = muteUntil("1h", run, now, timezone)!
      await updateRun(auth.userId, run.id, { mutedUntil: until })
      return NextResponse.json({ title: AUDIT_TITLE, body: `Muted until ${clockLabel(until.getTime(), timezone)}` })
    }
    const copied = await copyPreviousSlot(auth.userId, run.id, slotAt, crypto.randomUUID())
    if (!copied) return refused(409)
    return NextResponse.json({ title: AUDIT_TITLE, body: `Saved for ${quarterLabel(slotAt.getTime(), timezone)} (same as before)` })
  } catch (error) {
    console.error("[audit ping] answer failed", error instanceof Error ? error.message : "unknown")
    return refused(500)
  }
}
