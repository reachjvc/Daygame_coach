/** Undo one log. Undoing one that is already gone is not an error. */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteLog } from "@/src/db/thoughtsRepo"
import { isUuid } from "@/src/thoughts/thoughtsService"

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ ok: true })

  try {
    await deleteLog(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[thoughts] undo failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not undo" }, { status: 500 })
  }
}
