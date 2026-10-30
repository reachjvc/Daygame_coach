/** Merge this thought into another: its logs and reframes move, in one transaction. */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { mergeThoughts, ThoughtNotFound } from "@/src/db/thoughtsRepo"
import { isUuid } from "@/src/thoughts/thoughtsService"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!isUuid(id) || !body || !isUuid(body.into) || body.into === id) {
    return NextResponse.json({ error: "Pick another thought to merge into" }, { status: 400 })
  }

  try {
    await mergeThoughts(id, body.into)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ThoughtNotFound) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error("[thoughts] merge failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not merge" }, { status: 500 })
  }
}
