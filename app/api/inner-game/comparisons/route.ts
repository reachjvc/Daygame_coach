import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import {
  saveComparison,
  getComparisons,
  deleteAllComparisons,
} from "@/src/db/valueComparisonRepo"

// Schema for saving a comparison
const saveComparisonSchema = z.object({
  valueAId: z.string().min(1),
  valueBId: z.string().min(1),
  chosenValueId: z.string().min(1),
  comparisonType: z.enum(["pairwise", "aspirational_vs_current"]),
  roundNumber: z.number().int().min(1).default(1),
})

/**
 * GET /api/inner-game/comparisons
 * Returns user's comparison history.
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

    // 3. Get comparisons
    const comparisons = await getComparisons(user.id)

    return NextResponse.json({ comparisons })
  } catch (error) {
    console.error("Inner Game comparisons GET error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/inner-game/comparisons
 * Saves a new comparison result.
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
    const parseResult = saveComparisonSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { valueAId, valueBId, chosenValueId, comparisonType, roundNumber } = parseResult.data

    // 4. Validate that chosen value is one of the compared values
    if (chosenValueId !== valueAId && chosenValueId !== valueBId) {
      return NextResponse.json(
        { error: "Chosen value must be one of the compared values" },
        { status: 400 }
      )
    }

    // 5. Save comparison
    const comparison = await saveComparison({
      user_id: user.id,
      value_a_id: valueAId,
      value_b_id: valueBId,
      chosen_value_id: chosenValueId,
      comparison_type: comparisonType,
      round_number: roundNumber,
    })

    return NextResponse.json({ comparison })
  } catch (error) {
    console.error("Inner Game comparisons POST error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/inner-game/comparisons
 * Deletes all comparisons for the user (used when resetting).
 */
export async function DELETE() {
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

    // 3. Delete all comparisons
    await deleteAllComparisons(user.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Inner Game comparisons DELETE error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
