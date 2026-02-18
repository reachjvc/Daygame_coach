"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Heart, Flame, Target, Zap, Star, Trophy } from "lucide-react"
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

interface OrganismPickerProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function OrganismPicker({ path, onBack, onConfirm }: OrganismPickerProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person" ? "#00ffff" : "#ff00ff"
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
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft className="size-4" />
          Surface
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-4" style={{ color: pathColor, filter: `drop-shadow(0 0 4px ${pathColor}80)` }} />
          <span className="text-sm font-medium" style={{ color: pathColor, textShadow: `0 0 8px ${pathColor}40` }}>{pathLabel}</span>
        </div>
      </div>

      {/* Step 1: Choose your central organism */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${pathColor}20`,
              color: pathColor,
              border: `1px solid ${pathColor}30`,
              boxShadow: `0 0 8px ${pathColor}30`,
            }}
          >
            1
          </div>
          <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)", textShadow: `0 0 20px ${pathColor}15` }}>
            Choose your central organism
          </h2>
        </div>
        <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.35)" }}>
          This is the heart of your colony. Every other organism connects back to this one.
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
                className="relative flex items-center gap-3 p-4 text-left transition-all duration-300 cursor-pointer"
                style={{
                  borderRadius: "16px",
                  border: isSelected ? `1.5px solid ${pathColor}50` : "1.5px solid rgba(255,255,255,0.06)",
                  backgroundColor: isSelected ? `${pathColor}06` : "transparent",
                  boxShadow: isSelected ? `0 0 20px ${pathColor}10, inset 0 0 15px ${pathColor}05` : "none",
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `${pathColor}30`,
                      border: `1px solid ${pathColor}50`,
                      boxShadow: `0 0 8px ${pathColor}30`,
                    }}
                  >
                    <Check className="size-3" style={{ color: pathColor }} />
                  </div>
                )}
                <div
                  className="rounded-full p-2"
                  style={{
                    backgroundColor: `${pathColor}10`,
                    boxShadow: isSelected ? `0 0 10px ${pathColor}20` : "none",
                  }}
                >
                  <Star className="size-4" style={{ color: pathColor }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{l1.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Colony nodes */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
              style={{
                backgroundColor: `${pathColor}20`,
                color: pathColor,
                border: `1px solid ${pathColor}30`,
                boxShadow: `0 0 8px ${pathColor}30`,
              }}
            >
              2
            </div>
            <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Colony nodes</h2>
          </div>
          <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.35)" }}>
            Major organisms in your colony. They glow brightest when active.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter((c) => c.level === 3).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  className="flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 cursor-pointer"
                  style={{
                    border: isSelected ? `1px solid ${pathColor}30` : "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: isSelected ? `${pathColor}05` : "transparent",
                    boxShadow: isSelected ? `0 0 12px ${pathColor}08` : "none",
                  }}
                >
                  <div
                    className="size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      borderColor: isSelected ? pathColor : "rgba(255,255,255,0.1)",
                      backgroundColor: isSelected ? `${pathColor}30` : "transparent",
                      boxShadow: isSelected ? `0 0 6px ${pathColor}40` : "none",
                    }}
                  >
                    {isSelected && <Check className="size-3" style={{ color: pathColor }} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{l2.title}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{childCount} organisms</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Satellite organisms */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold"
              style={{
                backgroundColor: `${pathColor}20`,
                color: pathColor,
                border: `1px solid ${pathColor}30`,
                boxShadow: `0 0 8px ${pathColor}30`,
              }}
            >
              3
            </div>
            <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Satellite organisms</h2>
          </div>
          <p className="text-sm ml-8" style={{ color: "rgba(255,255,255,0.35)" }}>
            Smaller creatures that orbit your colony nodes. Toggle off anything that doesn&apos;t belong.
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
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-3 p-3" style={{ backgroundColor: "rgba(255,255,255,0.015)" }}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded
                        ? <ChevronDown className="size-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                        : <ChevronRight className="size-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                      }
                      <CatIcon className="size-4" style={{ color: `${pathColor}60` }} />
                      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-xs transition-colors cursor-pointer"
                      style={{ color: `${pathColor}60` }}
                    >
                      {allSelected ? "None" : "All"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1">
                      {isDirtyDog && (
                        <p className="text-xs italic mb-2 pl-6" style={{ color: "rgba(255,255,255,0.25)" }}>
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
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? `${pathColor}04` : "transparent",
                            }}
                          >
                            <div
                              className="size-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300"
                              style={{
                                borderColor: isSelected ? pathColor : "rgba(255,255,255,0.08)",
                                backgroundColor: isSelected ? `${pathColor}30` : "transparent",
                                boxShadow: isSelected ? `0 0 4px ${pathColor}30` : "none",
                              }}
                            >
                              {isSelected && <Check className="size-2.5" style={{ color: pathColor }} />}
                            </div>
                            <span className="text-sm flex-1" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
                              {goal.title}
                            </span>
                            <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
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
          className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6 mt-6"
          style={{
            backgroundColor: "rgba(0, 8, 16, 0.92)",
            borderTop: `1px solid ${pathColor}10`,
          }}
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-semibold" style={{ color: pathColor, textShadow: `0 0 6px ${pathColor}40` }}>
                {totalSelected}
              </span>{" "}
              organisms selected
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                (1 central + {selectedL2Ids.size} nodes + {selectedL3Ids.size} satellites)
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-6"
              style={{
                backgroundColor: `${pathColor}20`,
                color: pathColor,
                border: `1px solid ${pathColor}40`,
                boxShadow: `0 0 15px ${pathColor}20`,
              }}
            >
              Cultivate Colony
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
