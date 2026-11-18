import { Suspense } from "react"
import { PlanNewRouter } from "@/src/goals/components/plan-new/PlanNewRouter"

/** The plan home of the new version. Every other screen is `[...slug]`. */
export default function PlanNewHomePage() {
  return (
    <Suspense fallback={null}>
      <PlanNewRouter slug={[]} />
    </Suspense>
  )
}
