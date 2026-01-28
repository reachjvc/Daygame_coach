import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/supabase"
import { getLatestCommitment } from "@/src/db/trackingRepo"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const commitment = await getLatestCommitment(user.id)

    return NextResponse.json({ commitment })
  } catch (error) {
    console.error("Error getting latest commitment:", error)
    return NextResponse.json(
      { error: "Failed to get commitment" },
      { status: 500 }
    )
  }
}
