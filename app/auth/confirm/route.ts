import { NextResponse } from "next/server"

import { createRouteHandlerSupabaseClient } from "@/src/db/supabase"
import { safeNextPath } from "@/src/shared/safeRedirect"

/**
 * Where Supabase sends the user after they click a link in an email --
 * both the signup confirmation and the password-recovery link.
 *
 * The link carries a one-time code. Until it is exchanged for a session there
 * is no logged-in user, so this must run before any protected page.
 *
 * The redirect response is built FIRST and handed to the Supabase client, so
 * the session cookies land on the response we actually return. Building it
 * afterwards silently drops them: the exchange succeeds, no error is raised,
 * and the user is bounced to the login page by the next page that looks for a
 * session. That exact bug shipped once -- see the tests.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin))
  }

  const response = NextResponse.redirect(new URL(next, url.origin))
  const supabase = createRouteHandlerSupabaseClient(request, response)

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=confirm_failed", url.origin))
  }

  return response
}
