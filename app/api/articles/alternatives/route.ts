import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient } from "@/src/db/server"
import { generateAlternatives } from "@/src/articles/articlesService"
import type { ArticlePillar } from "@/src/articles/types"

// Only these emails can use AI-powered endpoints
const ALLOWED_AI_EMAILS = ["reachjvc@gmail.com"]

const ContentUnitSchema = z.enum(["sentence", "paragraph", "section"])
const ArticlePillarSchema = z.enum(["learning", "inner-game", "action", "tactics"])

const RequestSchema = z.object({
  originalContent: z.string().trim().min(1).max(10000),
  unit: ContentUnitSchema,
  context: z
    .object({
      before: z.string().max(2000).optional(),
      after: z.string().max(2000).optional(),
      articleTitle: z.string().max(200).optional(),
      pillar: ArticlePillarSchema.optional(),
    })
    .optional(),
})

/**
 * DEVELOPMENT ONLY - blocked in production to prevent API cost abuse.
 */
export async function POST(req: Request) {
  // Block in production - this route uses AI and costs money
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !ALLOWED_AI_EMAILS.includes(user.email)) {
    return NextResponse.json(
      { error: "Your account is not authorized to use AI features" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await generateAlternatives({
      originalContent: parsed.data.originalContent,
      unit: parsed.data.unit,
      context: parsed.data.context as { pillar?: ArticlePillar } | undefined,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Failed to generate alternatives:", error)
    return NextResponse.json({ error: "Failed to generate alternatives" }, { status: 500 })
  }
}
