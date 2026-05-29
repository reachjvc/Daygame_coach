import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { logWorkoutAndProgress } from "@/src/exercising/exercisingService"
import type { WorkoutLogInput } from "@/src/exercising/types"

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = (await request.json()) as WorkoutLogInput
    if (!body.day || !body.exercises?.length) {
      return NextResponse.json({ error: "day and exercises required" }, { status: 400 })
    }
    const result = await logWorkoutAndProgress(body)
    return NextResponse.json({ message: "Workout logged", ...result })
  } catch (e) {
    console.error("Exercising LOG error:", e)
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
