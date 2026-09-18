import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { completeSet } from "@/src/db/workoutRepo"
import { CompleteSetSchema } from "@/src/programs/schemas"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/**
 * Tick a set off. THE WRITE THAT MAKES THIS A TRACKER AND NOT A FORM — every
 * set used to live in the open tab until one button at the end.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = CompleteSetSchema.safeParse(await request.json())
    /**
     * THE FIRST PROBLEM IN PLAIN WORDS, like the finish route. "Could not save
     * that set" said nothing about which number was wrong, and the screen now
     * shows this sentence on the row itself.
     */
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Could not save that set", 400)
    }
    return NextResponse.json(await completeSet(auth.userId, id, parsed.data))
  } catch (e) { console.error("complete set:", e); return err((e as Error).message, 400) }
}
