"use client"

import { useState, useMemo } from "react"
import { Loader2, Library, Heart, Flame, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCatalogGroups } from "../data/goalGraph"
import { generateGoalTreeInserts } from "../treeGenerationService"
import { GoalTreePreview } from "./GoalTreePreview"
import type { GoalTemplate, GoalWithProgress } from "../types"
import type { BatchGoalInsert } from "../treeGenerationService"

interface GoalCatalogPickerProps {
  onTreeCreated: () => void
  existingGoals?: GoalWithProgress[]
  onClose?: () => void
  onCreateManual?: () => void
}

export function GoalCatalogPicker({ onTreeCreated, existingGoals, onClose, onCreateManual }: GoalCatalogPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewInserts, setPreviewInserts] = useState<BatchGoalInsert[] | null>(null)
  const groups = getCatalogGroups()

  const existingTemplateIds = useMemo(
    () => new Set((existingGoals ?? []).map((g) => g.template_id).filter(Boolean) as string[]),
    [existingGoals]
  )

  const isModalMode = !!onClose

  const handlePick = (template: GoalTemplate) => {
    if (existingTemplateIds.has(template.id)) return
    setError(null)
    const inserts = generateGoalTreeInserts(template.id)
    if (inserts.length === 0) {
      setError("Could not generate goal tree")
      return
    }
    setPreviewInserts(inserts)
  }

  const handleConfirm = async (filteredInserts: BatchGoalInsert[]) => {
    setIsCreating(true)
    setError(null)

    try {
      // Remap parent IDs for L3 goals whose L2 parent already exists
      const remappedInserts = remapExistingParents(filteredInserts, existingGoals ?? [])

      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: remappedInserts }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create goals")
      }

      onTreeCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal tree")
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    setPreviewInserts(null)
    setError(null)
  }

  const content = isCreating ? (
    <div className="text-center py-16">
      <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-1">Building your goal tree...</h3>
      <p className="text-sm text-muted-foreground">
        Setting up achievements, milestones, and tracking goals
      </p>
    </div>
  ) : previewInserts ? (
    <>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center mb-4">
          {error}
        </div>
      )}
      <GoalTreePreview
        inserts={previewInserts}
        existingTemplateIds={existingTemplateIds}
        onConfirm={handleConfirm}
        onBack={handleBack}
      />
    </>
  ) : (
    <div className="space-y-8">
      <div className="text-center">
        <Library className="size-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-1">
          {isModalMode ? "Add Goal Tree" : "Just get me started"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Pick one goal. We&apos;ll build your full goal tree with milestones,
          achievements, and tracking — all customizable before saving.
        </p>
        {onCreateManual && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onCreateManual}
          >
            or create your own from scratch
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* One Person goals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="size-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Find the one
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.onePerson.map((tmpl) => (
            <GoalPickCard
              key={tmpl.id}
              template={tmpl}
              isActive={existingTemplateIds.has(tmpl.id)}
              onPick={handlePick}
            />
          ))}
        </div>
      </section>

      {/* Abundance goals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="size-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dating abundance
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.abundance.map((tmpl) => (
            <GoalPickCard
              key={tmpl.id}
              template={tmpl}
              isActive={existingTemplateIds.has(tmpl.id)}
              onPick={handlePick}
            />
          ))}
        </div>
      </section>

    </div>
  )

  if (!isModalMode) return <div data-testid="goal-catalog-picker">{content}</div>

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8" data-testid="goal-catalog-picker">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-full overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
        {content}
      </div>
    </div>
  )
}

function GoalPickCard({
  template,
  isActive = false,
  onPick,
}: {
  template: GoalTemplate
  isActive?: boolean
  onPick: (t: GoalTemplate) => void
}) {
  if (isActive) {
    return (
      <div className="w-full text-left rounded-lg border border-border/50 bg-muted/30 p-4 opacity-60 cursor-default" data-testid={`catalog-card-${template.id}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-muted-foreground">
            {template.title}
          </span>
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30" data-testid={`catalog-active-${template.id}`}>
            Active
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => onPick(template)}
      className="w-full text-left rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:bg-card/80 hover:shadow-sm cursor-pointer group"
      data-testid={`catalog-card-${template.id}`}
    >
      <span className="font-medium text-sm group-hover:text-primary transition-colors">
        {template.title}
      </span>
    </button>
  )
}

/**
 * Remap parent IDs in inserts so that new L3 goals reference existing L2 parents
 * instead of temp IDs that point to duplicate L2 goals.
 */
function remapExistingParents(
  inserts: BatchGoalInsert[],
  existingGoals: GoalWithProgress[]
): BatchGoalInsert[] {
  if (existingGoals.length === 0) return inserts

  // Build a map of template_id → existing goal ID for L2 goals
  const existingL2Map = new Map<string, string>()
  for (const g of existingGoals) {
    if (g.goal_level === 2 && g.template_id) {
      existingL2Map.set(g.template_id, g.id)
    }
  }

  // Build a map of _tempId → template_id for inserts
  const tempIdToTemplate = new Map<string, string>()
  for (const insert of inserts) {
    if (insert.template_id) {
      tempIdToTemplate.set(insert._tempId, insert.template_id)
    }
  }

  return inserts.map((insert) => {
    if (!insert._tempParentId) return insert

    // Check if the parent is an L2 that already exists
    const parentTemplateId = tempIdToTemplate.get(insert._tempParentId)
    if (parentTemplateId && existingL2Map.has(parentTemplateId)) {
      return {
        ...insert,
        _tempParentId: null,
        parent_goal_id: existingL2Map.get(parentTemplateId)!,
      }
    }

    return insert
  })
}
