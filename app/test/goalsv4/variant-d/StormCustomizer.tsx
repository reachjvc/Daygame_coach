"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Repeat, Milestone, Target, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

// Storm path color schemes
const PATH_STORM = {
  one_person: {
    primary: "#ff4d4d",
    secondary: "#ff8c1a",
    gradient: "linear-gradient(135deg, #ff4d4d 0%, #ff8c1a 100%)",
    glow: "rgba(255, 77, 77, 0.15)",
  },
  abundance: {
    primary: "#d946ef",
    secondary: "#ec4899",
    gradient: "linear-gradient(135deg, #d946ef 0%, #ec4899 100%)",
    glow: "rgba(217, 70, 239, 0.15)",
  },
}

interface StormCustomizerProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

export function StormCustomizer({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  onBack,
  onConfirm,
}: StormCustomizerProps) {
  const storm = PATH_STORM[path]
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["achievements", "field_work", "results"]))

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
      const defaultTarget = l3.templateType === "milestone_ladder" && l3.defaultMilestoneConfig
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
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors cursor-pointer font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
          <ArrowLeft className="size-4" />
          Back to selection
        </button>
      </div>

      <div>
        <h2 className="text-xl font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
          Calibrate the storm
        </h2>
        <p className="text-sm mt-1 font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
          Adjust each particle&apos;s energy level. Toggle goals and set targets. Everything adjusts later.
        </p>
      </div>

      {/* Vision card with storm glow */}
      <div
        className="rounded-xl p-5 relative overflow-hidden"
        style={{
          border: `1px solid ${storm.primary}30`,
          background: `${storm.primary}05`,
          boxShadow: `0 0 30px ${storm.glow}, inset 0 0 30px ${storm.glow}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${storm.primary}08 0%, transparent 50%, ${storm.secondary}08 100%)`,
            animation: "stormCustomizerShimmer 6s ease-in-out infinite",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="rounded-lg p-2.5"
            style={{
              background: `${storm.primary}12`,
              boxShadow: `0 0 12px ${storm.glow}`,
            }}
          >
            <div
              className="size-5 rounded-full"
              style={{
                background: storm.gradient,
                boxShadow: `0 0 8px ${storm.primary}60`,
              }}
            />
          </div>
          <div>
            <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: storm.primary }}>
              Solar Flare
            </div>
            <h3 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Achievements section */}
      <CollapsibleSection
        title="Field Lines"
        icon={<Trophy className="size-4 text-amber-400/70" />}
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
        storm={storm}
      >
        <div className="space-y-1.5">
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            return (
              <div key={l2.id} className="flex items-center gap-3 rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 cursor-pointer"
                  style={{
                    background: cust.enabled ? storm.gradient : "rgba(255,255,255,0.08)",
                    boxShadow: cust.enabled ? `0 0 8px ${storm.glow}` : "none",
                  }}
                  role="switch"
                  aria-checked={cust.enabled}
                >
                  <span className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-light"
                    style={{
                      color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                      textDecoration: cust.enabled ? "none" : "line-through",
                    }}
                  >
                    {l2.title}
                  </span>
                </div>
                <Trophy className="size-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.1)" }} />
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length
        const isDirtyDog = cat === "dirty_dog"

        return (
          <CollapsibleSection
            key={cat}
            title={CATEGORY_LABELS[cat] ?? cat}
            icon={<Target className="size-4" style={{ color: "rgba(255,255,255,0.25)" }} />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={isDirtyDog ? "Intimate outcomes - opt in if relevant" : undefined}
            storm={storm}
          >
            <div className="space-y-2">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    className="rounded-lg p-3 transition-all duration-300"
                    style={{
                      border: cust.enabled ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.02)",
                      opacity: cust.enabled ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 cursor-pointer"
                        style={{
                          background: cust.enabled ? storm.gradient : "rgba(255,255,255,0.08)",
                          boxShadow: cust.enabled ? `0 0 6px ${storm.glow}` : "none",
                        }}
                        role="switch"
                        aria-checked={cust.enabled}
                      >
                        <span className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-light"
                            style={{
                              color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                              textDecoration: cust.enabled ? "none" : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span className="text-[10px] flex-shrink-0 flex items-center gap-1 font-light" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {isRamp ? <Repeat className="size-3" /> : <Milestone className="size-3" />}
                            {isRamp ? "habit" : "milestone"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>Target:</span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0) updateTarget(goal.id, v)
                            }}
                            className="w-16 text-right text-sm font-light rounded px-1.5 py-0.5 focus:outline-none transition-colors"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.04)",
                              border: `1px solid rgba(255,255,255,0.08)`,
                              color: "rgba(255,255,255,0.8)",
                            }}
                            min={1}
                          />
                          {isRamp && <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>/wk</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {/* Confirm footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 4, 8, 0.92)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{enabledCount}</span> particles calibrated
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="font-light" style={{ color: "rgba(255,255,255,0.5)" }}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              className="font-light tracking-wide"
              style={{
                background: storm.gradient,
                boxShadow: `0 0 16px ${storm.glow}`,
              }}
            >
              View Storm
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes stormCustomizerShimmer {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.45; transform: translateX(12px); }
        }
      `}</style>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  count,
  total,
  isExpanded,
  onToggle,
  subtitle,
  storm,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  subtitle?: string
  storm: { primary: string; glow: string }
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer group"
      >
        {isExpanded
          ? <ChevronDown className="size-4" style={{ color: "rgba(255,255,255,0.35)" }} />
          : <ChevronRight className="size-4" style={{ color: "rgba(255,255,255,0.35)" }} />
        }
        {icon}
        <span className="text-sm font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.45)" }}>
          {title}
        </span>
        <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
          {count}/{total}
        </span>
        <div
          className="flex-1 ml-2 h-px"
          style={{
            background: `linear-gradient(90deg, ${storm.primary}15, transparent)`,
          }}
        />
      </button>
      {subtitle && isExpanded && (
        <p className="text-xs italic mb-2 ml-6 font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
