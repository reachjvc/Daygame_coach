"use client"

import { GoalCard } from "./GoalCard"
import type { GoalTreeNode, GoalWithProgress } from "../types"

interface GoalChainExpanderProps {
  node: GoalTreeNode
  allGoals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue?: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
  depth?: number
}

export function GoalChainExpander({
  node,
  allGoals,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
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
            onSetValue={onSetValue}
            onComplete={onComplete}
            onReset={onReset}
            onEdit={onEdit}
            onAddChild={onAddChild}
          />
          <GoalChainExpander
            node={child}
            allGoals={allGoals}
            onIncrement={onIncrement}
            onSetValue={onSetValue}
            onComplete={onComplete}
            onReset={onReset}
            onEdit={onEdit}
            onAddChild={onAddChild}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  )
}
