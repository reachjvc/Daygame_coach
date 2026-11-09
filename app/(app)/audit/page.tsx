import { redirect } from "next/navigation"
import { ROUTES } from "@/src/shared/routes"

import { createServerSupabaseClient } from "@/src/db/server"
import { AuditScreen } from "@/src/audit/components/AuditScreen"

/** The browser tab, and the notification title (D-NAME). */
export const metadata = { title: "Time & energy audit" }

/**
 * The time & energy audit (Plans/energy-audit.md). The proxy blocks pages
 * without a session; this asks the auth server who the user is, as every
 * route here does, and names the account so the page saves only into it.
 */
export default async function AuditPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${ROUTES.audit}`)

  return <AuditScreen account={user.id} />
}
