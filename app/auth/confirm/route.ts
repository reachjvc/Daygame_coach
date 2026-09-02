import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/src/db/server"
import { safeNextPath } from "@/src/shared/safeRedirect"

/**
 * Where Supabase sends the user after they click a link in an email --
 * both the signup confirmation and the password-recovery link.
 *
 * The link carries a one-time `code`. Until it is exchanged for a session there
 * is no logged-in user, so this must run before any protected page. Exchanging it
 * here (a Route Handler) rather than in a page is deliberate: the cookie write in
 * createServerSupabaseClient() is swallowed inside Server Components and only
 * takes effect in a Route Handler or Server Action.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=confirm_failed", url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
