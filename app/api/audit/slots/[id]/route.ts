/**
 * DELETE ONE ANSWER. Deleting one that is already gone (or never was this
 * person's) answers 200 as well, so a phone's queued delete can be resent.
 * A JSON body { at, sentAt, seen }. `seen` (the answer as the deleting device
 * drew it): deleted only if it is still that, in the same database step; when
 * another device changed it since, it stays and comes back as `changed`
 * (alpha prove-audit-03). Never in the address: it is his own words, and
 * addresses end up in logs (review of 81f325e9). Without `seen`, `at` and
 * `sentAt` (the phone's clock): an answer given again after `at`, on another
 * device, is kept. Pages from before the body send `?at=&sentAt=`.
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
    const text = await req.text().catch(() => "")
    let body: { at?: unknown; sentAt?: unknown; seen?: unknown } = {}
    if (text.trim() !== "") {
      if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
        return NextResponse.json({ error: "Send JSON" }, { status: 415 })
      }
      try {
        const parsed = JSON.parse(text) as unknown
        body = parsed && typeof parsed === "object" ? (parsed as typeof body) : {}
      } catch {
        return NextResponse.json({ error: "Send JSON" }, { status: 400 })
      }
    }
    const at = typeof body.at === "string" ? body.at : url.searchParams.get("at")
    const sentAt = typeof body.sentAt === "string" ? body.sentAt : url.searchParams.get("sentAt")
    const notAfter = at ? new Date(correctedTime(at, sentAt, new Date())) : undefined
    let seen: ReturnType<typeof checkMark> = null
    if (body.seen !== undefined) {
      seen = checkMark(body.seen)
      if (!seen || seen.id !== id) return NextResponse.json({ error: "Bad earlier answer" }, { status: 400 })
    }
    const result = await deleteSlot(auth.userId, id, { notAfter, ...(seen ? { seen } : {}) })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[audit] delete failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not delete the answer" }, { status: 500 })
  }
}
