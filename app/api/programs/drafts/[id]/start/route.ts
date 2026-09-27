import { NextResponse } from "next/server"
import { workoutErrorResponse } from "@/src/programs/errors"
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
    /**
     * 422 FOR EVERYTHING was as wrong in the other direction: starting a
     * saved week while a workout is open raises `OPEN_WORKOUT_REFUSAL`,
     * which is a 409 the screen can act on, and a failed read is a 503 the
     * browser should retry. 422 said "what you sent is unprocessable" for
     * both.
     */
    const answer = workoutErrorResponse(e, 422)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
