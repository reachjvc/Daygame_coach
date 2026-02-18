"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Heart, Flame, Trophy, Target, Zap, Star } from "lucide-react"
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

// Aurora path color schemes
const PATH_AURORA = {
  one_person: {
    primary: "#4ade80",
    secondary: "#22d3ee",
    glow: "rgba(74, 222, 128, 0.15)",
    accent: "rgba(74, 222, 128, 0.5)",
    gradient: "linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)",
  },
  abundance: {
    primary: "#e879f9",
    secondary: "#a78bfa",
    glow: "rgba(232, 121, 249, 0.15)",
    accent: "rgba(232, 121, 249, 0.5)",
    gradient: "linear-gradient(135deg, #e879f9 0%, #a78bfa 100%)",
  },
}

interface AuroraGoalPickerProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function AuroraGoalPicker({ path, onBack, onConfirm }: AuroraGoalPickerProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()
  const aurora = PATH_AURORA[path]

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

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
    const l3Templates = (allL3 as GoalTemplate[]).filter((t) => selectedL3Ids.has(t.id))
    onConfirm(selectedL1, l2Templates, l3Templates)
  }

  const totalSelected = (selectedL1 ? 1 : 0) + selectedL2Ids.size + selectedL3Ids.size

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-4" style={{ color: aurora.primary }} />
          <span className="text-sm font-light tracking-wide" style={{ color: aurora.primary }}>{pathLabel}</span>
        </div>
      </div>

      {/* Step 1: Choose your brightest band */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
            style={{
              background: aurora.gradient,
              boxShadow: `0 0 12px ${aurora.glow}`,
            }}
          >
            1
          </div>
          <h2 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
            Choose your brightest band
          </h2>
        </div>
        <p className="text-sm ml-8 font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
          This is the most vivid ribbon in your aurora. Everything else radiates from it.
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
                className="relative flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-300 cursor-pointer"
                style={{
                  border: isSelected ? `1px solid ${aurora.primary}50` : "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: isSelected ? `${aurora.primary}08` : "transparent",
                  boxShadow: isSelected ? `0 0 25px ${aurora.glow}, inset 0 0 20px ${aurora.glow}` : "none",
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                    style={{ background: aurora.gradient }}
                  >
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div className="rounded-lg p-2" style={{ background: `${aurora.primary}10` }}>
                  <div
                    className="size-3 rounded-full"
                    style={{
                      background: aurora.gradient,
                      boxShadow: isSelected ? `0 0 8px ${aurora.primary}60` : "none",
                    }}
                  />
                </div>
                <span className="text-sm font-light" style={{ color: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>
                  {l1.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Aurora intensity points */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 12px ${aurora.glow}`,
              }}
            >
              2
            </div>
            <h2 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              Intensity points
            </h2>
          </div>
          <p className="text-sm ml-8 font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
            Where the aurora burns brightest. These are the transformations you are pursuing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter((c) => c.level === 3).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  className="flex items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 cursor-pointer"
                  style={{
                    border: isSelected ? `1px solid ${aurora.primary}30` : "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: isSelected ? `${aurora.primary}06` : "transparent",
                    boxShadow: isSelected ? `0 0 15px ${aurora.glow}` : "none",
                  }}
                >
                  <div
                    className="size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      borderColor: isSelected ? aurora.primary : "rgba(255,255,255,0.12)",
                      background: isSelected ? aurora.gradient : "transparent",
                    }}
                  >
                    {isSelected && <Check className="size-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-light truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{l2.title}</div>
                    <div className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>{childCount} trackable goals</div>
                  </div>
                  <Trophy className="size-4 ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.1)" }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Glowing nodes */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 12px ${aurora.glow}`,
              }}
            >
              3
            </div>
            <h2 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              Glowing nodes
            </h2>
          </div>
          <p className="text-sm ml-8 font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
            The individual lights dancing within each band. Toggle what you will track.
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
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3 p-3" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded
                        ? <ChevronDown className="size-4" style={{ color: "rgba(255,255,255,0.35)" }} />
                        : <ChevronRight className="size-4" style={{ color: "rgba(255,255,255,0.35)" }} />
                      }
                      <CatIcon className="size-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                      <span className="text-sm font-light tracking-wide" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-xs font-light transition-colors cursor-pointer"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {allSelected ? "None" : "All"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1">
                      {isDirtyDog && (
                        <p className="text-xs italic mb-2 pl-6 font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
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
                            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-200 cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? `${aurora.primary}06` : "transparent",
                            }}
                          >
                            <div
                              className="size-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-300"
                              style={{
                                borderColor: isSelected ? aurora.primary : "rgba(255,255,255,0.1)",
                                background: isSelected ? aurora.gradient : "transparent",
                              }}
                            >
                              {isSelected && <Check className="size-2.5 text-white" />}
                            </div>
                            <span
                              className="text-sm flex-1 font-light"
                              style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}
                            >
                              {goal.title}
                            </span>
                            <span className="text-[10px] flex-shrink-0 font-light" style={{ color: "rgba(255,255,255,0.2)" }}>
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
            backgroundColor: "rgba(2, 8, 21, 0.92)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{totalSelected}</span> lights selected
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                (1 band + {selectedL2Ids.size} bright + {selectedL3Ids.size} nodes)
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-6 font-light tracking-wide"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 16px ${aurora.glow}`,
              }}
            >
              Customize Lights
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
