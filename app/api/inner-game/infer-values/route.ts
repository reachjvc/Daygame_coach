import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import { inferValues, ValueInferenceError } from "@/src/inner-game/modules/valueInference"

// Schema for infer values request
const inferValuesSchema = z.object({
  context: z.enum(["shadow", "peak_experience", "hurdles"]),
  response: z.string().min(10, "Please provide a more detailed response").max(5000),
})

/**
 * POST /api/inner-game/infer-values
 * Uses Ollama to infer values from user's text response.
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
    const parseResult = inferValuesSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { context, response: userResponse } = parseResult.data

    // 4. Get user's selected values to include in the inference
    const { data: userValues } = await supabase
      .from("user_values")
      .select("value_id")
      .eq("user_id", user.id)

    const selectedValues = (userValues ?? []).map(v => v.value_id)

    // 5. Infer values using Ollama
    const inferredValues = await inferValues(context, userResponse, selectedValues)

    return NextResponse.json({ values: inferredValues })
  } catch (error) {
    console.error("Inner Game infer-values POST error:", error)

    if (error instanceof ValueInferenceError) {
      // Handle specific inference errors
      if (error.code === "MODEL_NOT_FOUND") {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 503 }
        )
      }
      if (error.code === "EMPTY_RESPONSE") {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
