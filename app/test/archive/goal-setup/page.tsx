"use client"

/**
 * THE ARCHIVED ONBOARDING: the goal setup wizard, still working.
 *
 * It was /dashboard/goals/setup — the flow every new account landed in — until
 * Life Mastery took that job at /dashboard/goals/plan. It is here rather than
 * deleted because it is the record of a set of decisions (the three paths, the
 * catalogue, the driven tour) and because the specs that cover it still run
 * against it.
 *
 * IT IS NOT A MOCK. It writes real goals to the signed-in account, exactly as
 * it did in the product, and returns to the real goals hub when it finishes.
 */

import { GoalSetupWizard } from "@/src/goals/components/setup/GoalSetupWizard"

export default function ArchivedGoalSetupPage() {
  // Where it returns to is the archive's business, not the component's: the
  // wizard has no idea it has been archived, and the hub it used to return to is
  // now next door. Passing it here keeps the only mention of the archive inside
  // the archive, so deleting this folder deletes every reference to it.
  return <GoalSetupWizard returnPath="/test/archive/goals-hub" />
}
