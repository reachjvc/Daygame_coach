import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import {
  getEnrollmentDetail,
  unenroll,
  deleteEnrollmentPermanently,
} from "@/src/db/programRepo"
import { workoutErrorResponse } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const detail = await getEnrollmentDetail(auth.userId, id)
    if (!detail) return err("Enrollment not found", 404)
    return NextResponse.json(detail)
  } catch (e) {
    console.error("get enrollment:", e)
    // A GET, but `getEnrollmentDetail` reads pages, so it can answer
    // `CouldNotTell` — a 503 the browser may retry, not a flat 500.
    const answer = workoutErrorResponse(e, 500)
    return NextResponse.json(answer.body, { status: answer.status })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    // Default is ARCHIVE. Erasing has to be asked for by name, and the repo
    // refuses it on a program that is still running.
    if (new URL(req.url).searchParams.get("permanent") === "1") {
      await deleteEnrollmentPermanently(auth.userId, id)
    } else {
      await unenroll(auth.userId, id)
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("end program:", e)
    // 409, not 400: nothing about the request was wrong — the program is busy,
    // and the answer changes the moment the open workout is finished.
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
