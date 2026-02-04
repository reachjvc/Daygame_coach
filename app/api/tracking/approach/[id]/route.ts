import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getApproachOwner } from "@/src/db/trackingRepo"
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
    const ownerId = await getApproachOwner(id)

    if (!ownerId) {
      return NextResponse.json({ error: "Approach not found" }, { status: 404 })
    }

    if (ownerId !== user.id) {
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

    const { outcome, set_type, tags, mood, note, voice_note_url } = parsed.data

    const updated = await updateApproach(id, {
      outcome: outcome ?? undefined,
      set_type: set_type ?? undefined,
      tags: tags ?? undefined,
      mood: mood ?? undefined,
      note: note ?? undefined,
      voice_note_url: voice_note_url ?? undefined,
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
