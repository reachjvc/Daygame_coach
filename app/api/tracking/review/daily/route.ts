import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { createReview, getUserReviews } from "@/src/tracking/trackingService"
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

  const { fields, period_start, period_end } = await request.json()

  const review: ReviewInsert = {
    user_id: user.id,
    review_type: "daily",
    fields: fields || {},
    period_start,
    period_end,
    is_draft: false,
  }

  const result = await createReview(review)
  return NextResponse.json(result, { status: 201 })
}
