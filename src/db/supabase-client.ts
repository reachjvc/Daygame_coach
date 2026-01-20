import { createBrowserClient } from "@supabase/ssr"

/**
 * Create a Supabase client for use in browser/client components.
 * Uses the anon key - respects Row Level Security (RLS).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
