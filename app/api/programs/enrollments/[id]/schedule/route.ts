import { NextResponse } from "next/server"
import { workoutErrorResponse } from "@/src/programs/errors"
import { requireAuth } from "@/src/db/auth"
import { updateEnrollmentSchedule } from "@/src/db/programRepo"
import { UpdateScheduleSchema } from "@/src/programs/schemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Replace a live enrollment's schedule with the user's edited version (null = back to catalog). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = UpdateScheduleSchema.safeParse(await request.json())
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Validation failed", 400)
    const { customSchedule, workingWeights } = parsed.data
    return NextResponse.json(
      await updateEnrollmentSchedule(auth.userId, id, customSchedule, workingWeights ?? {})
    )
  } catch (e) {
    console.error("update program schedule:", e)
    /**
     * A REFUSAL IS NOT A 500. This answered a hard 500 for everything, so a
     * `ProgramRefused` ("your program moved on — reload") and a
     * `CouldNotTell` (a read that could not be asked, which is retryable)
     * both arrived as "we are broken". The same bare-Error-is-a-500 shape
     * fixed one function away in `deleteProgramPermanently`; the class pass
     * did not reach this route because no guard looked at it.
     */
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
