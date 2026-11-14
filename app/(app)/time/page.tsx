import { redirect } from "next/navigation"
import { ROUTES } from "@/src/shared/routes"

import { createServerSupabaseClient } from "@/src/db/server"
import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"

/**
 * The browser tab, and the name a PWA shortcut takes. Without it the tab read
 * "AI Daygame Coach - Practice Social Skills from Home" while you were looking
 * at a time tracker — the app's root metadata, inherited because this route
 * declared none. `useTimetrack` replaces it with the running clock while a
 * timer is going, and puts this back when it stops.
 */
export const metadata = { title: "Time" }

/**
 * The phone's status bar in the tracker header's colour (`bg-card`, the same
 * in both themes), so the installed app's top reads as one band
 * (Plans/time-log-phone.md 2.4). PC browsers ignore it.
 */
export const viewport = { themeColor: "#1f2937" }

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
  if (!user) redirect(`/auth/login?next=${ROUTES.time}`)

  // whose tracker this browser may show and send: see `claimBrowserCopy`
  return <TimetrackScreen account={user.id} />
}
