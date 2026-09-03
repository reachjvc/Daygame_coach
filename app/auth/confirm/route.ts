import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/src/db/server"
import { safeNextPath } from "@/src/shared/safeRedirect"

/**
 * Where Supabase sends the user after they click a link in an email --
 * both the signup confirmation and the password-recovery link.
 *
 * The link carries a one-time code that must be exchanged for a session before
 * any protected page will load.
 *
 * WHY redirect() FROM next/navigation AND NOT NextResponse.redirect():
 *
 * The Supabase client writes the new session cookies through next/headers.
 * Those writes are attached to the response Next.js builds for this request.
 * Returning a hand-built NextResponse.redirect() throws that response away and
 * substitutes a different one, so the Set-Cookie headers never reach the
 * browser -- verified against production: the route answered 307 to /redirect
 * with no Set-Cookie header at all, the exchange having succeeded. The user
 * lands back on the login page with no error and no way to tell why.
 *
 * redirect() lets Next build the response, so the cookie writes survive.
 * Two earlier attempts at this route got it wrong in two different ways; the
 * e2e test in tests/e2e/password-reset.spec.ts is what catches a third.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (!code) redirect("/auth/login?error=missing_code")

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) redirect("/auth/login?error=confirm_failed")

  redirect(next)
}
