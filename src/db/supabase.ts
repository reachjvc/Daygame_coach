import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Create a Supabase client for use in Server Components / Route Handlers.
 * Uses the anon key with cookie-based auth - respects RLS.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase admin client using the service role key.
 * WARNING: This client bypasses Row Level Security (RLS).
 * Only use in trusted server-side code (scripts, admin operations).
 * NEVER expose this in client-side code or public API routes without auth checks.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment variables")
  }

  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY - get this from Supabase Project Settings > API"
    )
  }

  return createClient(url, serviceKey)
}

/**
 * True for the cookies that carry an existing Supabase session, and false for
 * the PKCE code-verifier, which shares the same prefix but is not a session.
 *
 * Supabase names them:
 *   sb-<ref>-auth-token                  <- session (dropped)
 *   sb-<ref>-auth-token.0 / .1 / ...     <- session, chunked (dropped)
 *   sb-<ref>-auth-token-code-verifier    <- PKCE verifier (kept)
 */
export function isStaleSessionCookie(name: string): boolean {
  if (!name.startsWith("sb-")) return false
  if (name.endsWith("-code-verifier")) return false
  return /-auth-token(\.\d+)?$/.test(name)
}

/**
 * Create a Supabase client for an email-link callback route, plus a promise
 * that resolves once the session cookies have actually been written.
 *
 * WHY THE PROMISE. The server client does not write cookies during
 * exchangeCodeForSession(). It buffers them and writes them from an
 * onAuthStateChange listener that runs on a later tick -- verified from a
 * server log, where the route's 307 was emitted BEFORE setAll was called. A
 * route that redirects as soon as the exchange resolves therefore sends the
 * user away with no session and no error to explain it.
 *
 * Await `cookiesWritten` before returning the response.
 */
export function createCallbackSupabaseClient(
  request: Request,
  response: { cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void } }
) {
  let markWritten: () => void = () => {}
  const cookiesWritten = new Promise<void>((resolve) => {
    markWritten = resolve
  })

  const cookieHeader = request.headers.get("cookie") ?? ""

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (!cookieHeader) return []
          return cookieHeader
            .split(";")
            .map((part) => {
              const [name, ...rest] = part.trim().split("=")
              return { name, value: decodeURIComponent(rest.join("=")) }
            })
            // Ignore any session this browser is already carrying.
            //
            // Someone arriving from an email link is establishing a NEW session;
            // whatever they had is irrelevant. Worse, it can be actively harmful:
            // a browser holding a dead session token (expired oddly, or belonging
            // to a deleted account) made the code exchange fail with
            // `confirm_failed` -- reproduced 2026-09-03, and clearing cookies by
            // hand was what fixed it.
            //
            // The code-verifier cookie is NOT a session and must survive: the
            // PKCE exchange cannot complete without it. Hence the exact-name
            // check rather than a prefix match.
            .filter(({ name }) => !isStaleSessionCookie(name))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          markWritten()
        },
      },
    }
  )

  return { supabase, cookiesWritten }
}
