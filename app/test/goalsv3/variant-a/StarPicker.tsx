"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Star, Trophy, Target, Zap, Heart, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCatalogGroups, getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
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

interface StarPickerProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function StarPicker({ path, onBack, onConfirm }: StarPickerProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person" ? "#ec4899" : "#f97316"
  const pathLabel = path === "one_person" ? "Find the One" : "Abundance"
  const PathIcon = path === "one_person" ? Heart : Flame

  // Brass accent color for borders and details
  const brassColor = "#cd853f"
  const goldColor = "#daa520"

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
        const l3Children = getChildren(id).filter((c) => c.level === 3 && c.displayCategory !== "dirty_dog")
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
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer" style={{ color: "rgba(205, 133, 63, 0.6)" }}>
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-4" style={{ color: pathColor }} />
          <span className="text-sm font-medium" style={{ color: pathColor }}>{pathLabel}</span>
        </div>
      </div>

      {/* Step 1: Choose your big goal */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
            style={{
              backgroundColor: goldColor,
              color: "#0a0a1a",
              boxShadow: `0 0 8px ${goldColor}60`,
            }}
          >
            1
          </div>
          <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Choose your Polar Star</h2>
        </div>
        <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.45)" }}>
          The fixed point all your orbital paths revolve around.
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
                      const children = getChildren(l2.id).filter((c) => c.level === 3 && c.displayCategory !== "dirty_dog")
                      children.forEach((c) => autoL3.add(c.id))
                    }
                    setSelectedL3Ids(autoL3)
                  }
                }}
                className="relative flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer"
                style={{
                  border: isSelected
                    ? `2px solid ${goldColor}80`
                    : `1px solid rgba(205, 133, 63, 0.12)`,
                  backgroundColor: isSelected ? `${goldColor}08` : "transparent",
                  boxShadow: isSelected ? `0 0 20px ${goldColor}10` : "none",
                }}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center" style={{ backgroundColor: goldColor }}>
                    <Check className="size-3" style={{ color: "#0a0a1a" }} />
                  </div>
                )}
                <div className="rounded-lg p-2" style={{ backgroundColor: `${goldColor}12` }}>
                  <Star className="size-4" style={{ color: goldColor }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{l1.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Achievements to unlock */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
              style={{
                backgroundColor: goldColor,
                color: "#0a0a1a",
                boxShadow: `0 0 8px ${goldColor}60`,
              }}
            >
              2
            </div>
            <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Inner orbit bodies</h2>
          </div>
          <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            These celestial bodies orbit close to your star. Select the ones that matter to you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter((c) => c.level === 3).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  className="flex items-center gap-3 rounded-lg p-3 text-left transition-all duration-200 cursor-pointer"
                  style={{
                    border: isSelected
                      ? `1px solid ${brassColor}50`
                      : "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: isSelected ? `${brassColor}0a` : "transparent",
                  }}
                >
                  <div
                    className="size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: isSelected ? goldColor : "rgba(205, 133, 63, 0.2)",
                      backgroundColor: isSelected ? goldColor : "transparent",
                    }}
                  >
                    {isSelected && <Check className="size-3" style={{ color: "#0a0a1a" }} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{l2.title}</div>
                    <div className="text-xs" style={{ color: "rgba(205, 133, 63, 0.4)" }}>{childCount} trackable goals</div>
                  </div>
                  <Trophy className="size-4 ml-auto flex-shrink-0" style={{ color: "rgba(205, 133, 63, 0.2)" }} />
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
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
              style={{
                backgroundColor: goldColor,
                color: "#0a0a1a",
                boxShadow: `0 0 8px ${goldColor}60`,
              }}
            >
              3
            </div>
            <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Outer orbital debris</h2>
          </div>
          <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            The furthest objects in your system. Toggle off anything outside your scope.
          </p>

          <div className="space-y-2 ml-8">
            {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
              if (!goals || goals.length === 0) return null
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = goals.filter((g) => selectedL3Ids.has(g.id)).length
              const allSelected = selectedInCat === goals.length
              const isDirtyDog = cat === "dirty_dog"
              const CatIcon = CATEGORY_ICONS[cat] ?? Target

              return (
                <div
                  key={cat}
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(205, 133, 63, 0.08)" }}
                >
                  <div className="flex items-center gap-3 p-3" style={{ backgroundColor: "rgba(205, 133, 63, 0.03)" }}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded
                        ? <ChevronDown className="size-4" style={{ color: "rgba(205, 133, 63, 0.5)" }} />
                        : <ChevronRight className="size-4" style={{ color: "rgba(205, 133, 63, 0.5)" }} />
                      }
                      <CatIcon className="size-4" style={{ color: "rgba(205, 133, 63, 0.35)" }} />
                      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-xs" style={{ color: "rgba(205, 133, 63, 0.4)" }}>
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-xs transition-colors cursor-pointer"
                      style={{ color: "rgba(205, 133, 63, 0.5)" }}
                    >
                      {allSelected ? "None" : "All"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1">
                      {isDirtyDog && (
                        <p className="text-xs italic mb-2 pl-6" style={{ color: "rgba(255,255,255,0.3)" }}>
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
                            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-150 cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? `${goldColor}06` : "transparent",
                            }}
                          >
                            <div
                              className="size-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{
                                borderColor: isSelected ? goldColor : "rgba(205, 133, 63, 0.15)",
                                backgroundColor: isSelected ? goldColor : "transparent",
                              }}
                            >
                              {isSelected && <Check className="size-2.5" style={{ color: "#0a0a1a" }} />}
                            </div>
                            <span className="text-sm flex-1" style={{ color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)" }}>
                              {goal.title}
                            </span>
                            <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(205, 133, 63, 0.3)" }}>
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
        <div
          className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6 mt-6"
          style={{
            backgroundColor: "rgba(10, 10, 26, 0.95)",
            borderTop: "1px solid rgba(205, 133, 63, 0.12)",
          }}
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span className="font-semibold" style={{ color: goldColor }}>{totalSelected}</span> celestial bodies
              <span className="text-xs ml-2" style={{ color: "rgba(205, 133, 63, 0.4)" }}>
                (1 star + {selectedL2Ids.size} inner + {selectedL3Ids.size} outer)
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-6 cursor-pointer"
              style={{
                backgroundColor: goldColor,
                color: "#0a0a1a",
                boxShadow: `0 0 12px ${goldColor}40`,
              }}
            >
              Calibrate Instruments
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
