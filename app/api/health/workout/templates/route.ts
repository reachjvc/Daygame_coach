import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getWorkoutTemplates, upsertWorkoutTemplate, deleteWorkoutTemplate } from "@/src/db/healthRepo"
import type { WorkoutTemplateInsert } from "@/src/health/types"
import { z } from "zod"

const TemplateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  session_type: z.enum(["weights", "cardio", "mobility", "yoga", "running"]),
  duration_min: z.number().int().positive().max(600).nullable().optional(),
  intensity: z.number().int().min(1).max(5),
  distance_km: z.number().min(0).max(1000).nullable().optional(),
  sets: z.array(z.object({
    exercise: z.string().min(1).max(100),
    weight_kg: z.number().min(0),
    reps: z.number().int().positive(),
    is_warmup: z.boolean().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    exercise_notes: z.string().trim().max(500).nullable().optional(),
  })).max(50).optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await getWorkoutTemplates(auth.userId))
  } catch (e) { console.error("Error getting workout templates:", e); return err("Failed to get workout templates") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = TemplateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    return NextResponse.json(await upsertWorkoutTemplate(auth.userId, parsed.data as WorkoutTemplateInsert), { status: 201 })
  } catch (e) { console.error("Error saving workout template:", e); return err("Failed to save workout template") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    await deleteWorkoutTemplate(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("Error deleting workout template:", e); return err("Failed to delete workout template") }
}
