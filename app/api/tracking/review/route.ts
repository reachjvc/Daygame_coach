import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { createReview, getUserReviews } from "@/src/tracking/trackingService"
import type { ReviewInsert, ReviewType } from "@/src/tracking/trackingService"
import { CreateReviewSchema } from "@/src/tracking/schemas"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      review_type,
      template_id,
      fields,
      period_start,
      period_end,
      previous_commitment,
      commitment_fulfilled,
      new_commitment,
      is_draft,
    } = parsed.data

    const reviewData: ReviewInsert = {
      user_id: user.id,
      review_type,
      template_id: template_id ?? undefined,
      fields,
      period_start,
      period_end,
      previous_commitment: previous_commitment ?? undefined,
      commitment_fulfilled: commitment_fulfilled ?? undefined,
      new_commitment: new_commitment ?? undefined,
      is_draft,
    }

    const review = await createReview(reviewData)

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reviewType = searchParams.get("type") as ReviewType | null
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    const reviews = await getUserReviews(user.id, reviewType || undefined, limit)

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Error getting reviews:", error)
    return NextResponse.json(
      { error: "Failed to get reviews" },
      { status: 500 }
    )
  }
}
