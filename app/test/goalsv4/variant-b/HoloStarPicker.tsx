"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Star, Trophy, Target, Zap, Heart, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCatalogGroups, getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CYAN = "#00f0ff"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_WORK",
  results: "RESULTS",
  dirty_dog: "DIRTY_DOG",
  texting: "TEXTING",
  dates: "DATING",
  relationship: "RELATIONSHIP",
}

const CATEGORY_ICONS: Partial<Record<GoalDisplayCategory, typeof Target>> = {
  field_work: Zap,
  results: Target,
  dirty_dog: Flame,
  texting: Star,
  dates: Heart,
  relationship: Trophy,
}

interface HoloStarPickerProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function HoloStarPicker({ path, onBack, onConfirm }: HoloStarPickerProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person" ? "#ec4899" : "#f97316"
  const pathLabel = path === "one_person" ? "FIND_THE_ONE" : "ABUNDANCE"
  const PathIcon = path === "one_person" ? Heart : Flame

  const relevantL2s = useMemo(() => {
    if (!selectedL1) return []
    return tiers.tier2
  }, [selectedL1, tiers.tier2])

  const l3ByCategory = useMemo(() => tiers.tier3, [tiers.tier3])

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

  const totalSelected = (selectedL1 ? 1 : 0) + selectedL2Ids.size + selectedL3Ids.size

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm transition-colors cursor-pointer"
          style={{ color: "rgba(0, 240, 255, 0.5)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
        >
          <ArrowLeft className="size-4" />
          BACK
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-4" style={{ color: pathColor }} />
          <span
            className="text-sm font-bold"
            style={{
              color: pathColor,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.1em",
            }}
          >
            {pathLabel}
          </span>
        </div>
      </div>

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-6 text-xs font-bold"
            style={{
              backgroundColor: CYAN,
              color: "#020a14",
              borderRadius: 2,
              boxShadow: `0 0 8px rgba(0, 240, 255, 0.4)`,
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            }}
          >
            01
          </div>
          <h2
            className="text-lg font-bold"
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              letterSpacing: "0.05em",
            }}
          >
            PRIMARY TARGET
          </h2>
        </div>
        <p
          className="text-sm ml-8"
          style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: 12 }}
        >
          Select the core objective. All subsystems align to this vector.
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
                className="relative flex items-center gap-3 p-4 text-left transition-all duration-200 cursor-pointer"
                style={{
                  border: isSelected ? `2px solid ${CYAN}60` : `1px solid rgba(0, 240, 255, 0.08)`,
                  backgroundColor: isSelected ? "rgba(0, 240, 255, 0.04)" : "transparent",
                  boxShadow: isSelected ? `0 0 15px rgba(0, 240, 255, 0.08)` : "none",
                  borderRadius: 4,
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 size-5 flex items-center justify-center"
                    style={{ backgroundColor: CYAN, borderRadius: 2 }}
                  >
                    <Check className="size-3" style={{ color: "#020a14" }} />
                  </div>
                )}
                <div className="p-2" style={{ backgroundColor: "rgba(0, 240, 255, 0.06)", borderRadius: 2 }}>
                  <Star className="size-4" style={{ color: CYAN }} />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {l1.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2 */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 text-xs font-bold"
              style={{
                backgroundColor: CYAN,
                color: "#020a14",
                borderRadius: 2,
                boxShadow: `0 0 8px rgba(0, 240, 255, 0.4)`,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              02
            </div>
            <h2
              className="text-lg font-bold"
              style={{
                color: "rgba(255,255,255,0.9)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.05em",
              }}
            >
              SUBSYSTEMS
            </h2>
          </div>
          <p
            className="text-sm ml-8"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: 12 }}
          >
            Enable the achievement modules that align with your objective.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter((c) => c.level === 3).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  className="flex items-center gap-3 p-3 text-left transition-all duration-200 cursor-pointer"
                  style={{
                    border: isSelected ? `1px solid rgba(0, 240, 255, 0.25)` : "1px solid rgba(0, 240, 255, 0.05)",
                    backgroundColor: isSelected ? "rgba(0, 240, 255, 0.03)" : "transparent",
                    borderRadius: 4,
                  }}
                >
                  <div
                    className="size-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: isSelected ? CYAN : "rgba(0, 240, 255, 0.15)",
                      backgroundColor: isSelected ? CYAN : "transparent",
                      borderRadius: 2,
                    }}
                  >
                    {isSelected && <Check className="size-3" style={{ color: "#020a14" }} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {l2.title}
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: "rgba(0, 240, 255, 0.3)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
                      {childCount} NODES
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 text-xs font-bold"
              style={{
                backgroundColor: CYAN,
                color: "#020a14",
                borderRadius: 2,
                boxShadow: `0 0 8px rgba(0, 240, 255, 0.4)`,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              03
            </div>
            <h2
              className="text-lg font-bold"
              style={{
                color: "rgba(255,255,255,0.9)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.05em",
              }}
            >
              DATA POINTS
            </h2>
          </div>
          <p
            className="text-sm ml-8"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: 12 }}
          >
            Individual metrics and tracking targets. Deselect anything outside mission scope.
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
                  className="overflow-hidden"
                  style={{ border: "1px solid rgba(0, 240, 255, 0.05)", borderRadius: 4 }}
                >
                  <div
                    className="flex items-center gap-3 p-3"
                    style={{ backgroundColor: "rgba(0, 240, 255, 0.02)" }}
                  >
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" style={{ color: "rgba(0, 240, 255, 0.4)" }} />
                      ) : (
                        <ChevronRight className="size-4" style={{ color: "rgba(0, 240, 255, 0.4)" }} />
                      )}
                      <CatIcon className="size-4" style={{ color: "rgba(0, 240, 255, 0.25)" }} />
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: "rgba(255,255,255,0.75)",
                          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
                      </span>
                      <span
                        className="text-xs"
                        style={{
                          color: "rgba(0, 240, 255, 0.35)",
                          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        }}
                      >
                        [{selectedInCat}/{goals.length}]
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-xs transition-colors cursor-pointer"
                      style={{
                        color: "rgba(0, 240, 255, 0.4)",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
                      {allSelected ? "[NONE]" : "[ALL]"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1">
                      {isDirtyDog && (
                        <p
                          className="text-xs italic mb-2 pl-6"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                        >
                          Sensitive data points. Enable if relevant to your mission parameters.
                        </p>
                      )}
                      {goals.map((goal) => {
                        const isSelected = selectedL3Ids.has(goal.id)
                        const isRamp = goal.templateType === "habit_ramp"
                        return (
                          <button
                            key={goal.id}
                            onClick={() => toggleL3(goal.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-150 cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? "rgba(0, 240, 255, 0.03)" : "transparent",
                              borderRadius: 2,
                            }}
                          >
                            <div
                              className="size-4 border flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{
                                borderColor: isSelected ? CYAN : "rgba(0, 240, 255, 0.12)",
                                backgroundColor: isSelected ? CYAN : "transparent",
                                borderRadius: 2,
                              }}
                            >
                              {isSelected && <Check className="size-2.5" style={{ color: "#020a14" }} />}
                            </div>
                            <span
                              className="text-sm flex-1"
                              style={{ color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)" }}
                            >
                              {goal.title}
                            </span>
                            <span
                              className="text-[10px] flex-shrink-0"
                              style={{
                                color: "rgba(0, 240, 255, 0.25)",
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                              }}
                            >
                              {isRamp ? "HABIT" : "MILESTONE"}
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
            backgroundColor: "rgba(2, 10, 20, 0.95)",
            borderTop: "1px solid rgba(0, 240, 255, 0.08)",
          }}
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div
              className="text-sm"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              <span className="font-bold" style={{ color: CYAN }}>
                {totalSelected}
              </span>{" "}
              NODES SELECTED
              <span className="text-xs ml-2" style={{ color: "rgba(0, 240, 255, 0.3)" }}>
                [1 PRIMARY + {selectedL2Ids.size} SUB + {selectedL3Ids.size} DATA]
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-6 cursor-pointer font-bold"
              style={{
                backgroundColor: CYAN,
                color: "#020a14",
                boxShadow: `0 0 12px rgba(0, 240, 255, 0.3)`,
                borderRadius: 4,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.05em",
              }}
            >
              CONFIGURE
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
