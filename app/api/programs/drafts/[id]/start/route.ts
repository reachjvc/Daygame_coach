import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { startDraft } from "@/src/db/programDraftRepo"
import { StartDraftSchema } from "@/src/programs/schemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/**
 * Start a saved week as a running program.
 *
 * 422, not 400, when the week is not runnable: the body was well-formed and the
 * WEEK is what needs work, and the message names the day that is still empty.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = StartDraftSchema.safeParse(body)
    if (!parsed.success) return err("That week could not be started", 400)
    const result = await startDraft(auth.userId, (await params).id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    console.error("start draft:", e)
    return err((e as Error).message, 422)
  }
}
