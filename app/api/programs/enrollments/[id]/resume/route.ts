import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { resumeEnrollment } from "@/src/db/programRepo"
import { workoutErrorResponse } from "@/src/programs/errors"

/** Pick a finished program back up, keeping the weights it was left at. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    return NextResponse.json(await resumeEnrollment(auth.userId, id))
  } catch (e) {
    console.error("resume program:", e)
    // 409: nothing about the request was wrong — there is a workout to finish
    // on the program this one would push aside, or the program has left the
    // catalogue. Either way it is not a fault on our side.
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
