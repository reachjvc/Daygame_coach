import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { listDrafts, createDraft } from "@/src/db/programDraftRepo"
import { CreateDraftSchema } from "@/src/programs/schemas"
import type { ProgramSchedule } from "@/src/programs/types"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Every training week this person has saved, most recently touched first. */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await listDrafts(auth.userId))
  } catch (e) {
    console.error("list drafts:", e)
    return err("Failed to load your saved weeks")
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = CreateDraftSchema.safeParse(await request.json())
    // The message is the first problem in plain words, not a Zod dump: this is
    // shown to somebody who has just tried to save their training week.
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "That week could not be saved", 400)
    const { schedule, ...rest } = parsed.data
    const draft = await createDraft(auth.userId, { ...rest, schedule: schedule as ProgramSchedule })
    return NextResponse.json(draft, { status: 201 })
  } catch (e) {
    console.error("create draft:", e)
    return err((e as Error).message, 409)
  }
}
