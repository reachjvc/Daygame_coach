import { createServerSupabaseClient } from "@/src/db/server"
import { ROUTES } from "@/src/shared/routes"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { stepFor, TAB_ORDER } from "@/src/goals/data/northStar"
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
 * NOBODY'S PLAN MOVED. The flow keeps its plan, and its days, on the account
 * (since Plans/life-plan-rebuild.md, Phase 1), with this browser's storage as
 * a cache, so changing the address does not lose a plan somebody has written.
 * Nothing is copied into `user_goals` any more (Q4): Today counts goals on the
 * day itself.
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
  // A step that folded into another (`one`, `commit`, `templates`;
  // Plans/life-plan-rebuild.md) is handed over as asked: the flow opens its
  // new home, and on that home the part the link was for.
  const initialTab = TAB_ORDER.includes(stepFor(step as NorthStarTabId)) ? (step as NorthStarTabId) : undefined

  /**
   * THE ACCOUNT'S ZONE, read once for the whole page.
   *
   * Life Mastery's "today" was the browser's, while the ticks derived from
   * finished workouts arrive on the account's local date — so a lifter whose
   * phone and account differ saw a session tick a column that was not the one
   * they trained on. One read, one answer, handed down.
   */
  const timezone = await getUserTimezone(user.id).catch(() => "UTC")

  return (
    <NorthStarFlow
      userId={user.id}
      backHref={ROUTES.dashboard}
      backLabel="Dashboard"
      initialTab={initialTab}
      timezone={timezone}
    />
  )
}
