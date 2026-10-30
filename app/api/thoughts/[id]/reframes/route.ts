/** Every reframe of one thought, newest first, for the thought's own sheet. */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { readReframes } from "@/src/db/thoughtsRepo"
import { isUuid } from "@/src/thoughts/thoughtsService"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such thought" }, { status: 404 })

  try {
    return NextResponse.json({ reframes: await readReframes(auth.userId, id) })
  } catch (error) {
    console.error("[thoughts] reframes read failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not read the reframes" }, { status: 500 })
  }
}
