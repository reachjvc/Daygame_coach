import { GoalTriage } from "@/src/goals/components/GoalTriage"

/**
 * WHY THIS IS UNDER /test AND NOT UNDER THE DASHBOARD'S GOALS BRANCH.
 *
 * Everything under that branch except the plan step is a dead route — the hub
 * moved to the archive — and architecture.test.ts fails the build on any link
 * into it. This page was written there first and the test caught it, twice:
 * once for the page, and once for a comment that quoted the dead path in
 * backticks, which the same regex reads as a link.
 */
export default function GoalReviewPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-tab-bar">
      <GoalTriage />
    </div>
  )
}
