import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { reviseWorkout } from "@/src/db/workoutRepo"
import { ReviseWorkoutSchema } from "@/src/programs/schemas"
import { workoutErrorResponse } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/**
 * Correct a finished workout. When it answers a program, every session after it
 * is recomputed from the stored starting state.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = ReviseWorkoutSchema.safeParse(await request.json())
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "That change could not be saved", 400)
    return NextResponse.json(await reviseWorkout(auth.userId, (await params).id, parsed.data.sets, parsed.data.basedOn))
  } catch (e) {
    console.error("revise workout:", e)
    /**
     * ONE CALL FOR THE BODY AND THE STATUS.
     *
     * This asked `statusFor` for the number and wrote its own body, which is
     * the split `errors.ts` says is what lets the two drift — and it had: four
     * of the five workout write routes answer through `workoutErrorResponse`
     * and send `code: "workout_gone"`, and this one sent no code at all. So a
     * workout deleted on another device came back here as a bare 500 while the
     * same race on a set came back as a 409 the screen could act on.
     *
     * 500 is kept as the fallback: a correction that is not a refusal really
     * is ours, unlike the sets routes, where it means a set the schema
     * would not take.
     */
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
