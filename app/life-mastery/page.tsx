import { createServerSupabaseClient } from "@/src/db/server"
import { getUserGoals, rollGoalPeriods } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { TAB_ORDER } from "@/src/goals/data/northStar"
import type { NorthStarTabId } from "@/src/goals/types"

/**
 * LIFE MASTERY — its own address at last.
 *
 * It was two pages: a bench copy at `/test/life-mastery` with no account behind
 * it, and a live copy at `/dashboard/goals/plan` behind a purchase. This is the
 * one home now; the old address redirects here so nothing that links to it or
 * was bookmarked breaks. Signed in is the only requirement, and the layout above
 * enforces it.
 *
 * NOBODY'S PLAN MOVED. The flow keeps its plan in the browser's own storage,
 * which belongs to the site rather than to any one page, so changing the address
 * does not lose a plan somebody has already written.
 *
 * The flow itself is storage-first and always was: twelve of its thirteen steps
 * touch no API, and the Track step is the one that pushes the plan into
 * `user_goals`. So the account matters here for exactly one step, and nothing is
 * written until it is pressed.
 */
export default async function LifeMasteryPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The layout has already turned anyone signed out away; this is for the type,
  // and so this file is still correct if it is ever mounted somewhere else.
  if (!user) return null

  // ?step=today lands on the day's list. An unknown step opens the flow at the
  // start rather than 404ing: a stale link is not a broken page.
  const { step } = await searchParams
  const initialTab = TAB_ORDER.includes(step as NorthStarTabId) ? (step as NorthStarTabId) : undefined

  /**
   * THE ACCOUNT'S ZONE, read once for the whole page.
   *
   * Life Mastery's "today" was the browser's, while the ticks derived from
   * finished workouts arrive on the account's local date — so a lifter whose
   * phone and account differ saw a session tick a column that was not the one
   * they trained on. One read, one answer, handed down.
   */
  const timezone = await getUserTimezone(user.id).catch(() => "UTC")

  // Started, not awaited. Same order the API route uses: expired counters are
  // rolled before they are read, so a weekly total from last week is not shown
  // as this week's.
  const goalsPromise =
    initialTab === "today"
      ? (async () => {
          await rollGoalPeriods(user.id, timezone)
          return getUserGoals(user.id, false, timezone)
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
      timezone={timezone}
      goalsPromise={goalsPromise}
    />
  )
}
