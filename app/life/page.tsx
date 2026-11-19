import type { Metadata } from "next"
import { createServerSupabaseClient } from "@/src/db/server"
import { LifePage } from "@/src/home/components/LifePage"

export const metadata: Metadata = { title: "Life" }

/** Public (`isPublicPage`); signed in, it wears the app's frame. Plans/rebrand-10kdaysclub.md, Phase 5. */
export default async function Page() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return <LifePage isLoggedIn={!!user} />
}
