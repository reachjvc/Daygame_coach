import { createServerSupabaseClient } from "@/src/db/server"
import { redirect } from "next/navigation"
import { getUserGoals, rollGoalPeriods } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
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
 *
 * THE ONE EXCEPTION, and why goals are read here: the Today step ticks rows off
 * against real goals, so it opened on "loading…" while it fetched /api/goals
 * after hydration — a round-trip that could not start until the page's JS had
 * downloaded and mounted.
 *
 * It is handed over as a PROMISE, deliberately not awaited. Awaiting it held
 * the response back by ~440ms for nothing: this flow reads its plan from
 * localStorage, so no amount of server work puts Today's rows in the first
 * HTML. Streaming the promise starts the query at request time and resolves it
 * while the browser is still parsing and reading localStorage — the shell ships
 * as fast as any other step, and the goals are there by the time the plan is.
 *
 * Only started for the step that uses them; landing on any other step pays
 * nothing.
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

  // Started, not awaited. Same order the API route uses: expired counters are
  // rolled before they are read, so a weekly total from last week is not shown
  // as this week's.
  const goalsPromise =
    initialTab === "today"
      ? (async () => {
          const tz = await getUserTimezone(user.id)
          await rollGoalPeriods(user.id, tz)
          return getUserGoals(user.id, false, tz)
        })().catch((error) => {
          // The step falls back to fetching for itself.
          console.error("Failed to pre-read goals for the Today step:", error)
          return null
        })
      : null

  return (
    <NorthStarFlow
      backHref="/dashboard"
      backLabel="Dashboard"
      initialTab={initialTab}
      goalsPromise={goalsPromise}
    />
  )
}
