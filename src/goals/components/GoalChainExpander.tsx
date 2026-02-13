"use client"

import { GoalCard } from "./GoalCard"
import type { GoalTreeNode, GoalWithProgress } from "../types"

interface GoalChainExpanderProps {
  node: GoalTreeNode
  allGoals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  depth?: number
}

export function GoalChainExpander({
  node,
  allGoals,
  onIncrement,
  onReset,
  onEdit,
  depth = 0,
}: GoalChainExpanderProps) {
  if (node.children.length === 0) return null

  return (
    <div className="mt-2 space-y-2" style={{ marginLeft: depth === 0 ? 24 : 16 }}>
      {node.children.map((child) => (
        <div key={child.id}>
          <GoalCard
            goal={child}
            allGoals={allGoals}
            variant="compact"
            onIncrement={onIncrement}
            onReset={onReset}
            onEdit={onEdit}
          />
          <GoalChainExpander
            node={child}
            allGoals={allGoals}
            onIncrement={onIncrement}
            onReset={onReset}
            onEdit={onEdit}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  )
}
