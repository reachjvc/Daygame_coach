import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"

/**
 * GET /api/whoami
 *
 * Returns the current authenticated user's ID and email.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    authenticated: true,
  })
}
