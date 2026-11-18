"use client"

import { useEffect, useState } from "react"
import { coachingLabels, formatUsd, yearlyCost } from "../coaching"
import { useQuitStore } from "../store"
import type { QuitAddictionId } from "../types"

/** His yearly cost from the `cost` tool, when he has worked it out in this browser. */
export function CoachingCost({ addiction }: { addiction: QuitAddictionId }) {
  const store = useQuitStore()
  const [year, setYear] = useState<number | null>(null)
  useEffect(() => {
    setYear(yearlyCost(store.get(addiction, "cost")))
  }, [store, addiction])
  if (year === null) return null
  return (
    <p data-testid="coaching-cost" className="mt-4 text-lg font-medium">
      {coachingLabels.costLabel}: {formatUsd(year)}
    </p>
  )
}
