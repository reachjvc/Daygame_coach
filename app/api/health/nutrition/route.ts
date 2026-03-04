import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createNutritionLog, getNutritionLogs, deleteNutritionLog } from "@/src/db/healthRepo"
import type { NutritionLogInsert } from "@/src/health/types"
import { z } from "zod"

const CreateSchema = z.object({
  quality_score: z.number().int().min(1).max(5),
  note: z.string().min(1).max(500),
  protein_g: z.number().min(0).max(1000).nullable().optional(),
  calories: z.number().int().min(1).max(10000).nullable().optional(),
  logged_at: z.string().optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30)
    return NextResponse.json(await getNutritionLogs(auth.userId, days))
  } catch (e) { console.error("Error getting nutrition logs:", e); return err("Failed to get nutrition logs") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    return NextResponse.json(await createNutritionLog(auth.userId, parsed.data as NutritionLogInsert), { status: 201 })
  } catch (e) { console.error("Error creating nutrition log:", e); return err("Failed to create nutrition log") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    await deleteNutritionLog(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("Error deleting nutrition log:", e); return err("Failed to delete nutrition log") }
}
