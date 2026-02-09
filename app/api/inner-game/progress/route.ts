import { NextResponse } from "next/server"
import { requirePremium } from "@/src/db/server"
import { getUserValueIds } from "@/src/db/valuesRepo"
import { getUserProgress, updateUserProgress } from "@/src/inner-game/modules/progress"
import { updateProgressSchema } from "@/src/inner-game/schemas"
import { CATEGORIES } from "@/src/inner-game/config"

export async function GET() {
  try {
    const auth = await requirePremium()
    if (!auth.success) return auth.response

    const [progress, selectedValues] = await Promise.all([
      getUserProgress(auth.userId),
      getUserValueIds(auth.userId),
    ])

    return NextResponse.json({
      progress,
      selectedValues,
      totalCategories: CATEGORIES.length,
      completedCategories: progress.currentSubstep,
    })
  } catch (error) {
    console.error("Inner Game progress GET error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requirePremium()
    if (!auth.success) return auth.response

    const body = await req.json()
    const parseResult = updateProgressSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updatedProgress = await updateUserProgress(auth.userId, parseResult.data)
    return NextResponse.json({ progress: updatedProgress })
  } catch (error) {
    console.error("Inner Game progress POST error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
