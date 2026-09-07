import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { logProgramSession } from "@/src/db/programRepo"
import { LogSessionSchema } from "@/src/programs/schemas"

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
    const { rpe, notes, entry_date, entry_time, ...log } = parsed.data
    return NextResponse.json(
      await logProgramSession(auth.userId, id, log, rpe, notes, { entry_date, entry_time })
    )
  } catch (e) { console.error("log session:", e); return err((e as Error).message) }
}
