"use client"

import { useState, useMemo } from "react"
import { Loader2, Library, Heart, Flame, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCatalogTiers } from "../data/goalGraph"
import { LIFE_AREAS } from "../data/lifeAreas"
import { generateGoalTreeInserts } from "../treeGenerationService"
import { GoalTreePreview } from "./GoalTreePreview"
import type { GoalTemplate, GoalWithProgress, GoalDisplayCategory, LifeAreaConfig } from "../types"
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
  const [selectedAreaId, setSelectedAreaId] = useState<string>("daygame")
  const tiers = getCatalogTiers()

  const existingTemplateIds = useMemo(
    () => new Set((existingGoals ?? []).map((g) => g.template_id).filter(Boolean) as string[]),
    [existingGoals]
  )

  const isModalMode = !!onClose
  const selectedArea = LIFE_AREAS.find((a) => a.id === selectedAreaId)!

  // All areas except custom (no suggestions)
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom")

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
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <Library className="size-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-1">
          {isModalMode ? "Add Goal Tree" : "Just get me started"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Pick a goal at any level. We&apos;ll build your full goal tree — customizable before saving.
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

      {/* 3-column Miller columns layout */}
      <div className="grid grid-cols-[minmax(180px,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)] gap-0 min-h-[340px]">
        {/* Column 1: Categories (Tier 1) */}
        <div className="pr-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Categories</span>
            <div className="flex-1 border-t border-border/30" />
          </div>
          <div className="space-y-0.5">
            {visibleAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150
                  ${selectedAreaId === area.id
                    ? ""
                    : "hover:bg-muted/50"
                  }
                `}
                style={selectedAreaId === area.id ? {
                  backgroundColor: `${area.hex}15`,
                  boxShadow: `inset 0 0 0 1px ${area.hex}40`,
                } : undefined}
              >
                <area.icon
                  className="size-4 flex-shrink-0"
                  style={{ color: selectedAreaId === area.id ? area.hex : "var(--muted-foreground)" }}
                />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: selectedAreaId === area.id ? area.hex : undefined }}
                >
                  {area.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Sub-goals (Tier 2) */}
        <div className="border-l border-border/20 pl-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Goals</span>
            <div className="flex-1 border-t border-border/30" />
          </div>

          {selectedAreaId === "daygame" ? (
            <DaygameTier2
              tiers={tiers}
              existingTemplateIds={existingTemplateIds}
              onPick={handlePick}
              accentColor={selectedArea.hex}
            />
          ) : (
            <SuggestionTier2
              area={selectedArea}
              onCreateManual={onCreateManual}
            />
          )}
        </div>

        {/* Column 3: Specifics (Tier 3) */}
        <div className="border-l border-border/20 pl-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Specifics</span>
            <div className="flex-1 border-t border-border/30" />
          </div>

          {selectedAreaId === "daygame" ? (
            <DaygameTier3
              tiers={tiers}
              existingTemplateIds={existingTemplateIds}
              onPick={handlePick}
              accentColor={selectedArea.hex}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
              Coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!isModalMode) return <div data-testid="goal-catalog-picker">{content}</div>

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8" data-testid="goal-catalog-picker">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-full overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
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

// ============================================================================
// Daygame Tier 2: L1 goals + L2 achievements
// ============================================================================

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
}

function DaygameTier2({
  tiers,
  existingTemplateIds,
  onPick,
  accentColor,
}: {
  tiers: ReturnType<typeof getCatalogTiers>
  existingTemplateIds: Set<string>
  onPick: (t: GoalTemplate) => void
  accentColor: string
}) {
  return (
    <div className="space-y-3">
      {/* Find the One */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Heart className="size-3.5 text-pink-500" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Find the One</span>
        </div>
        <GoalItemList
          items={tiers.tier1.onePerson}
          existingIds={existingTemplateIds}
          onPick={onPick}
          accentColor={accentColor}
        />
      </div>

      {/* Abundance */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Flame className="size-3.5 text-orange-500" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Abundance</span>
        </div>
        <GoalItemList
          items={tiers.tier1.abundance}
          existingIds={existingTemplateIds}
          onPick={onPick}
          accentColor={accentColor}
        />
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Achievements</span>
        </div>
        <GoalItemList
          items={tiers.tier2}
          existingIds={existingTemplateIds}
          onPick={onPick}
          accentColor={accentColor}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Daygame Tier 3: L3 goals grouped by display category
// ============================================================================

function DaygameTier3({
  tiers,
  existingTemplateIds,
  onPick,
  accentColor,
}: {
  tiers: ReturnType<typeof getCatalogTiers>
  existingTemplateIds: Set<string>
  onPick: (t: GoalTemplate) => void
  accentColor: string
}) {
  return (
    <div className="space-y-3">
      {(["field_work", "results", "dirty_dog"] as GoalDisplayCategory[]).map((cat) => {
        const goals = tiers.tier3[cat]
        if (!goals || goals.length === 0) return null
        return (
          <div key={cat}>
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </span>
            <GoalItemList
              items={goals}
              existingIds={existingTemplateIds}
              onPick={onPick}
              accentColor={accentColor}
            />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Suggestion Tier 2 (non-daygame life areas)
// ============================================================================

function SuggestionTier2({
  area,
  onCreateManual,
}: {
  area: LifeAreaConfig
  onCreateManual?: () => void
}) {
  if (area.suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
        No goals yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {area.suggestions.map((s) => (
        <button
          key={s.title}
          onClick={onCreateManual}
          className="w-full text-left px-3 py-2 rounded-md text-[13px] font-medium transition-colors hover:bg-muted/50 cursor-pointer"
          style={{ borderLeft: `2px solid ${area.hex}30` }}
        >
          {s.title}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// GoalItemList — vertical list of clickable goal template cards
// ============================================================================

function GoalItemList({
  items,
  existingIds,
  onPick,
  accentColor,
}: {
  items: GoalTemplate[]
  existingIds: Set<string>
  onPick: (t: GoalTemplate) => void
  accentColor: string
}) {
  return (
    <div className="space-y-1">
      {items.map((tmpl) => {
        const isActive = existingIds.has(tmpl.id)
        return (
          <button
            key={tmpl.id}
            onClick={() => !isActive && onPick(tmpl)}
            disabled={isActive}
            className={`
              w-full relative text-left px-3 py-2 rounded-md text-[13px] font-medium transition-colors
              ${isActive
                ? "bg-muted/30 opacity-50 cursor-default"
                : "hover:bg-muted/50 cursor-pointer"
              }
            `}
            style={{ borderLeft: `2px solid ${isActive ? "var(--border)" : `${accentColor}40`}` }}
            data-testid={`catalog-card-${tmpl.id}`}
          >
            <span className={isActive ? "text-muted-foreground" : ""}>
              {tmpl.title}
            </span>
            {isActive && (
              <Badge
                variant="outline"
                className="absolute top-1 right-1 text-[9px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30"
                data-testid={`catalog-active-${tmpl.id}`}
              >
                Active
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Remap parent IDs in inserts so that new L3 goals reference existing L2 parents
 * instead of temp IDs that point to duplicate L2 goals.
 */
function remapExistingParents(
  inserts: BatchGoalInsert[],
  existingGoals: GoalWithProgress[]
): BatchGoalInsert[] {
  if (existingGoals.length === 0) return inserts

  const existingL2Map = new Map<string, string>()
  for (const g of existingGoals) {
    if (g.goal_level === 2 && g.template_id) {
      existingL2Map.set(g.template_id, g.id)
    }
  }

  const tempIdToTemplate = new Map<string, string>()
  for (const insert of inserts) {
    if (insert.template_id) {
      tempIdToTemplate.set(insert._tempId, insert.template_id)
    }
  }

  return inserts.map((insert) => {
    if (!insert._tempParentId) return insert

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
