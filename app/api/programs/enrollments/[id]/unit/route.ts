import { NextResponse } from "next/server"
import { workoutErrorResponse } from "@/src/programs/errors"
import { requireAuth } from "@/src/db/auth"
import { changeEnrollmentUnit } from "@/src/db/programRepo"
import { ChangeUnitSchema } from "@/src/programs/schemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/**
 * Move a running program between kilograms and pounds.
 *
 * Everything the program has worked up to is converted and rounded to what the
 * bar can load; the workouts already logged are stored in kilograms and are not
 * touched. `changed: false` means the enrolment was already in that unit — a
 * no-op, not a failure, so it answers 200 and the screen says nothing happened.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = ChangeUnitSchema.safeParse(await request.json())
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Validation failed", 400)
    const { enrollment, changed } = await changeEnrollmentUnit(auth.userId, id, parsed.data.unitSystem)
    return NextResponse.json({ enrollment, changed })
  } catch (e) {
    console.error("change program unit:", e)
    /**
     * A REFUSAL IS NOT A 500 — the same shape as the schedule route beside it.
     * "You are mid-workout on this program" is a sentence the person can act
     * on, and it arrives as 409 rather than "we are broken".
     */
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
