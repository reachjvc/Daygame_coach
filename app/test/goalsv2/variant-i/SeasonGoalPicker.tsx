"use client"

import { useState, useMemo } from "react"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Star,
  Trophy,
  Target,
  Zap,
  Heart,
  Flame,
  Sprout,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getCatalogGroups,
  getCatalogTiers,
  getChildren,
} from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const CATEGORY_ICONS: Partial<Record<GoalDisplayCategory, typeof Target>> = {
  field_work: Zap,
  results: Target,
  dirty_dog: Flame,
  texting: Star,
  dates: Heart,
  relationship: Trophy,
}

interface SeasonGoalPickerProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (
    selectedL1: GoalTemplate,
    selectedL2s: GoalTemplate[],
    selectedL3s: GoalTemplate[]
  ) => void
}

export function SeasonGoalPicker({
  path,
  onBack,
  onConfirm,
}: SeasonGoalPickerProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["field_work", "results"])
  )

  const pathColor = path === "one_person" ? "#ec4899" : "#f97316"
  const pathLabel = path === "one_person" ? "Find the One" : "Abundance"
  const PathIcon = path === "one_person" ? Heart : Flame

  const relevantL2s = useMemo(() => {
    if (!selectedL1) return []
    return tiers.tier2
  }, [selectedL1, tiers.tier2])

  const l3ByCategory = useMemo(() => {
    return tiers.tier3
  }, [tiers.tier3])

  const toggleL2 = (id: string) => {
    setSelectedL2Ids((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        const l3Children = getChildren(id).filter((c) => c.level === 3)
        for (const child of l3Children) {
          const otherL2sReferencing = Array.from(next).some((otherId) =>
            getChildren(otherId).some((c) => c.id === child.id)
          )
          if (!otherL2sReferencing) {
            setSelectedL3Ids((prev3) => {
              const next3 = new Set(prev3)
              next3.delete(child.id)
              return next3
            })
          }
        }
      } else {
        next.add(id)
        const l3Children = getChildren(id).filter(
          (c) => c.level === 3 && c.displayCategory !== "dirty_dog"
        )
        for (const child of l3Children) {
          setSelectedL3Ids((prev3) => new Set(prev3).add(child.id))
        }
      }
      return next
    })
  }

  const toggleL3 = (id: string) => {
    setSelectedL3Ids((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const selectAllInCategory = (cat: GoalDisplayCategory) => {
    const goals = l3ByCategory[cat] || []
    const allSelected = goals.every((g) => selectedL3Ids.has(g.id))
    if (allSelected) {
      setSelectedL3Ids((prev) => {
        const next = new Set(prev)
        goals.forEach((g) => next.delete(g.id))
        return next
      })
    } else {
      setSelectedL3Ids((prev) => {
        const next = new Set(prev)
        goals.forEach((g) => next.add(g.id))
        return next
      })
    }
  }

  const handleConfirm = () => {
    if (!selectedL1) return
    const l2Templates = tiers.tier2.filter((t) => selectedL2Ids.has(t.id))
    const allL3 = Object.values(l3ByCategory).flat()
    const l3Templates = allL3.filter((t) => selectedL3Ids.has(t.id))
    onConfirm(selectedL1, l2Templates, l3Templates)
  }

  const totalSelected = 1 + selectedL2Ids.size + selectedL3Ids.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-4" style={{ color: pathColor }} />
          <span className="text-sm font-medium" style={{ color: pathColor }}>
            {pathLabel}
          </span>
        </div>
      </div>

      {/* Step 1: Choose your seed (big goal) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "#86efac" }}
          >
            <Sprout className="size-3.5" />
          </div>
          <h2 className="text-lg font-bold">Choose your seed</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          What do you want to grow this year? This is the vision everything
          else sprouts from.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
          {l1Options.map((l1) => {
            const isSelected = selectedL1?.id === l1.id
            return (
              <button
                key={l1.id}
                onClick={() => {
                  setSelectedL1(l1)
                  if (!selectedL1 || selectedL1.id !== l1.id) {
                    const defaultL2s = tiers.tier2.slice(0, 3)
                    const l2Set = new Set(defaultL2s.map((t) => t.id))
                    setSelectedL2Ids(l2Set)
                    const autoL3 = new Set<string>()
                    for (const l2 of defaultL2s) {
                      const children = getChildren(l2.id).filter(
                        (c) =>
                          c.level === 3 &&
                          c.displayCategory !== "dirty_dog"
                      )
                      children.forEach((c) => autoL3.add(c.id))
                    }
                    setSelectedL3Ids(autoL3)
                  }
                }}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "shadow-md"
                    : "border-border hover:border-border/80 hover:bg-muted/20"
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: `${pathColor}60`,
                        backgroundColor: `${pathColor}08`,
                        boxShadow: `0 0 20px ${pathColor}10`,
                      }
                    : undefined
                }
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: pathColor }}
                  >
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div
                  className="rounded-lg p-2"
                  style={{ backgroundColor: `${pathColor}12` }}
                >
                  <Sprout className="size-4" style={{ color: pathColor }} />
                </div>
                <span className="text-sm font-medium">{l1.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Achievements to cultivate */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#fbbf24" }}
            >
              2
            </div>
            <h2 className="text-lg font-bold">Cultivate achievements</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            These are transformations that grow from your seed. Select what
            resonates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter(
                (c) => c.level === 3
              ).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-amber-400/40 bg-amber-500/5"
                      : "border-border/50 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <div
                    className={`size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-500"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="size-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {l2.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {childCount} trackable goals
                    </div>
                  </div>
                  <Trophy className="size-4 text-muted-foreground/30 ml-auto flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: What you'll track */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#f97316" }}
            >
              3
            </div>
            <h2 className="text-lg font-bold">What you'll grow</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            The specific metrics and habits. Toggle off anything that doesn't
            fit your garden.
          </p>

          <div className="space-y-2 ml-8">
            {(
              Object.entries(l3ByCategory) as [
                GoalDisplayCategory,
                GoalTemplate[],
              ][]
            ).map(([cat, goals]) => {
              if (!goals || goals.length === 0) return null
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = goals.filter((g) =>
                selectedL3Ids.has(g.id)
              ).length
              const allSelected = selectedInCat === goals.length
              const isDirtyDog = cat === "dirty_dog"
              const CatIcon = CATEGORY_ICONS[cat] || Target

              return (
                <div
                  key={cat}
                  className="rounded-lg border border-border/50 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 bg-muted/20">
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <CatIcon className="size-4 text-muted-foreground/60" />
                      <span className="text-sm font-semibold">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {allSelected ? "None" : "All"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1">
                      {isDirtyDog && (
                        <p className="text-xs text-muted-foreground/70 italic mb-2 pl-6">
                          Intimate outcomes. Opt in if relevant to your goals.
                        </p>
                      )}
                      {goals.map((goal) => {
                        const isSelected = selectedL3Ids.has(goal.id)
                        const isRamp = goal.templateType === "habit_ramp"
                        return (
                          <button
                            key={goal.id}
                            onClick={() => toggleL3(goal.id)}
                            className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? "bg-green-500/5"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <div
                              className={`size-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "border-green-600 bg-green-600"
                                  : "border-muted-foreground/25"
                              }`}
                            >
                              {isSelected && (
                                <Check className="size-2.5 text-white" />
                              )}
                            </div>
                            <span
                              className={`text-sm flex-1 ${
                                isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {goal.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                              {isRamp ? "habit" : "milestone"}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sticky footer */}
      {selectedL1 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 px-6 py-4 mt-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {totalSelected}
              </span>{" "}
              seeds selected
              <span className="text-xs ml-2">
                (1 vision + {selectedL2Ids.size} achievements +{" "}
                {selectedL3Ids.size} trackable)
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-6"
              style={{ backgroundColor: "#86efac", color: "#1a1a1a" }}
            >
              <Sprout className="size-4 mr-1" />
              Tend Your Garden
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
