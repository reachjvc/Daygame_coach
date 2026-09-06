import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { reviseSessionLog } from "@/src/db/programRepo"
import { z } from "zod"

/** Same set shape the original log accepts — a correction is still a session. */
const ReviseSchema = z.object({
  entries: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.array(z.object({
      setNumber: z.number().int().positive(),
      reps: z.number().int().min(0),
      weight: z.number().min(0),
    })),
  })),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Correct a logged session. Every session after it is recomputed. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; logId: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id, logId } = await params
    const parsed = ReviseSchema.safeParse(await request.json())
    if (!parsed.success) return err("Validation failed", 400)
    return NextResponse.json(await reviseSessionLog(auth.userId, id, logId, parsed.data.entries))
  } catch (e) { console.error("revise session:", e); return err((e as Error).message, 400) }
}

/** Remove a logged session. Every session after it is recomputed. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; logId: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id, logId } = await params
    return NextResponse.json(await reviseSessionLog(auth.userId, id, logId, null))
  } catch (e) { console.error("delete session:", e); return err((e as Error).message, 400) }
}
