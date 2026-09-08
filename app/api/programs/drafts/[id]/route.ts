import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getDraft, updateDraft, deleteDraft } from "@/src/db/programDraftRepo"
import { UpdateDraftSchema } from "@/src/programs/schemas"
import type { ProgramSchedule } from "@/src/programs/types"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const draft = await getDraft(auth.userId, (await params).id)
    return draft ? NextResponse.json(draft) : err("That saved week no longer exists.", 404)
  } catch (e) { console.error("get draft:", e); return err("Failed to load that week") }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = UpdateDraftSchema.safeParse(await request.json())
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "That change could not be saved", 400)
    const { schedule, ...rest } = parsed.data
    const patch = schedule === undefined ? rest : { ...rest, schedule: schedule as ProgramSchedule }
    return NextResponse.json(await updateDraft(auth.userId, (await params).id, patch))
  } catch (e) { console.error("update draft:", e); return err((e as Error).message, 409) }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    await deleteDraft(auth.userId, (await params).id)
    return NextResponse.json({ ok: true })
  } catch (e) { console.error("delete draft:", e); return err("Failed to delete that week") }
}
