import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { updateApproach } from "@/src/db/trackingRepo"

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
    const { outcome, tags, mood, note } = body

    const updated = await updateApproach(id, {
      outcome: outcome !== undefined ? outcome : undefined,
      tags: tags !== undefined ? tags : undefined,
      mood: mood !== undefined ? mood : undefined,
      note: note !== undefined ? note : undefined,
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
