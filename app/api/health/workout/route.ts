import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createWorkoutLog, getWorkoutLogs, deleteWorkoutLog } from "@/src/db/healthRepo"
import type { WorkoutLogInsert, WorkoutSetInsert } from "@/src/health/types"
import { z } from "zod"

const SetSchema = z.object({
  exercise: z.string().min(1).max(100),
  weight_kg: z.number().min(0),
  reps: z.number().int().positive(),
  set_number: z.number().int().positive(),
})

const CreateSchema = z.object({
  session_type: z.enum(["weights", "cardio", "mobility"]),
  duration_min: z.number().int().positive().max(600),
  intensity: z.number().int().min(1).max(5),
  sets: z.array(SetSchema).optional(),
  logged_at: z.string().optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const days = Number(new URL(request.url).searchParams.get("days") ?? 90)
    return NextResponse.json(await getWorkoutLogs(auth.userId, days))
  } catch (e) { console.error("Error getting workout logs:", e); return err("Failed to get workout logs") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const { sets, ...log } = parsed.data
    return NextResponse.json(await createWorkoutLog(auth.userId, log as WorkoutLogInsert, sets as WorkoutSetInsert[] | undefined), { status: 201 })
  } catch (e) { console.error("Error creating workout log:", e); return err("Failed to create workout log") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    await deleteWorkoutLog(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("Error deleting workout log:", e); return err("Failed to delete workout log") }
}
