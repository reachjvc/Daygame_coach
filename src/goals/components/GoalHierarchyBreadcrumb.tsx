"use client"

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress } from "../types"

interface GoalHierarchyBreadcrumbProps {
  goal: GoalWithProgress
  allGoals: GoalWithProgress[]
  onNavigate?: (goalId: string) => void
  maxItems?: number
}

export function GoalHierarchyBreadcrumb({
  goal,
  allGoals,
  onNavigate,
  maxItems = 3,
}: GoalHierarchyBreadcrumbProps) {
  const ancestors = useMemo(() => {
    const goalMap = new Map(allGoals.map((g) => [g.id, g]))
    const chain: GoalWithProgress[] = []
    let current = goal.parent_goal_id ? goalMap.get(goal.parent_goal_id) : undefined

    while (current) {
      chain.unshift(current)
      current = current.parent_goal_id ? goalMap.get(current.parent_goal_id) : undefined
    }

    return chain
  }, [goal, allGoals])

  if (ancestors.length === 0) return null

  const areaConfig = getLifeAreaConfig(goal.life_area)

  // Truncate long chains
  const displayAncestors =
    ancestors.length > maxItems
      ? [ancestors[0], null, ...ancestors.slice(-(maxItems - 2))]
      : ancestors

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 flex-wrap">
      <span style={{ color: areaConfig.hex }} className="font-medium">
        {areaConfig.name}
      </span>
      {displayAncestors.map((ancestor, i) => (
        <span key={ancestor ? ancestor.id : `ellipsis-${i}`} className="flex items-center gap-1">
          <ChevronRight className="size-3 flex-shrink-0" />
          {ancestor ? (
            <span
              className={onNavigate ? "cursor-pointer hover:underline" : undefined}
              onClick={() => ancestor && onNavigate?.(ancestor.id)}
            >
              {ancestor.title.length > 20
                ? ancestor.title.slice(0, 20) + "..."
                : ancestor.title}
            </span>
          ) : (
            <span>...</span>
          )}
        </span>
      ))}
    </div>
  )
}
