import { NextResponse } from "next/server"
import { z } from "zod"

import { createServerSupabaseClient, hasPurchased } from "@/src/db/server"
import { getInnerGameValues, saveInnerGameValueSelection } from "@/src/inner-game"

const saveSchema = z.object({
  valueIds: z.array(z.string().min(1)).default([]),
})

export async function GET(req: Request) {
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

    // 3. Get optional category filter from query params
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")

    let values = await getInnerGameValues()

    // 4. Filter by category if provided
    if (category) {
      values = values.filter(v => v.category.toLowerCase() === category.toLowerCase())
    }

    return NextResponse.json(values)
  } catch (error) {
    console.error("Inner Game values GET error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
    const parseResult = saveSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { valueIds } = parseResult.data

    // 4. Call service function
    await saveInnerGameValueSelection(user.id, valueIds)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Inner Game values POST error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
