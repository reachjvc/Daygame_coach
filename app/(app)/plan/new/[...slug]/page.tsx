import { Suspense } from "react"
import { PlanNewRouter } from "@/src/goals/components/plan-new/PlanNewRouter"

/** Every screen of the new version: `/plan/new`, `/plan/new/<module>/<screen>`. The router reads the address. */
export default async function PlanNewPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return (
    <Suspense fallback={null}>
      <PlanNewRouter slug={slug} />
    </Suspense>
  )
}
