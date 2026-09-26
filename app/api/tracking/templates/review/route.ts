import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getReviewTemplates, saveCustomReviewTemplate } from "@/src/tracking/trackingService"
import type { ReviewType } from "@/src/tracking/trackingService"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const reviewType = searchParams.get("type") as ReviewType | null

    const templates = await getReviewTemplates(auth.userId, reviewType || undefined)

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error getting review templates:", error)
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const { name, description, review_type, fields } = await request.json()

    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
    if (!fields?.length) return NextResponse.json({ error: "Fields required" }, { status: 400 })

    const template = await saveCustomReviewTemplate(auth.userId, {
      name,
      description,
      reviewType: review_type || "weekly",
      fields,
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating review template:", error)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}
