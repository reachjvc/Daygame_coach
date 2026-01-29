import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { updateApproach } from "@/src/tracking/trackingService"
import { UpdateApproachSchema } from "@/src/tracking/schemas"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { data: approach, error: fetchError } = await supabase
      .from("approaches")
      .select("user_id")
      .eq("id", id)
      .single()

    if (fetchError || !approach) {
      return NextResponse.json({ error: "Approach not found" }, { status: 404 })
    }

    if (approach.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateApproachSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { outcome, set_type, tags, mood, note } = parsed.data

    const updated = await updateApproach(id, {
      outcome: outcome ?? undefined,
      set_type: set_type ?? undefined,
      tags: tags ?? undefined,
      mood: mood ?? undefined,
      note: note ?? undefined,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating approach:", error)
    return NextResponse.json(
      { error: "Failed to update approach" },
      { status: 500 }
    )
  }
}
