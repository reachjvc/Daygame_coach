/** Save a reframe: a new one, or an edit of one by its id. Only the new sentence is required (Q9). */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { saveReframe, ThoughtNotFound } from "@/src/db/thoughtsRepo"
import { checkReframeInput } from "@/src/thoughts/thoughtsService"

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const checked = checkReframeInput(await req.json().catch(() => null))
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

  try {
    return NextResponse.json({ reframe: await saveReframe(auth.userId, checked.value) })
  } catch (error) {
    if (error instanceof ThoughtNotFound) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error("[thoughts] reframe save failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not save the reframe" }, { status: 500 })
  }
}
