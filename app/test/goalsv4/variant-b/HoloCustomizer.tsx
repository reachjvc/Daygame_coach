"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Repeat, Milestone, Star, Trophy, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface HoloCustomizerProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

export function HoloCustomizer({
  selectedL1,
  selectedL2s,
  selectedL3s,
  onBack,
  onConfirm,
}: HoloCustomizerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["achievements", "field_work", "results"])
  )

  const [customizations, setCustomizations] = useState<Map<string, GoalCustomization>>(() => {
    const map = new Map<string, GoalCustomization>()

    map.set(selectedL1.id, {
      templateId: selectedL1.id,
      title: selectedL1.title,
      enabled: true,
      targetValue: 1,
      level: 1,
    })

    for (const l2 of selectedL2s) {
      map.set(l2.id, {
        templateId: l2.id,
        title: l2.title,
        enabled: true,
        targetValue: 1,
        level: 2,
      })
    }

    for (const l3 of selectedL3s) {
      const defaultTarget =
        l3.templateType === "milestone_ladder" && l3.defaultMilestoneConfig
          ? l3.defaultMilestoneConfig.target
          : l3.templateType === "habit_ramp" && l3.defaultRampSteps
            ? l3.defaultRampSteps[0].frequencyPerWeek
            : 1
      map.set(l3.id, {
        templateId: l3.id,
        title: l3.title,
        enabled: true,
        targetValue: defaultTarget,
        level: 3,
      })
    }

    return map
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const toggleGoal = (id: string) => {
    setCustomizations((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, enabled: !current.enabled })
      }
      return next
    })
  }

  const updateTarget = (id: string, value: number) => {
    setCustomizations((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, targetValue: value })
      }
      return next
    })
  }

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalTemplate[]> = {}
    for (const l3 of selectedL3s) {
      const cat = l3.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(l3)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalTemplate[]>>
  }, [selectedL3s])

  const enabledCount = useMemo(() => {
    let count = 0
    for (const [, c] of customizations) {
      if (c.enabled) count++
    }
    return count
  }, [customizations])

  const handleConfirm = () => {
    const goals = Array.from(customizations.values()).filter((c) => c.enabled)
    onConfirm(goals)
  }

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
      </div>

      <div>
        <h2
          className="text-xl font-bold"
          style={{
            color: "rgba(255,255,255,0.9)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            letterSpacing: "0.05em",
          }}
        >
          CONFIGURE PARAMETERS
        </h2>
        <p
          className="text-sm mt-1"
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: 12,
          }}
        >
          Toggle nodes ON/OFF and set target values. All parameters remain mutable.
        </p>
      </div>

      {/* Primary target card */}
      <div
        className="relative p-5 overflow-hidden"
        style={{
          border: `2px solid rgba(0, 240, 255, 0.25)`,
          backgroundColor: "rgba(0, 240, 255, 0.03)",
          boxShadow: `0 0 20px rgba(0, 240, 255, 0.05)`,
          borderRadius: 4,
        }}
      >
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: `${CYAN}40` }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: `${CYAN}40` }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: `${CYAN}40` }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: `${CYAN}40` }} />

        <div className="flex items-center gap-3">
          <div className="p-2" style={{ backgroundColor: "rgba(0, 240, 255, 0.08)", borderRadius: 2 }}>
            <Star className="size-5" style={{ color: CYAN }} />
          </div>
          <div>
            <div
              className="text-[10px] font-bold tracking-wider"
              style={{
                color: CYAN,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.15em",
              }}
            >
              PRIMARY_TARGET
            </div>
            <h3 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Subsystems (L2) */}
      <HoloCollapsibleSection
        title="SUBSYSTEMS"
        icon={<Trophy className="size-4" style={{ color: CYAN }} />}
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
      >
        <div className="space-y-1.5">
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            return (
              <div
                key={l2.id}
                className="flex items-center gap-3 p-3"
                style={{ border: "1px solid rgba(0, 240, 255, 0.05)", borderRadius: 4 }}
              >
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className="relative inline-flex h-5 w-9 items-center rounded-sm transition-colors flex-shrink-0 cursor-pointer"
                  style={{ background: cust.enabled ? CYAN : "rgba(0, 240, 255, 0.1)" }}
                  role="switch"
                  aria-checked={cust.enabled}
                >
                  <span
                    className={`inline-block size-3.5 rounded-sm transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                    style={{ backgroundColor: cust.enabled ? "#020a14" : "rgba(255,255,255,0.5)" }}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: cust.enabled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                      textDecoration: cust.enabled ? "none" : "line-through",
                    }}
                  >
                    {l2.title}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </HoloCollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length
        const isDirtyDog = cat === "dirty_dog"

        return (
          <HoloCollapsibleSection
            key={cat}
            title={CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
            icon={<Target className="size-4" style={{ color: "rgba(0, 240, 255, 0.25)" }} />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={isDirtyDog ? "Sensitive metrics - enable if within scope" : undefined}
          >
            <div className="space-y-2">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    className="p-3 transition-colors"
                    style={{
                      border: cust.enabled
                        ? "1px solid rgba(0, 240, 255, 0.05)"
                        : "1px solid rgba(255,255,255,0.02)",
                      opacity: cust.enabled ? 1 : 0.5,
                      borderRadius: 4,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-5 w-9 items-center rounded-sm transition-colors flex-shrink-0 cursor-pointer"
                        style={{ background: cust.enabled ? CYAN : "rgba(0, 240, 255, 0.1)" }}
                        role="switch"
                        aria-checked={cust.enabled}
                      >
                        <span
                          className={`inline-block size-3.5 rounded-sm transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                          style={{ backgroundColor: cust.enabled ? "#020a14" : "rgba(255,255,255,0.5)" }}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: cust.enabled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                              textDecoration: cust.enabled ? "none" : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span
                            className="text-[10px] flex-shrink-0 flex items-center gap-1"
                            style={{
                              color: "rgba(0, 240, 255, 0.25)",
                              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            }}
                          >
                            {isRamp ? <Repeat className="size-3" /> : <Milestone className="size-3" />}
                            {isRamp ? "HABIT" : "MILESTONE"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className="text-xs"
                            style={{
                              color: "rgba(0, 240, 255, 0.35)",
                              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            }}
                          >
                            TGT:
                          </span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0) updateTarget(goal.id, v)
                            }}
                            className="w-16 text-right text-sm font-medium px-1.5 py-0.5 focus:outline-none"
                            style={{
                              backgroundColor: "rgba(0, 240, 255, 0.04)",
                              border: "1px solid rgba(0, 240, 255, 0.1)",
                              color: CYAN,
                              borderRadius: 2,
                              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            }}
                            min={1}
                          />
                          {isRamp && (
                            <span
                              className="text-xs"
                              style={{
                                color: "rgba(0, 240, 255, 0.25)",
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                              }}
                            >
                              /WK
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </HoloCollapsibleSection>
        )
      })}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(2, 10, 20, 0.95)",
          borderTop: "1px solid rgba(0, 240, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-sm"
            style={{
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            }}
          >
            <span className="font-bold" style={{ color: CYAN }}>
              {enabledCount}
            </span>{" "}
            NODES ACTIVE
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onBack}
              style={{
                color: "rgba(0, 240, 255, 0.5)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              BACK
            </Button>
            <Button
              onClick={handleConfirm}
              className="cursor-pointer font-bold"
              style={{
                backgroundColor: CYAN,
                color: "#020a14",
                boxShadow: `0 0 12px rgba(0, 240, 255, 0.3)`,
                borderRadius: 4,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                letterSpacing: "0.05em",
              }}
            >
              PLOT TRAJECTORIES
              <Star className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HoloCollapsibleSection({
  title,
  icon,
  count,
  total,
  isExpanded,
  onToggle,
  subtitle,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer group"
      >
        {isExpanded ? (
          <ChevronDown className="size-4" style={{ color: "rgba(0, 240, 255, 0.4)" }} />
        ) : (
          <ChevronRight className="size-4" style={{ color: "rgba(0, 240, 255, 0.4)" }} />
        )}
        {icon}
        <span
          className="text-sm font-bold tracking-wide"
          style={{
            color: "rgba(0, 240, 255, 0.5)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            letterSpacing: "0.1em",
          }}
        >
          {title}
        </span>
        <span
          className="text-xs"
          style={{
            color: "rgba(0, 240, 255, 0.3)",
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          }}
        >
          [{count}/{total}]
        </span>
        <div className="flex-1 ml-2" style={{ borderTop: "1px solid rgba(0, 240, 255, 0.06)" }} />
      </button>
      {subtitle && isExpanded && (
        <p className="text-xs italic mb-2 ml-6" style={{ color: "rgba(255,255,255,0.25)" }}>
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
