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
 * Create a Supabase client for a Route Handler that returns its own Response.
 *
 * The difference from createServerSupabaseClient() matters and is easy to miss:
 * that one writes refreshed auth cookies through next/headers, which only lands
 * on the response Next.js generates for you. A handler that builds its own
 * `NextResponse.redirect(...)` and returns it discards those writes -- the user
 * ends up authenticated on the server and logged out in the browser.
 *
 * Pass the response you intend to return, and session cookies are set on it.
 */
export function createRouteHandlerSupabaseClient(
  request: Request,
  response: { cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void } }
) {
  const header = request.headers.get("cookie") ?? ""

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (!header) return []
          return header.split(";").map((part) => {
            const [name, ...rest] = part.trim().split("=")
            return { name, value: decodeURIComponent(rest.join("=")) }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
