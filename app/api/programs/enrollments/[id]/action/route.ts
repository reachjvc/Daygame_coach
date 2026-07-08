import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { skipSession, resetEnrollment } from "@/src/db/programRepo"
import { z } from "zod"

const ActionSchema = z.object({ action: z.enum(["skip", "reset"]) })
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = ActionSchema.safeParse(await request.json())
    if (!parsed.success) return err("Validation failed", 400)
    if (parsed.data.action === "skip") return NextResponse.json(await skipSession(auth.userId, id))
    return NextResponse.json(await resetEnrollment(auth.userId, id))
  } catch (e) { console.error("program action:", e); return err((e as Error).message) }
}
