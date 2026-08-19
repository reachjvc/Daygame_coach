import { NextResponse } from "next/server"
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
    return err((e as Error).message)
  }
}
