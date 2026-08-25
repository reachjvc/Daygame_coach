import { redirect } from "next/navigation"

/**
 * The old setup wizard's URL, kept pointing somewhere true.
 *
 * The wizard is archived at /test/archive/goal-setup and the live flow is Life
 * Mastery at /dashboard/goals/plan. This route stays because it is in
 * bookmarks, in the mobile tab bar's hidden-route list and in old links, and a
 * 404 on a path the product used to send everybody to is a worse answer than a
 * redirect.
 */
export default function GoalSetupPage() {
  redirect("/dashboard/goals/plan")
}
