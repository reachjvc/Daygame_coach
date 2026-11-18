import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/src/db/server"

// Ends a session: never cached.
export const dynamic = "force-dynamic"

/**
 * Sign out the current user on the server: the session is revoked and its
 * cookies are cleared on the response.
 *
 * A route handler and not a server action, on purpose (Plans/tests-green-and-fast.md,
 * F9). A server action that deletes cookies returns the current page freshly
 * rendered, and the router applies it. That page, rendered without a session,
 * is redirected to /auth/login by the proxy, and it raced Log Out's own
 * navigation to the front page: Log Out landed on "/" or on the sign-in page,
 * depending on which arrived first (always the You tab on a phone). A fetch to
 * a route handler changes no page, so the only navigation left is Log Out's.
 *
 * No redirect here: Log Out (components/LogOutButton.tsx) must end the session
 * in the browser too when this cannot be reached, so the browser leaves for
 * the front page itself once both are done (alpha test p9-offline-01).
 */
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()
  return NextResponse.json({ ok: !error })
}
