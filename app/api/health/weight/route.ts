import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createWeightLog, getWeightLogs, deleteWeightLog } from "@/src/db/healthRepo"
import { z } from "zod"

const CreateSchema = z.object({
  weight_kg: z.number().positive().max(500),
  time_of_day: z.enum(["morning", "post_workout", "evening"]),
  photo_url: z.string().url().nullable().optional(),
  logged_at: z.string().optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30)
    return NextResponse.json(await getWeightLogs(auth.userId, days))
  } catch (e) { console.error("Error getting weight logs:", e); return err("Failed to get weight logs") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    return NextResponse.json(await createWeightLog(auth.userId, parsed.data), { status: 201 })
  } catch (e) { console.error("Error creating weight log:", e); return err("Failed to create weight log") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    await deleteWeightLog(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("Error deleting weight log:", e); return err("Failed to delete weight log") }
}
