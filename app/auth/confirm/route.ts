import { NextResponse } from "next/server"

import { createCallbackSupabaseClient } from "@/src/db/supabase"
import { safeNextPath } from "@/src/shared/safeRedirect"

/** If the session cookies have not been written by now, something is wrong. */
const COOKIE_FLUSH_TIMEOUT_MS = 5_000

/**
 * Where Supabase sends the user after they click a link in an email --
 * both the signup confirmation and the password-recovery link.
 *
 * The awkward part is timing, not routing: the Supabase client writes the
 * session cookies on a later tick than exchangeCodeForSession() resolves, so
 * redirecting immediately sends the user on with no session and no error.
 * See createCallbackSupabaseClient() for the evidence. Three earlier attempts
 * at this route moved the cookie writes around; none of them could work,
 * because the problem was never where they were written.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin))
  }

  const response = NextResponse.redirect(new URL(next, url.origin))
  const { supabase, cookiesWritten } = createCallbackSupabaseClient(request, response)

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=confirm_failed", url.origin))
  }

  // The timeout is a backstop against hanging, not an accepted outcome: if it
  // fires, the user lands logged out, which is the bug this route exists to fix.
  await Promise.race([
    cookiesWritten,
    new Promise((resolve) => setTimeout(resolve, COOKIE_FLUSH_TIMEOUT_MS)),
  ])

  return response
}
