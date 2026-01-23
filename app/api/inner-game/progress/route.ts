import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import { getUserProgress, updateUserProgress } from "@/src/inner-game/modules/progress"
import { InnerGameStep } from "@/src/inner-game/types"

// Schema for updating progress
const updateProgressSchema = z.object({
  currentStep: z.nativeEnum(InnerGameStep).optional(),
  currentSubstep: z.number().int().min(0).max(9).optional(),
  welcomeDismissed: z.boolean().optional(),
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  cuttingCompleted: z.boolean().optional(),
  hurdlesResponse: z.string().optional(),
  hurdlesInferredValues: z.array(z.object({
    id: z.string(),
    reason: z.string(),
  })).optional(),
  deathbedResponse: z.string().optional(),
  deathbedInferredValues: z.array(z.object({
    id: z.string(),
    reason: z.string(),
  })).optional(),
  finalCoreValues: z.array(z.object({
    id: z.string(),
    rank: z.number(),
  })).optional(),
  aspirationalValues: z.array(z.object({
    id: z.string(),
  })).optional(),
})

/**
 * GET /api/inner-game/progress
 * Returns user's current progress through the inner game journey.
 */
export async function GET() {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // 2. Subscription gate
    if (!(await hasPurchased(user.id))) {
      return NextResponse.json({ error: "Premium subscription required" }, { status: 403 })
    }

    // 3. Get progress
    const progress = await getUserProgress(user.id)

    // 4. Get user's selected values count for the response
    const { data: userValues } = await supabase
      .from("user_values")
      .select("value_id")
      .eq("user_id", user.id)

    const selectedValues = (userValues ?? []).map(v => v.value_id)

    return NextResponse.json({
      progress,
      selectedValues,
      totalCategories: 10,
      completedCategories: progress.currentSubstep,
    })
  } catch (error) {
    console.error("Inner Game progress GET error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/inner-game/progress
 * Updates user's progress.
 */
export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // 2. Subscription gate
    if (!(await hasPurchased(user.id))) {
      return NextResponse.json({ error: "Premium subscription required" }, { status: 403 })
    }

    // 3. Validate request body
    const body = await req.json()
    const parseResult = updateProgressSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // 4. Update progress
    const updatedProgress = await updateUserProgress(user.id, parseResult.data)

    return NextResponse.json({ progress: updatedProgress })
  } catch (error) {
    console.error("Inner Game progress POST error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
