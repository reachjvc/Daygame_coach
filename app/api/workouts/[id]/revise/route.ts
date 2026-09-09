import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { reviseWorkout } from "@/src/db/workoutRepo"
import { ReviseWorkoutSchema } from "@/src/programs/schemas"

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
    return NextResponse.json(await reviseWorkout(auth.userId, (await params).id, parsed.data.sets))
  } catch (e) {
    console.error("revise workout:", e)
    return err((e as Error).message, 400)
  }
}
