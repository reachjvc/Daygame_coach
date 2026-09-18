import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createWorkoutLog, getWorkoutLogs, getWorkoutLogsWithSets, deleteWorkoutLog } from "@/src/db/healthRepo"
import type { WorkoutLogInsert, WorkoutSetInsert } from "@/src/health/types"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { loggedAtForEntry } from "@/src/health/healthService"
import { CreateWorkoutSchema } from "@/src/health/schemas"
import { statusFor } from "@/src/programs/errors"

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
    const parsed = CreateWorkoutSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const { sets, entry_date, entry_time, ...log } = parsed.data
    const loggedAt = entry_date
      ? loggedAtForEntry(entry_date, await getUserTimezone(auth.userId), entry_time)
      : undefined
    if (loggedAt === null) return err("That is in the future", 400)

    const insert = { ...log, ...(loggedAt ? { logged_at: loggedAt } : {}) } as WorkoutLogInsert
    return NextResponse.json(
      await createWorkoutLog(auth.userId, insert, sets as WorkoutSetInsert[] | undefined),
      { status: 201 }
    )
  } catch (e) { console.error("Error creating workout log:", e); return err("Failed to create workout log") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    // WHAT ACTUALLY HAPPENED. This answered a fixed "Failed to delete workout
    // log" whatever went wrong, and `{ success: true }` whatever went right —
    // so a refused delete and a delete that moved the weights back read the
    // same. `recalculated` says whether a program was moved; the message is the
    // server's own sentence.
    const result = await deleteWorkoutLog(auth.userId, id)
    return NextResponse.json({ success: true, ...result })
  } catch (e) { console.error("Error deleting workout log:", e); return err((e as Error).message, statusFor(e)) }
}
