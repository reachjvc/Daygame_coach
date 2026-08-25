import { createServerSupabaseClient } from "@/src/db/server"
import { redirect } from "next/navigation"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { TAB_ORDER } from "@/src/goals/data/northStar"
import type { NorthStarTabId } from "@/src/goals/types"

/**
 * THE LIVE GOAL FLOW: Life Mastery, wired to a real account.
 *
 * It replaced the setup wizard, which now lives at /test/archive/goal-setup
 * and still works there. Same guards as the wizard had — signed in and paid —
 * and the same standalone shell: this is a flow you sit inside for an hour,
 * not a page you tab through, so it keeps the whole viewport and its own way
 * back to the hub rather than carrying the app header and the tab bar.
 *
 * The flow itself is localStorage-first and always was: twelve of its thirteen
 * steps touch no API, and the Track step is the one that pushes the plan into
 * `user_goals` under `ns:<run>:<goal>` template ids. So the account matters
 * here for exactly one step, and nothing is written until it is pressed.
 */
export default async function GoalPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
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
    .select("has_purchased")
    .eq("id", user.id)
    .single()

  if (!profile?.has_purchased) {
    redirect("/dashboard")
  }

  // ?step=today lands on the day's list. An unknown step opens the flow at the
  // start rather than 404ing: a stale link is not a broken page.
  const { step } = await searchParams
  const initialTab = TAB_ORDER.includes(step as NorthStarTabId) ? (step as NorthStarTabId) : undefined

  return <NorthStarFlow backHref="/dashboard/goals" backLabel="Goals" initialTab={initialTab} />
}
