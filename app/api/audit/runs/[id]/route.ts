/**
 * CHANGE ONE AUDIT. PATCH with exactly one of:
 *   { end: true }                         End now (an open audit only)
 *   { mute: "30m"|"1h"|"2h"|"morning"|"off" }
 *   { quietStart, quietEnd }              minutes after midnight, on the quarter
 *   { reviewChange: ReviewChange }        one choice+note, one block, or one block removed,
 *                                         applied to the review as stored (applyReviewChange)
 *   { review: { choices?, notes?, week? } } the review (checkReview); a part left out keeps what is stored.
 *                                         Pages from before reviewChange only: it replaces whole parts.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { AuditRefused, AuditRunNotFound, changeReview, keepRunZone, readRuns, updateRun, type RunPatch } from "@/src/db/auditRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { applyReviewChange, applyReviewParts, checkQuiet, muteUntil, MUTE_OPTIONS, runIsOpen, type MuteOption } from "@/src/audit/auditService"
import { isUuid } from "@/src/shared/ids"
import { refuseCrossSite } from "@/src/audit/requestGuard"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const refused = refuseCrossSite(req)
  if (refused) return refused
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such audit" }, { status: 404 })
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a change" }, { status: 400 })

  try {
    const now = new Date()
    const run = (await readRuns(auth.userId)).find((r) => r.id === id)
    if (!run) return NextResponse.json({ error: "No such audit" }, { status: 404 })

    const patch: RunPatch = {}
    if (body.end === true) {
      if (!runIsOpen(run, now)) return NextResponse.json({ error: "This audit is already over" }, { status: 409 })
      patch.endedAt = now
    } else if (typeof body.mute === "string") {
      if (!(MUTE_OPTIONS as readonly string[]).includes(body.mute)) return NextResponse.json({ error: "Unknown mute" }, { status: 400 })
      if (!runIsOpen(run, now)) return NextResponse.json({ error: "This audit is already over" }, { status: 409 })
      const timezone = await getUserTimezone(auth.userId).catch(() => "UTC")
      patch.mutedUntil = muteUntil(body.mute as MuteOption, run, now, timezone)
    } else if ("quietStart" in body || "quietEnd" in body) {
      const quiet = checkQuiet(body.quietStart, body.quietEnd)
      if ("error" in quiet) return NextResponse.json({ error: quiet.error }, { status: 400 })
      // A finished audit's quiet hours are part of its record (clock audit, 2026-11-09).
      if (!runIsOpen(run, now)) return NextResponse.json({ error: "This audit is already over" }, { status: 409 })
      patch.quietStart = quiet.quietStart
      patch.quietEnd = quiet.quietEnd
    } else if ("reviewChange" in body) {
      // Applied to what is stored now, so a save from another device is never erased (alpha fast-review-01/02).
      const changed = await changeReview(auth.userId, id, (stored) => applyReviewChange(stored, body.reviewChange))
      if ("error" in changed) return NextResponse.json({ error: changed.error }, { status: 400 })
      return NextResponse.json({ run: changed })
    } else if ("review" in body) {
      // A page from before reviewChange: the parts it sends replace what is stored, the rest stays
      // as stored at the moment of writing, with the same check as reviewChange (review 2026-11-09).
      const changed = await changeReview(auth.userId, id, (stored) => applyReviewParts(stored, body.review))
      if ("error" in changed) return NextResponse.json({ error: changed.error }, { status: 400 })
      return NextResponse.json({ run: changed })
    } else {
      return NextResponse.json({ error: "Send a change" }, { status: 400 })
    }

    const changed = await updateRun(auth.userId, id, patch)
    if (patch.endedAt) {
      // Ended now: keep the zone it was lived in (alpha p9-review-01); the page's next read retries a failure.
      const zone = await getUserTimezone(auth.userId).catch(() => null)
      if (zone) changed.zone = await keepRunZone(auth.userId, id, zone).catch(() => changed.zone ?? null)
    }
    return NextResponse.json({ run: changed })
  } catch (error) {
    if (error instanceof AuditRunNotFound) return NextResponse.json({ error: "No such audit" }, { status: 404 })
    if (error instanceof AuditRefused) return NextResponse.json({ error: "The audit could not save that" }, { status: 400 })
    console.error("[audit] change failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not change the audit" }, { status: 500 })
  }
}
