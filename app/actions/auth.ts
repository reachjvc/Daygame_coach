"use server"

import { createServerSupabaseClient } from "@/src/db/server"

/**
 * Sign out the current user on the server: the session is revoked and its
 * cookies are cleared on the response.
 *
 * No redirect here: Log Out (components/LogOutButton.tsx) must end the session
 * in the browser too when this cannot be reached, so the browser leaves for
 * the front page itself once both are done (alpha test p9-offline-01).
 */
export async function signOut(): Promise<{ ok: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()
  return { ok: !error }
}
