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
          return cookieHeader.split(";").map((part) => {
            const [name, ...rest] = part.trim().split("=")
            return { name, value: decodeURIComponent(rest.join("=")) }
          })
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
