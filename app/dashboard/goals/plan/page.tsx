import { redirect } from "next/navigation"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/**
 * MOVED. Life Mastery now lives at `/life-mastery`, on its own, rather than
 * buried three levels inside the goals dashboard.
 *
 * This stays as a redirect rather than being deleted, because it was the live
 * address: six places in the app link to it, and anybody who bookmarked their
 * plan bookmarked this. A dead link is not an acceptable cost of tidying up.
 *
 * The step is carried across so `?step=today` still lands on the day's list.
 * Nothing else moves with it — the plan itself lives in the browser's storage,
 * which belongs to the site and not to any one address.
 */
export default async function GoalPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const { step } = await searchParams
  redirect(step ? `${LIFE_MASTERY}?step=${encodeURIComponent(step)}` : LIFE_MASTERY)
}
