/**
 * DELETE ONE ANSWER. Deleting one that is already gone (or never was this
 * person's) answers 200 as well, so a phone's queued delete can be resent.
 * `?at=&sentAt=` (the phone's clock): an answer given again after `at`, on
 * another device, is kept.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteSlot } from "@/src/db/auditRepo"
import { isUuid } from "@/src/shared/ids"
import { correctedTime } from "@/src/audit/auditService"
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
    const deleted = await deleteSlot(auth.userId, id, notAfter)
    return NextResponse.json({ ok: true, deleted })
  } catch (error) {
    console.error("[audit] delete failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not delete the answer" }, { status: 500 })
  }
}
