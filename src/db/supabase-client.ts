import { createBrowserClient } from "@supabase/ssr"

import { browserAuthCookieOptions } from "./authCookies"
import { refreshSafeFetch } from "./refreshSafeFetch"

/**
 * Create a Supabase client for use in browser/client components.
 * Uses the anon key - respects Row Level Security (RLS).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: browserAuthCookieOptions(),
      // The Time Log's live-updates client refreshes the session in the browser too: a
      // refresh answered with a server fault must not delete it here either (authResilience.ts).
      global: { fetch: refreshSafeFetch((input, init) => fetch(input, init)) },
    }
  )
}
