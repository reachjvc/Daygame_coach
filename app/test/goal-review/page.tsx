import { GoalTriage } from "@/src/goals/components/GoalTriage"

/**
 * WHY THIS IS UNDER /test AND NOT UNDER THE DASHBOARD'S GOALS BRANCH.
 *
 * Everything under that branch except the plan step is a dead route — the hub
 * moved to the archive — and production does not link into it.
 */
export default function GoalReviewPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-tab-bar">
      <GoalTriage />
    </div>
  )
}
