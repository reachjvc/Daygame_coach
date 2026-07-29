import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createWorkoutLog, getWorkoutLogs, getWorkoutLogsWithSets, deleteWorkoutLog } from "@/src/db/healthRepo"
import type { WorkoutLogInsert, WorkoutSetInsert } from "@/src/health/types"
import { z } from "zod"

const NoteField = z.string().trim().max(500).nullable().optional()

const SetSchema = z.object({
  exercise: z.string().min(1).max(100), weight_kg: z.number().min(0),
  reps: z.number().int().positive(), set_number: z.number().int().positive(),
  is_warmup: z.boolean().optional(), notes: NoteField, exercise_notes: NoteField,
})

const CreateSchema = z.object({
  session_type: z.enum(["weights", "cardio", "mobility", "yoga", "running"]),
  duration_min: z.number().int().positive().max(600),
  intensity: z.number().int().min(1).max(5),
  distance_km: z.number().min(0).max(1000).nullable().optional(),
  sets: z.array(SetSchema).optional(),
  logged_at: z.string().optional(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const days = Number(params.get("days") ?? 90)
    const withSets = params.get("include") === "sets"
    return NextResponse.json(await (withSets ? getWorkoutLogsWithSets(auth.userId, days) : getWorkoutLogs(auth.userId, days)))
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
