import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"

/**
 * Post-login redirect handler.
 *
 * This page:
 * 1. Checks if user is authenticated
 * 2. Checks if onboarding is completed (from profiles table)
 * 3. Redirects to appropriate destination
 */
export default async function RedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single()

  const params = await searchParams
  const requestedNext =
    typeof params?.next === "string" ? params.next : undefined
  const safeNext =
    requestedNext && requestedNext.startsWith("/")
      ? requestedNext
      : "/dashboard"

  if (profile?.onboarding_completed) {
    redirect(safeNext)
  } else {
    // User hasn't completed onboarding, send them to preferences
    redirect("/preferences")
  }
}
