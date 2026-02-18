"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Heart, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCatalogGroups, getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_OPS",
  results: "OUTPUT_METRICS",
  dirty_dog: "RESTRICTED_IO",
  texting: "MSG_PROTOCOL",
  dates: "DATE_HANDLER",
  relationship: "REL_STATE",
}

const CATEGORY_HEX: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "0xA0",
  results: "0xB0",
  dirty_dog: "0xC0",
  texting: "0xD0",
  dates: "0xE0",
  relationship: "0xF0",
}

interface NodeSelectorProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function NodeSelector({ path, onBack, onConfirm }: NodeSelectorProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person" ? "#ec4899" : "#f97316"
  const pathLabel = path === "one_person" ? "CORE_0 // FIND_THE_ONE" : "CORE_1 // ABUNDANCE"
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

  const mono = "var(--font-mono, 'Geist Mono', monospace)"

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs transition-colors cursor-pointer"
          style={{ color: "rgba(0, 255, 65, 0.4)", fontFamily: mono }}
        >
          <ArrowLeft className="size-3.5" />
          &lt; BACK
        </button>
        <div className="flex items-center gap-2">
          <PathIcon className="size-3.5" style={{ color: pathColor }} />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: pathColor, fontFamily: mono }}
          >
            {pathLabel}
          </span>
        </div>
      </div>

      {/* Step 1: Primary directive */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 text-[10px] font-bold"
            style={{
              fontFamily: mono,
              backgroundColor: "rgba(0, 255, 65, 0.08)",
              border: "1px solid rgba(0, 255, 65, 0.3)",
              borderRadius: 2,
              color: "#00ff41",
            }}
          >
            01
          </div>
          <h2
            className="text-sm font-bold tracking-wider"
            style={{ fontFamily: mono, color: "#00ff41", textTransform: "uppercase" }}
          >
            SELECT PRIMARY DIRECTIVE
          </h2>
        </div>
        <p
          className="text-[10px] ml-8 tracking-wide"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
        >
          Root node of the goal graph. All sub-modules derive from this directive.
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
                className="relative flex items-center gap-3 p-3 text-left transition-all duration-200 cursor-pointer"
                style={{
                  border: isSelected ? `1.5px solid ${pathColor}60` : "1px solid rgba(0, 255, 65, 0.08)",
                  backgroundColor: isSelected ? `${pathColor}06` : "transparent",
                  borderRadius: 3,
                  boxShadow: isSelected ? `0 0 15px ${pathColor}10, inset 0 0 15px ${pathColor}03` : "none",
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center"
                    style={{
                      backgroundColor: pathColor,
                      borderRadius: 2,
                    }}
                  >
                    <Check className="size-2.5 text-white" />
                  </div>
                )}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? pathColor : "rgba(0, 255, 65, 0.15)",
                    boxShadow: isSelected ? `0 0 6px ${pathColor}` : "none",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: mono,
                    color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {l1.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Achievement modules */}
      {selectedL1 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-6 h-6 text-[10px] font-bold"
              style={{
                fontFamily: mono,
                backgroundColor: "rgba(0, 255, 65, 0.08)",
                border: "1px solid rgba(0, 255, 65, 0.3)",
                borderRadius: 2,
                color: "#00ff41",
              }}
            >
              02
            </div>
            <h2
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: mono, color: "#00ff41", textTransform: "uppercase" }}
            >
              ENABLE SUB-MODULES
            </h2>
          </div>
          <p
            className="text-[10px] ml-8 tracking-wide"
            style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
          >
            Achievement processors. Each module unlocks a transformation domain.
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
                    border: isSelected ? "1px solid rgba(0, 229, 255, 0.3)" : "1px solid rgba(0, 255, 65, 0.06)",
                    backgroundColor: isSelected ? "rgba(0, 229, 255, 0.04)" : "transparent",
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(0, 255, 65, 0.15)",
                      borderRadius: 2,
                      backgroundColor: isSelected ? "rgba(0, 229, 255, 0.15)" : "transparent",
                    }}
                  >
                    {isSelected && <Check className="size-2.5" style={{ color: "#00e5ff" }} />}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-medium truncate"
                      style={{
                        fontFamily: mono,
                        color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {l2.title}
                    </div>
                    <div
                      className="text-[9px]"
                      style={{
                        fontFamily: mono,
                        color: "rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      {childCount} I/O pins
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: I/O pins (L3 goals) */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-6 h-6 text-[10px] font-bold"
              style={{
                fontFamily: mono,
                backgroundColor: "rgba(0, 255, 65, 0.08)",
                border: "1px solid rgba(0, 255, 65, 0.3)",
                borderRadius: 2,
                color: "#00ff41",
              }}
            >
              03
            </div>
            <h2
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: mono, color: "#00ff41", textTransform: "uppercase" }}
            >
              CONFIGURE I/O PINS
            </h2>
          </div>
          <p
            className="text-[10px] ml-8 tracking-wide"
            style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
          >
            Trackable data nodes. Toggle pins to enable or disable measurement points.
          </p>

          <div className="space-y-2 ml-8">
            {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
              if (!goals || goals.length === 0) return null
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = goals.filter((g) => selectedL3Ids.has(g.id)).length
              const allSelected = selectedInCat === goals.length
              const isDirtyDog = cat === "dirty_dog"
              const catHex = CATEGORY_HEX[cat] ?? "0x00"

              return (
                <div
                  key={cat}
                  className="overflow-hidden"
                  style={{
                    border: "1px solid rgba(0, 255, 65, 0.06)",
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="flex items-center gap-3 p-2.5"
                    style={{ backgroundColor: "rgba(0, 255, 65, 0.02)" }}
                  >
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                    >
                      {isExpanded
                        ? <ChevronDown className="size-3.5" style={{ color: "rgba(0, 255, 65, 0.4)" }} />
                        : <ChevronRight className="size-3.5" style={{ color: "rgba(0, 255, 65, 0.4)" }} />
                      }
                      <span
                        className="text-[9px] font-bold tracking-wider"
                        style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
                      >
                        [{catHex}]
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.6)" }}
                      >
                        {CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
                      </span>
                      <span
                        className="text-[9px]"
                        style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
                      >
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      className="text-[9px] font-bold tracking-wider transition-colors cursor-pointer"
                      style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
                    >
                      [{allSelected ? "NONE" : "ALL"}]
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-1 space-y-0.5">
                      {isDirtyDog && (
                        <p
                          className="text-[9px] mb-2 pl-6"
                          style={{ fontFamily: mono, color: "rgba(255, 171, 0, 0.4)" }}
                        >
                          // RESTRICTED: Intimate outcomes. Opt-in required.
                        </p>
                      )}
                      {goals.map((goal) => {
                        const isSelected = selectedL3Ids.has(goal.id)
                        const isRamp = goal.templateType === "habit_ramp"
                        return (
                          <button
                            key={goal.id}
                            onClick={() => toggleL3(goal.id)}
                            className="w-full flex items-center gap-3 px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? "rgba(0, 255, 65, 0.03)" : "transparent",
                              borderRadius: 2,
                            }}
                          >
                            <div
                              className="w-3 h-3 flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{
                                border: isSelected ? "1px solid #00ff41" : "1px solid rgba(0, 255, 65, 0.12)",
                                borderRadius: 1,
                                backgroundColor: isSelected ? "rgba(0, 255, 65, 0.2)" : "transparent",
                              }}
                            >
                              {isSelected && <Check className="size-2" style={{ color: "#00ff41" }} />}
                            </div>
                            <span
                              className="text-[11px] flex-1"
                              style={{
                                fontFamily: mono,
                                color: isSelected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                              }}
                            >
                              {goal.title}
                            </span>
                            <span
                              className="text-[8px] flex-shrink-0 px-1.5 py-0.5"
                              style={{
                                fontFamily: mono,
                                color: "rgba(0, 255, 65, 0.25)",
                                backgroundColor: "rgba(0, 255, 65, 0.03)",
                                borderRadius: 1,
                              }}
                            >
                              {isRamp ? "RAMP" : "LADDER"}
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
            backgroundColor: "rgba(10, 10, 10, 0.95)",
            borderTop: "1px solid rgba(0, 255, 65, 0.1)",
          }}
        >
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div style={{ fontFamily: mono }}>
              <span className="text-xs font-bold" style={{ color: "#00ff41" }}>{totalSelected}</span>
              <span className="text-[10px] ml-1.5" style={{ color: "rgba(0, 255, 65, 0.35)" }}>
                NODES SELECTED
              </span>
              <span className="text-[9px] ml-2" style={{ color: "rgba(0, 255, 65, 0.2)" }}>
                (1 root + {selectedL2Ids.size} modules + {selectedL3Ids.size} pins)
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              className="px-5 text-xs font-bold tracking-wider"
              style={{
                fontFamily: mono,
                backgroundColor: pathColor,
                borderRadius: 3,
                boxShadow: `0 0 12px ${pathColor}40`,
                textTransform: "uppercase",
              }}
            >
              CONFIGURE NODES &gt;&gt;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
