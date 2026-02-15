"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Milestone, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildPreviewState, applyPreviewState } from "../goalsService"
import type { BatchGoalInsert } from "../treeGenerationService"
import type { PreviewGoalState, GoalDisplayCategory } from "../types"

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog Goals",
}

const CATEGORY_ORDER: GoalDisplayCategory[] = ["field_work", "results", "dirty_dog"]

interface GoalTreePreviewProps {
  inserts: BatchGoalInsert[]
  existingTemplateIds?: Set<string>
  onConfirm: (filteredInserts: BatchGoalInsert[]) => void
  onBack: () => void
}

export function GoalTreePreview({ inserts, existingTemplateIds, onConfirm, onBack }: GoalTreePreviewProps) {
  const [previewState, setPreviewState] = useState<Map<string, PreviewGoalState>>(
    () => {
      const state = buildPreviewState(inserts)
      // Pre-disable goals that user already has
      if (existingTemplateIds && existingTemplateIds.size > 0) {
        for (const insert of inserts) {
          if (insert.template_id && existingTemplateIds.has(insert.template_id)) {
            const current = state.get(insert._tempId)
            if (current) {
              state.set(insert._tempId, { ...current, enabled: false })
            }
          }
        }
      }
      return state
    }
  )

  const structural = useMemo(
    () => inserts.filter((i) => (i.goal_level ?? 0) < 3),
    [inserts]
  )

  const l3ByCategory = useMemo(() => {
    const grouped: Partial<Record<GoalDisplayCategory, BatchGoalInsert[]>> = {}
    for (const insert of inserts) {
      if ((insert.goal_level ?? 0) !== 3) continue
      const cat = (insert.display_category as GoalDisplayCategory) ?? "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat]!.push(insert)
    }
    return grouped
  }, [inserts])

  const enabledCount = useMemo(() => {
    let count = 0
    for (const [, s] of previewState) {
      if (s.enabled) count++
    }
    return count
  }, [previewState])

  const allL3AlreadyTracked = useMemo(() => {
    if (!existingTemplateIds || existingTemplateIds.size === 0) return false
    const l3Inserts = inserts.filter((i) => (i.goal_level ?? 0) === 3)
    return l3Inserts.length > 0 && l3Inserts.every((i) => i.template_id && existingTemplateIds.has(i.template_id))
  }, [inserts, existingTemplateIds])

  const rootGoal = structural.find((s) => !s._tempParentId)
  const l2Goals = structural.filter((s) => (s.goal_level ?? 0) === 2)

  const toggleGoal = (tempId: string) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(tempId)
      if (current) {
        next.set(tempId, { ...current, enabled: !current.enabled })
      }
      return next
    })
  }

  const updateTarget = (tempId: string, value: number) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(tempId)
      if (current) {
        next.set(tempId, { ...current, targetValue: value })
      }
      return next
    })
  }

  const toggleCategory = (category: GoalDisplayCategory, enabled: boolean) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const goals = l3ByCategory[category] ?? []
      for (const g of goals) {
        const current = next.get(g._tempId)
        if (current) {
          next.set(g._tempId, { ...current, enabled })
        }
      }
      return next
    })
  }

  const handleConfirm = () => {
    const filtered = applyPreviewState(inserts, previewState)
    onConfirm(filtered)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Back to catalog
        </button>
        <h2 className="text-xl font-bold">Customize Your Goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle goals on or off, and adjust targets before creating.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        {rootGoal && (
          <p className="font-semibold text-sm">{rootGoal.title}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {enabledCount} {enabledCount === 1 ? "goal" : "goals"} selected
        </p>
        {l2Goals.length > 0 && (
          <div className="flex gap-2 mt-2">
            {l2Goals.map((g) => (
              <span
                key={g._tempId}
                className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5"
              >
                {g.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* L3 Goals by Category */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const goals = l3ByCategory[cat]
          if (!goals || goals.length === 0) return null
          return (
            <CategorySection
              key={cat}
              category={cat}
              goals={goals}
              previewState={previewState}
              existingTemplateIds={existingTemplateIds}
              defaultCollapsed={cat === "dirty_dog"}
              onToggle={toggleGoal}
              onToggleCategory={toggleCategory}
              onUpdateTarget={updateTarget}
            />
          )
        })}
      </div>

      {/* All-tracked notice */}
      {allL3AlreadyTracked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          All sub-goals are already active in another tree. Creating this adds a top-level goal only — you can add custom sub-goals to it afterward via &quot;New Goal&quot;.
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleConfirm} className="flex-1">
          Create {enabledCount} {enabledCount === 1 ? "Goal" : "Goals"}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Category Section
// ============================================================================

interface CategorySectionProps {
  category: GoalDisplayCategory
  goals: BatchGoalInsert[]
  previewState: Map<string, PreviewGoalState>
  existingTemplateIds?: Set<string>
  defaultCollapsed: boolean
  onToggle: (tempId: string) => void
  onToggleCategory: (category: GoalDisplayCategory, enabled: boolean) => void
  onUpdateTarget: (tempId: string, value: number) => void
}

function CategorySection({
  category,
  goals,
  previewState,
  existingTemplateIds,
  defaultCollapsed,
  onToggle,
  onToggleCategory,
  onUpdateTarget,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const label = CATEGORY_LABELS[category]

  const enabledInCategory = goals.filter(
    (g) => previewState.get(g._tempId)?.enabled
  ).length
  const allEnabled = enabledInCategory === goals.length
  const noneEnabled = enabledInCategory === 0

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          <span>{label}</span>
          <span className="text-muted-foreground/50">
            {enabledInCategory}/{goals.length}
          </span>
        </button>
        <div className="flex-1 border-t border-border/50 ml-2" />
        <button
          onClick={() => onToggleCategory(category, noneEnabled || !allEnabled)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {allEnabled ? "Deselect all" : "Select all"}
        </button>
      </div>

      {category === "dirty_dog" && !collapsed && noneEnabled && (
        <p className="text-xs text-muted-foreground/70 mb-2 ml-5">
          These track intimate outcomes. Opt in if relevant to your goals.
        </p>
      )}

      {!collapsed && (
        <div className="space-y-1.5">
          {goals.map((goal) => {
            const state = previewState.get(goal._tempId)
            if (!state) return null
            return (
              <GoalPreviewRow
                key={goal._tempId}
                goal={goal}
                state={state}
                isExisting={!!(goal.template_id && existingTemplateIds?.has(goal.template_id))}
                onToggle={() => onToggle(goal._tempId)}
                onUpdateTarget={(val) => onUpdateTarget(goal._tempId, val)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Goal Preview Row
// ============================================================================

interface GoalPreviewRowProps {
  goal: BatchGoalInsert
  state: PreviewGoalState
  isExisting?: boolean
  onToggle: () => void
  onUpdateTarget: (value: number) => void
}

function GoalPreviewRow({ goal, state, isExisting = false, onToggle, onUpdateTarget }: GoalPreviewRowProps) {
  const isRamp = goal.goal_type === "habit_ramp"
  const targetLabel = isRamp ? `${state.targetValue}/wk` : state.targetValue.toLocaleString()

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        state.enabled
          ? "border-border bg-card"
          : "border-border/50 bg-muted/30 opacity-60"
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${
          state.enabled ? "bg-primary" : "bg-muted"
        }`}
        role="switch"
        aria-checked={state.enabled}
      >
        <span
          className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${
            state.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{goal.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isRamp ? (
            <span className="flex items-center gap-1">
              <Repeat className="size-3" />
              Habit Ramp
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Milestone className="size-3" />
              Milestone Ladder
            </span>
          )}
          {goal.linked_metric && (
            <span className="text-blue-400">Auto-synced</span>
          )}
          {isExisting && (
            <span className="text-amber-400">Already tracking</span>
          )}
        </div>
      </div>

      {/* Target editor */}
      {state.enabled && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Target:</span>
          <input
            type="number"
            value={state.targetValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v > 0) onUpdateTarget(v)
            }}
            className="w-16 text-right text-sm font-medium bg-transparent border border-border/50 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
            min={1}
          />
          {isRamp && <span className="text-xs text-muted-foreground">/wk</span>}
        </div>
      )}
    </div>
  )
}
