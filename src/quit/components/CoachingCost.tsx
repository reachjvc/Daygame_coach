"use client"

import { useEffect, useState } from "react"
import { coachingLabels, formatUsd, yearlyCost } from "../coaching"
import { RECORD_TOOL_KEY } from "../record"
import { useQuitStore } from "../store"
import type { QuitAddictionId } from "../types"

/** His yearly cost from the shared record, when a count and a price are in it. */
export function CoachingCost({ addiction }: { addiction: QuitAddictionId }) {
  const store = useQuitStore()
  const [year, setYear] = useState<number | null>(null)
  useEffect(() => {
    setYear(yearlyCost(store.get(addiction, RECORD_TOOL_KEY)))
  }, [store, addiction])
  if (year === null) return null
  return (
    <p data-testid="coaching-cost" className="mt-4 text-lg font-medium">
      {coachingLabels.costLabel}: {formatUsd(year)}
    </p>
  )
}
