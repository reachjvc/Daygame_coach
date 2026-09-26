import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getProfile } from "@/src/db/profilesRepo"

/**
 * GET /api/whoami
 *
 * Returns the current authenticated user's ID, email, and display name
 * (profile full_name when set) — used to prefill name fields client-side.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const profile = await getProfile(auth.userId).catch(() => null)

  return NextResponse.json({
    user_id: auth.userId,
    email: auth.email,
    full_name: profile?.full_name ?? null,
    authenticated: true,
  })
}
