import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { resumeEnrollment, ProgramBusy } from "@/src/db/programRepo"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

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
    // on the program this one would push aside.
    return err((e as Error).message, e instanceof ProgramBusy ? 409 : 400)
  }
}
