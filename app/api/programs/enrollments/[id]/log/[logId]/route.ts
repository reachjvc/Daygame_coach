import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { reviseSessionLog } from "@/src/db/programRepo"

/**
 * PATCH IS GONE, DELETE STAYS.
 *
 * The PATCH half took `{exerciseId, setNumber, reps, weight}` and nothing else,
 * then deleted every set of the workout and re-inserted only that — so a
 * correction through it flattened warm-ups, all-out sets and back-offs into
 * plain working sets and dropped every per-set note, RPE and side. Nothing in
 * the app called it; corrections go through `PATCH /api/workouts/[id]/revise`,
 * which preserves all of that. It is removed rather than left as a loaded gun.
 *
 * DELETE is the live path behind the delete-a-session button and five test
 * cleanups. It is the only route that removes one session and replays the
 * enrollment so the weights land where they would have been without it.
 */
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** Remove a logged session. Every session after it is recomputed. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; logId: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id, logId } = await params
    return NextResponse.json(await reviseSessionLog(auth.userId, id, logId))
  } catch (e) { console.error("delete session:", e); return err((e as Error).message, 400) }
}
