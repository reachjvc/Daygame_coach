"use client"

/**
 * The twelve-area flow that used to live at /test/life-mastery, kept reachable
 * so the North Star rebuild is a change of direction rather than a deletion.
 * Its localStorage key is its own, so the two never read each other's plans.
 */

import { LifeMasteryFlow } from "@/src/goals/components/life-mastery/LifeMasteryFlow"

export default function LifeMasteryV1TestPage() {
  return <LifeMasteryFlow />
}
