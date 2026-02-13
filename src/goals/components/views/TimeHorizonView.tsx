"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Target, ChevronDown, ChevronRight } from "lucide-react"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { GoalCard } from "../GoalCard"
import { SortableGoalCard } from "../SortableGoalCard"
import { GoalChainExpander } from "../GoalChainExpander"
import { groupGoalsByTimeHorizon } from "../../goalsService"
import { TIME_HORIZONS } from "../../config"
import type { GoalWithProgress, GoalTreeNode } from "../../types"

interface TimeHorizonViewProps {
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  tree: GoalTreeNode[]
  isEditMode?: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
  onReorder?: (goalIds: string[]) => void
  onCreateGoal?: () => void
  filterAreaName?: string | null
}

/** Recursively find a node in the tree by ID */
function findTreeNode(nodes: GoalTreeNode[], id: string): GoalTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findTreeNode(node.children, id)
    if (found) return found
  }
  return null
}

/** Count all descendants of a goal using the tree */
function countDescendants(node: GoalTreeNode): number {
  let count = 0
  for (const child of node.children) {
    count += 1 + countDescendants(child)
  }
  return count
}

function GoalWithChain({
  goal,
  allGoals,
  tree,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
}: {
  goal: GoalWithProgress
  allGoals: GoalWithProgress[]
  tree: GoalTreeNode[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
}) {
  const [isChainExpanded, setIsChainExpanded] = useState(false)
  const treeNode = useMemo(() => findTreeNode(tree, goal.id), [tree, goal.id])
  const descendantCount = treeNode ? countDescendants(treeNode) : 0
  const hasChain = descendantCount > 0

  return (
    <div>
      <div className="flex items-center gap-1">
        {/* Expand/collapse toggle for chain */}
        {hasChain ? (
          <button
            onClick={() => setIsChainExpanded(!isChainExpanded)}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {isChainExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-7" />
        )}
        <div className="flex-1 min-w-0">
          <GoalCard
            goal={goal}
            allGoals={allGoals}
            variant="compact"
            onIncrement={onIncrement}
            onSetValue={onSetValue}
            onComplete={onComplete}
            onReset={onReset}
            onEdit={onEdit}
            onAddChild={onAddChild}
          />
        </div>
      </div>

      {/* Expanded chain */}
      {isChainExpanded && treeNode && (
        <GoalChainExpander
          node={treeNode}
          allGoals={allGoals}
          onIncrement={onIncrement}
          onReset={onReset}
          onEdit={onEdit}
          onAddChild={onAddChild}
        />
      )}
    </div>
  )
}

export function TimeHorizonView({
  goals,
  allGoals,
  tree,
  isEditMode = false,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  onReorder,
  onCreateGoal,
  filterAreaName,
}: TimeHorizonViewProps) {
  // Show root goals AND orphaned children (parent not in current filtered list)
  const rootGoals = useMemo(() => {
    const visibleIds = new Set(goals.map((g) => g.id))
    return goals.filter((g) => !g.parent_goal_id || !visibleIds.has(g.parent_goal_id))
  }, [goals])
  const grouped = useMemo(() => groupGoalsByTimeHorizon(rootGoals), [rootGoals])

  // Build sections in TIME_HORIZONS order, plus Custom at end
  const sections = useMemo(() => {
    const result: { label: string; goals: GoalWithProgress[] }[] = []
    for (const horizon of TIME_HORIZONS) {
      if (grouped[horizon]) {
        result.push({ label: horizon, goals: grouped[horizon] })
      }
    }
    if (grouped["Custom"]) {
      result.push({ label: "Custom", goals: grouped["Custom"] })
    }
    return result
  }, [grouped])

  if (rootGoals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Target className="size-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {filterAreaName ? `No ${filterAreaName} goals` : "No goals yet"}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {filterAreaName
            ? `Create a goal in ${filterAreaName} to see it here.`
            : "Create your first goal to start tracking progress."
          }
        </p>
        {onCreateGoal && (
          <Button onClick={onCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">{section.label}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {section.goals.length}
            </span>
          </div>

          {/* Goals in this horizon */}
          {isEditMode ? (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event
                if (!over || active.id === over.id || !onReorder) return
                const sGoals = section.goals
                const oldIndex = sGoals.findIndex(g => g.id === active.id)
                const newIndex = sGoals.findIndex(g => g.id === over.id)
                if (oldIndex === -1 || newIndex === -1) return
                const reordered = [...sGoals]
                const [moved] = reordered.splice(oldIndex, 1)
                reordered.splice(newIndex, 0, moved)
                onReorder(reordered.map(g => g.id))
              }}
            >
              <SortableContext items={section.goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {section.goals.map((goal) => (
                    <SortableGoalCard
                      key={goal.id}
                      goal={goal}
                      allGoals={allGoals}
                      isEditMode={true}
                      onIncrement={onIncrement}
                      onSetValue={onSetValue}
                      onComplete={onComplete}
                      onReset={onReset}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {section.goals.map((goal) => (
                <GoalWithChain
                  key={goal.id}
                  goal={goal}
                  allGoals={allGoals}
                  tree={tree}
                  onIncrement={onIncrement}
                  onSetValue={onSetValue}
                  onComplete={onComplete}
                  onReset={onReset}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
