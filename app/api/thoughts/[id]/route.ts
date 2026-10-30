/**
 * One thought: reword, pin, archive (PATCH) or delete with its whole history
 * (DELETE, only ever from the person's own confirm). Plans/thought.md, Q18.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteThought, ThoughtNotFound, ThoughtWordingTaken, updateThought, type ThoughtPatch } from "@/src/db/thoughtsRepo"
import { checkThoughtText, isUuid } from "@/src/thoughts/thoughtsService"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such thought" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a change" }, { status: 400 })
  const patch: ThoughtPatch = {}
  if (body.text !== undefined) {
    const text = checkThoughtText(body.text)
    if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 })
    patch.text = text.value
  }
  if (body.pinned !== undefined) {
    if (typeof body.pinned !== "boolean") return NextResponse.json({ error: "Pinned is yes or no" }, { status: 400 })
    patch.pinned = body.pinned
  }
  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") return NextResponse.json({ error: "Archived is yes or no" }, { status: 400 })
    patch.archived = body.archived
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Send a change" }, { status: 400 })

  try {
    await updateThought(auth.userId, id, patch)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ThoughtNotFound) return NextResponse.json({ error: error.message }, { status: 404 })
    if (error instanceof ThoughtWordingTaken) {
      return NextResponse.json({ error: error.message, existingId: error.existingId }, { status: 409 })
    }
    console.error("[thoughts] change failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not change the thought" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: "No such thought" }, { status: 404 })

  try {
    await deleteThought(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ThoughtNotFound) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error("[thoughts] delete failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not delete the thought" }, { status: 500 })
  }
}
