/**
 * DELETE ONE ANSWER. Deleting one that is already gone (or never was this
 * person's) answers 200 as well, so a phone's queued delete can be resent.
 * `?seen=` (JSON: the answer as the deleting device drew it): deleted only if
 * it is still that, in the same database step; when another device changed it
 * since, it stays and comes back as `changed` (alpha prove-audit-03).
 * Without `seen`, `?at=&sentAt=` (the phone's clock): an answer given again
 * after `at`, on another device, is kept.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteSlot } from "@/src/db/auditRepo"
import { isUuid } from "@/src/shared/ids"
import { checkMark, correctedTime } from "@/src/audit/auditService"
import { refuseCrossSite } from "@/src/audit/requestGuard"

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const refused = refuseCrossSite(req, { body: false })
  if (refused) return refused
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such answer" }, { status: 400 })
  try {
    const url = new URL(req.url)
    const at = url.searchParams.get("at")
    const notAfter = at ? new Date(correctedTime(at, url.searchParams.get("sentAt"), new Date())) : undefined
    const seenParam = url.searchParams.get("seen")
    let seen: ReturnType<typeof checkMark> = null
    if (seenParam !== null) {
      seen = checkMark((() => {
        try {
          return JSON.parse(seenParam) as unknown
        } catch {
          return null
        }
      })())
      if (!seen || seen.id !== id) return NextResponse.json({ error: "Bad earlier answer" }, { status: 400 })
    }
    const result = await deleteSlot(auth.userId, id, { notAfter, ...(seen ? { seen } : {}) })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[audit] delete failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not delete the answer" }, { status: 500 })
  }
}
