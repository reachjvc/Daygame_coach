import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/**
 * THE GATE, once, for the flow and everything under it.
 *
 * Signed in is the whole requirement. The copy of this flow that used to live at
 * `/dashboard/goals/plan` also demanded a purchase; that gate is deliberately
 * not carried over, so any account can open Life Mastery.
 *
 * It is a layout rather than a check repeated in each page because the vice
 * module below it is nine routes: one of them forgetting the check is exactly
 * the kind of hole nobody notices, and a layout cannot be forgotten.
 *
 * `?next=` so somebody sent to log in lands back where they were going. The
 * login side passes it through `safeNextPath`, which refuses anything that is
 * not a same-origin path — an open redirect on a login page is how phishing
 * links get to wear your domain.
 */
export default async function LifeMasteryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Encoded, though today's address needs no escaping. It is a value going
  // into a query string, and the day this moves to something carrying a `?` or
  // an `&` the unencoded version would silently truncate the return address.
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(LIFE_MASTERY)}`)

  return <>{children}</>
}
