import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import { handleQARequest, VALIDATION_LIMITS } from "@/src/qa"

/**
 * Q&A API Route Handler
 *
 * This handler follows the thin route handler pattern:
 * 1. Auth check
 * 2. Subscription gate
 * 3. Validate request body
 * 4. Rate limit (TODO)
 * 5. Call service function
 * 6. Log outcome (TODO)
 * 7. Return response JSON
 *
 * NO business logic here - that lives in src/qa/qaService.ts
 */

// Request validation schema
const qaRequestSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(VALIDATION_LIMITS.maxQuestionChars, `Question must be ${VALIDATION_LIMITS.maxQuestionChars} characters or less`),
  retrieval: z
    .object({
      topK: z.number().int().min(1).max(VALIDATION_LIMITS.maxTopK).optional(),
      minScore: z.number().min(0).max(1).optional(),
      maxChunkChars: z.number().int().min(100).max(10000).optional(),
    })
    .optional(),
  generation: z
    .object({
      provider: z.enum(["ollama", "openai", "claude"]).optional(),
      model: z.string().optional(),
      maxOutputTokens: z.number().int().min(100).max(VALIDATION_LIMITS.maxOutputTokens).optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 2. Subscription gate
    const isPurchased = await hasPurchased(user.id)

    if (!isPurchased) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 }
      )
    }

    // 3. Validate request body
    const body = await req.json()
    const parseResult = qaRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const validatedRequest = parseResult.data

    // 4. Rate limit - TODO: Implement per-user rate limiting
    // For now, we skip this step

    // 5. Call service function
    const response = await handleQARequest(validatedRequest, user.id)

    // 6. Log outcome - TODO: Log to database for analytics
    // For now, we skip this step

    // 7. Return response JSON
    return NextResponse.json(response)
  } catch (error) {
    console.error("Q&A API Error:", error)

    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
