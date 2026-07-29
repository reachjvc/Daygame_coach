import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getProfile } from "@/src/db/profilesRepo"

/**
 * GET /api/whoami
 *
 * Returns the current authenticated user's ID, email, and display name
 * (profile full_name when set) — used to prefill name fields client-side.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const profile = await getProfile(user.id).catch(() => null)

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    full_name: profile?.full_name ?? null,
    authenticated: true,
  })
}
