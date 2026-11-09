/**
 * DELETE ONE ANSWER. Deleting one that is already gone (or never was this
 * person's) answers 200 as well, so a phone's queued delete can be resent.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteSlot } from "@/src/db/auditRepo"
import { isUuid } from "@/src/shared/ids"

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such answer" }, { status: 400 })
  try {
    await deleteSlot(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[audit] delete failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not delete the answer" }, { status: 500 })
  }
}
