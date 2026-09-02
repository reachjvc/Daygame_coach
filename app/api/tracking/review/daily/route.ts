import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { createReview, getUserReviews } from "@/src/tracking/trackingService"
import { CreateDailyReviewSchema } from "@/src/tracking/schemas"
import type { ReviewInsert } from "@/src/db/trackingTypes"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const reviews = await getUserReviews(user.id, "daily", 2)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayReview = reviews.find((r) => new Date(r.period_start) >= today)
  const yesterday = reviews.find((r) => new Date(r.period_start) < today)

  return NextResponse.json({ today: todayReview || null, yesterday: yesterday || null })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // This route used to take the body unvalidated, which is how it kept
  // accepting the ISO instants that filed every review under the wrong day.
  const parsed = CreateDailyReviewSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const review: ReviewInsert = {
    user_id: user.id,
    review_type: "daily",
    fields: parsed.data.fields,
    period_start: parsed.data.period_start,
    period_end: parsed.data.period_end,
    is_draft: false,
  }

  const result = await createReview(review)
  return NextResponse.json(result, { status: 201 })
}
