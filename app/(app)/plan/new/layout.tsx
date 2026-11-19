import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { createServerSupabaseClient } from "@/src/db/server"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { resolvePlanTarget, SandboxNotFoundError } from "@/src/db/planSandbox"
import { PlanNewShell } from "@/src/goals/components/plan-new/PlanNewShell"

/**
 * THE NEW VERSION OF THE PLAN (Plans/plan-in-steps.md, Phase 6), on the copy space.
 *
 * The same gate as `/plan/sandbox`: signed in (the layout above), and only an
 * account with a `plan_sandboxes` row; every other account gets a 404. The
 * pages under it are handed the HIDDEN account's id, never a token, and every
 * request they make is aimed at the copy space by the shell's guard. The
 * signed-in account's own plan is never read or written here.
 */
export default async function PlanNewLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let sandbox
  try {
    sandbox = await resolvePlanTarget({ userId: user.id, supabase }, "sandbox")
  } catch (error) {
    if (error instanceof SandboxNotFoundError) notFound()
    throw error
  }

  // "Today" is the signed-in account's own calendar day, as on /plan/sandbox.
  const timezone = await getUserTimezone(user.id).catch(() => "UTC")

  return <PlanNewShell sandboxId={sandbox.userId} timezone={timezone}>{children}</PlanNewShell>
}
