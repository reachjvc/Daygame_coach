import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { adjustWorkout, discardWorkout } from "@/src/db/workoutRepo"
import { AdjustWorkoutSchema } from "@/src/programs/schemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Skip, swap, reorder, or leave a note — what changed on the day. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = AdjustWorkoutSchema.safeParse(await request.json())
    if (!parsed.success) return err("Could not save that change", 400)
    return NextResponse.json(await adjustWorkout(auth.userId, id, parsed.data))
  } catch (e) { console.error("adjust workout:", e); return err((e as Error).message, 400) }
}

/** Throw it away. Nothing is recorded. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    await discardWorkout(auth.userId, id)
    return NextResponse.json({ discarded: true })
  } catch (e) { console.error("discard workout:", e); return err((e as Error).message, 400) }
}
