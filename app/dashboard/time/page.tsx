import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/src/db/server"
import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"

/**
 * The time tracker's real address. `/test/toggl` renders the same components as
 * a sandbox; this is the one a signed-in person visits.
 *
 * `proxy.ts` already blocks /dashboard/* without a session. This second check is
 * not redundant: the proxy reads a signed cookie, while this asks the auth
 * server who the user actually is, and every route in the app does both.
 */
export default async function TimetrackPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/dashboard/time")

  return <TimetrackScreen />
}
