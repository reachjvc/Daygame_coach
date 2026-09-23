import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteSet, updateSet } from "@/src/db/workoutRepo"
import { UpdateSetSchema } from "@/src/programs/schemas"

/** Did three, not four. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; setId: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id, setId } = await params
    return NextResponse.json(await deleteSet(auth.userId, id, setId))
  } catch (e) {
    console.error("delete set:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

/**
 * That was a warm-up, not a working set — and it was a nine.
 *
 * The only correction available before this was deleting the set and ticking
 * it again somewhere else, which loses the time it happened at.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; setId: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id, setId } = await params
    const parsed = UpdateSetSchema.safeParse(await request.json())
    // The first problem in plain words, like the sets route and the finish
    // route: a 400 saying nothing is a 400 the screen cannot repeat.
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Could not change that set" },
        { status: 400 }
      )
    }
    return NextResponse.json(await updateSet(auth.userId, id, setId, parsed.data))
  } catch (e) {
    console.error("update set:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
