import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { ROUTES } from "@/src/shared/routes"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { PlanSandboxBanner } from "@/src/goals/components/PlanSandboxBanner"
import { stepFor, TAB_ORDER } from "@/src/goals/data/northStar"
import type { NorthStarTabId } from "@/src/goals/types"
import { landingStep } from "@/src/goals/planLanding"
import { planIsInUse } from "@/src/db/lifePlanRepo"
import { parsePeriodParam } from "@/src/goals/reviewService"
import { resolvePlanTarget, SandboxNotFoundError } from "@/src/db/planSandbox"

/**
 * THE COPY SPACE: today's plan flow on a hidden second account that holds a
 * copy of the signed-in account's plan (`src/db/planSandbox.ts`).
 *
 * Only an account with a `plan_sandboxes` row may open it; every other account
 * gets a 404, as does anyone not signed in (the layout above sends them to log
 * in first). The flow is given the HIDDEN account's id and runs its requests
 * through a guard that aims every plan call at the hidden account and refuses
 * every other write (`guardSandboxRequests`). The server reads here
 * (is the plan in use) go through the same resolver, so they are the hidden
 * account's. The session for the hidden account never leaves the server: the
 * page is handed an id, not a token.
 */
export default async function PlanSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; period?: string }>
}) {
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

  const { step, period } = await searchParams
  const inUse = await planIsInUse(sandbox.userId, sandbox.supabase)
  const landed = landingStep(step, inUse)
  const initialTab = landed ?? (TAB_ORDER.includes(stepFor(step as NorthStarTabId)) ? (step as NorthStarTabId) : undefined)
  // "Today" is the signed-in account's own calendar day.
  const timezone = await getUserTimezone(user.id).catch(() => "UTC")

  return (
    <NorthStarFlow
      key={sandbox.userId}
      userId={sandbox.userId}
      sandbox
      basePath={ROUTES.planSandbox}
      banner={<PlanSandboxBanner sandboxId={sandbox.userId} />}
      backHref={ROUTES.settings}
      backLabel="Settings"
      initialTab={initialTab}
      initialInUse={inUse}
      initialPeriod={parsePeriodParam(period)}
      timezone={timezone}
    />
  )
}
