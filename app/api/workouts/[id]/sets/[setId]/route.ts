import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deleteSet } from "@/src/db/workoutRepo"

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
