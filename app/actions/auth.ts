"use server"

import { createServerSupabaseClient } from "@/src/db/server"
import { redirect } from "next/navigation"

/**
 * Sign out the current user and redirect to home page.
 */
export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect("/")
}
