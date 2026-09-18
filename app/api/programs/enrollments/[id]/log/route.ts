import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { logProgramSession } from "@/src/db/programRepo"
import { LogSessionSchema } from "@/src/programs/schemas"
import { statusFor } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = LogSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      // SAY WHAT WAS WRONG. A bare "Validation failed" reaches the screen as a
      // save that did nothing, with nothing to act on.
      return NextResponse.json(
        { error: "That session could not be saved", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { rpe, notes, entry_date, entry_time, clientKey, ...log } = parsed.data
    return NextResponse.json(
      await logProgramSession(auth.userId, id, log, rpe, notes, { entry_date, entry_time }, clientKey)
    )
  // A refusal ("your program moved on while this was being written up") is a
  // 409 and its sentence is shown as written; a failure is still a 500.
  } catch (e) { console.error("log session:", e); return err((e as Error).message, statusFor(e)) }
}
