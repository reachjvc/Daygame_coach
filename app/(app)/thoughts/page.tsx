import { redirect } from "next/navigation"
import { ROUTES } from "@/src/shared/routes"
import { createServerSupabaseClient } from "@/src/db/server"
import { ThoughtsScreen } from "@/src/thoughts/components/ThoughtsScreen"

/** The browser tab, and the name the install shortcut takes. */
export const metadata = { title: "Thoughts" }

/**
 * Thought Frequencies (Plans/thought.md). Any signed-in person, no purchase
 * (Q3). `proxy.ts` already sends a signed-out visitor to log in; this asks the
 * auth server itself, as every page in the app does.
 */
export default async function ThoughtsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${ROUTES.thoughts}`)

  return <ThoughtsScreen />
}
