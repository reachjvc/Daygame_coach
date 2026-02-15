"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown, Flame, Calendar, Plus, RotateCcw, Check } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import type { GoalTreeNode, GoalWithProgress } from "../../types"

interface TreeViewProps {
  tree: GoalTreeNode[]
  allGoals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onCreateGoal?: () => void
  filterAreaName?: string | null
}

export function TreeView({ tree, allGoals, onIncrement, onReset, onEdit, onCreateGoal, filterAreaName }: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Start with top-level nodes expanded
    return new Set(tree.map((n) => n.id))
  })

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds = new Set<string>()
    const collectIds = (nodes: GoalTreeNode[]) => {
      for (const node of nodes) {
        allIds.add(node.id)
        collectIds(node.children)
      }
    }
    collectIds(tree)
    setExpandedIds(allIds)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <GoalIcon className="size-7 text-primary" />
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
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={expandAll}>
          <ChevronsUpDown className="size-3 mr-1" />
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <ChevronsDownUp className="size-3 mr-1" />
          Collapse All
        </Button>
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            onToggle={toggleNode}
            onEdit={onEdit}
            onIncrement={onIncrement}
            onReset={onReset}
          />
        ))}
      </div>
    </div>
  )
}

interface TreeNodeProps {
  node: GoalTreeNode
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (goal: GoalWithProgress) => void
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
}

function TreeNode({ node, depth, expandedIds, onToggle, onEdit, onIncrement, onReset }: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const config = getLifeAreaConfig(node.life_area)
  const isBoolean = node.tracking_type === "boolean"
  const isOverdue = node.goal_type === "milestone" && node.days_remaining !== null && node.days_remaining <= 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors group"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          className="size-5 flex items-center justify-center flex-shrink-0"
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          )}
        </button>

        {/* Life area color dot */}
        <span
          className="size-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.hex }}
        />

        {/* Title */}
        <span
          className="text-sm font-medium truncate cursor-pointer hover:underline flex-1"
          onClick={() => onEdit(node)}
        >
          {node.title}
        </span>

        {/* Progress bar mini */}
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
          <div
            className="h-full rounded-full"
            style={{ width: `${node.progress_percentage}%`, backgroundColor: config.hex }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0">
          {isBoolean
            ? (node.is_complete ? "Done" : "Not done")
            : `${node.progress_percentage}%`
          }
        </span>

        {/* Streak badge */}
        {node.current_streak > 0 && (
          <Badge variant="outline" className="text-xs gap-1 py-0 h-5 flex-shrink-0">
            <Flame className="size-3 text-orange-500" />
            {node.current_streak}
          </Badge>
        )}

        {/* Days remaining */}
        {node.goal_type === "milestone" && node.days_remaining !== null && (
          <span className={`text-xs flex items-center gap-1 flex-shrink-0 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <Calendar className="size-3" />
            {node.days_remaining > 0 ? `${node.days_remaining}d` : "Overdue"}
          </span>
        )}

        {/* Children count */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            ({node.children.length})
          </span>
        )}

        {/* Quick actions on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
          {!node.is_complete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onIncrement(node.id, 1) }}
              title={isBoolean ? "Mark done" : "+1"}
            >
              {isBoolean ? <Check className="size-3" /> : <Plus className="size-3" />}
            </Button>
          )}
          {node.goal_type === "recurring" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onReset(node.id) }}
              title="Reset"
            >
              <RotateCcw className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onIncrement={onIncrement}
              onReset={onReset}
            />
          ))}
        </div>
      )}
    </div>
  )
}
