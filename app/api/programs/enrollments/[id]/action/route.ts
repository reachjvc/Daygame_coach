import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { skipSession, resetEnrollment } from "@/src/db/programRepo"
import { workoutErrorResponse } from "@/src/programs/errors"
import { z } from "zod"

const ActionSchema = z.object({ action: z.enum(["skip", "reset"]) })
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = ActionSchema.safeParse(await request.json())
    if (!parsed.success) return err("Validation failed", 400)
    if (parsed.data.action === "skip") return NextResponse.json(await skipSession(auth.userId, id))
    return NextResponse.json(await resetEnrollment(auth.userId, id))
  // A refusal ("this week runs by the calendar, so there is nothing to skip")
  // is a 409 and the sentence is shown as written; a failure is still a 500.
  } catch (e) {
    console.error("program action:", e)
    /**
     * THROUGH THE SHARED HELPER, like every other route that can raise a
     * workout refusal. `statusFor` alone gives the number and leaves the body
     * to the route, which is the split `errors.ts` says lets the two drift —
     * and these three were only correct by luck: they happened to want the
     * same numbers. The guard could not see them until its seed list learned
     * about `CouldNotTell` and `readAllRows`.
     */
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}
