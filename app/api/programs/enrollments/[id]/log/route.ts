import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { logProgramSession } from "@/src/db/programRepo"
import { z } from "zod"

const LogSchema = z.object({
  dayId: z.string().min(1),
  cycle: z.number().int().positive(),
  week: z.number().int().positive(),
  entries: z.array(z.object({
    exerciseId: z.string().min(1),
    sets: z.array(z.object({
      setNumber: z.number().int().positive(),
      reps: z.number().int().min(0),
      weight: z.number().min(0),
    })),
  })),
  durationMin: z.number().min(0).max(600).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const parsed = LogSchema.safeParse(await request.json())
    if (!parsed.success) return err("Validation failed", 400)
    const { rpe, notes, ...log } = parsed.data
    return NextResponse.json(await logProgramSession(auth.userId, id, log, rpe, notes))
  } catch (e) { console.error("log session:", e); return err((e as Error).message) }
}
