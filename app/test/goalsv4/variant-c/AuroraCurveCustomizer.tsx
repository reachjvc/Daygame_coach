"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Repeat, Milestone as MilestoneIcon, Target, Trophy, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import type { GoalTemplate, GoalDisplayCategory, MilestoneLadderConfig } from "@/src/goals/types"
import type { GoalCustomization } from "../VariantC"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const PATH_AURORA = {
  one_person: {
    primary: "#4ade80",
    secondary: "#22d3ee",
    gradient: "linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)",
    glow: "rgba(74, 222, 128, 0.15)",
  },
  abundance: {
    primary: "#e879f9",
    secondary: "#a78bfa",
    gradient: "linear-gradient(135deg, #e879f9 0%, #a78bfa 100%)",
    glow: "rgba(232, 121, 249, 0.15)",
  },
}

interface AuroraCurveCustomizerProps {
  path: "one_person" | "abundance"
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

export function AuroraCurveCustomizer({
  path,
  selectedL1,
  selectedL2s,
  selectedL3s,
  onBack,
  onConfirm,
}: AuroraCurveCustomizerProps) {
  const aurora = PATH_AURORA[path]
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["achievements", "field_work", "results"]))
  const [curveModalGoal, setCurveModalGoal] = useState<GoalTemplate | null>(null)

  // Curve configs for milestone ladder goals
  const [curveConfigs, setCurveConfigs] = useState<Map<string, MilestoneLadderConfig>>(() => {
    const map = new Map<string, MilestoneLadderConfig>()
    for (const tmpl of [...selectedL2s, ...selectedL3s]) {
      if (tmpl.defaultMilestoneConfig) {
        map.set(tmpl.id, { ...tmpl.defaultMilestoneConfig })
      }
    }
    return map
  })

  const [customizations, setCustomizations] = useState<Map<string, GoalCustomization>>(() => {
    const map = new Map<string, GoalCustomization>()

    map.set(selectedL1.id, {
      templateId: selectedL1.id,
      title: selectedL1.title,
      enabled: true,
      targetValue: 1,
      level: 1,
      displayCategory: selectedL1.displayCategory,
      templateType: selectedL1.templateType,
    })

    for (const l2 of selectedL2s) {
      map.set(l2.id, {
        templateId: l2.id,
        title: l2.title,
        enabled: true,
        targetValue: 1,
        level: 2,
        displayCategory: l2.displayCategory,
        templateType: l2.templateType,
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
        displayCategory: l3.displayCategory,
        templateType: l3.templateType,
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

  const handleCurveChange = (goalId: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => {
      const next = new Map(prev)
      next.set(goalId, config)
      return next
    })
    // Update the target value to match the curve target
    updateTarget(goalId, config.target)
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
          Tune the light
        </h2>
        <p className="text-sm mt-1 font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
          Adjust each band&apos;s intensity. Toggle goals, set targets, and shape growth curves.
        </p>
      </div>

      {/* Vision card */}
      <div
        className="rounded-xl p-5 relative overflow-hidden"
        style={{
          border: `1px solid ${aurora.primary}25`,
          background: `${aurora.primary}04`,
          boxShadow: `0 0 30px ${aurora.glow}, inset 0 0 30px ${aurora.glow}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${aurora.primary}06 0%, transparent 50%, ${aurora.secondary}06 100%)`,
            animation: "customizerShimmer 8s ease-in-out infinite",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="rounded-lg p-2.5"
            style={{
              background: `${aurora.primary}10`,
              boxShadow: `0 0 12px ${aurora.glow}`,
            }}
          >
            <div
              className="size-5 rounded-full"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 8px ${aurora.primary}60`,
              }}
            />
          </div>
          <div>
            <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: aurora.primary }}>
              Brightest Band
            </div>
            <h3 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Achievements section */}
      <CollapsibleSection
        title="Intensity Points"
        icon={<Trophy className="size-4 text-amber-400/70" />}
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
        aurora={aurora}
      >
        <div className="space-y-1.5">
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            const hasCurve = l2.defaultMilestoneConfig != null
            return (
              <div key={l2.id} className="flex items-center gap-3 rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.03)" }}>
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 cursor-pointer"
                  style={{
                    background: cust.enabled ? aurora.gradient : "rgba(255,255,255,0.06)",
                    boxShadow: cust.enabled ? `0 0 8px ${aurora.glow}` : "none",
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
                      color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                      textDecoration: cust.enabled ? "none" : "line-through",
                    }}
                  >
                    {l2.title}
                  </span>
                </div>
                {hasCurve && cust.enabled && (
                  <button
                    onClick={() => setCurveModalGoal(l2)}
                    className="flex items-center gap-1 text-xs font-light cursor-pointer rounded-full px-2 py-0.5 transition-colors"
                    style={{
                      color: aurora.primary,
                      background: `${aurora.primary}08`,
                      border: `1px solid ${aurora.primary}20`,
                    }}
                  >
                    <Eye className="size-3" />
                    Curve
                  </button>
                )}
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
            icon={<Target className="size-4" style={{ color: "rgba(255,255,255,0.2)" }} />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={isDirtyDog ? "Intimate outcomes - opt in if relevant" : undefined}
            aurora={aurora}
          >
            <div className="space-y-2">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                const hasCurve = goal.defaultMilestoneConfig != null
                return (
                  <div
                    key={goal.id}
                    className="rounded-lg p-3 transition-all duration-300"
                    style={{
                      border: cust.enabled ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.02)",
                      opacity: cust.enabled ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 cursor-pointer"
                        style={{
                          background: cust.enabled ? aurora.gradient : "rgba(255,255,255,0.06)",
                          boxShadow: cust.enabled ? `0 0 6px ${aurora.glow}` : "none",
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
                              color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                              textDecoration: cust.enabled ? "none" : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span className="text-[10px] flex-shrink-0 flex items-center gap-1 font-light" style={{ color: "rgba(255,255,255,0.18)" }}>
                            {isRamp ? <Repeat className="size-3" /> : <MilestoneIcon className="size-3" />}
                            {isRamp ? "habit" : "milestone"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && hasCurve && (
                        <button
                          onClick={() => setCurveModalGoal(goal)}
                          className="flex items-center gap-1 text-xs font-light cursor-pointer rounded-full px-2 py-0.5 transition-colors"
                          style={{
                            color: aurora.primary,
                            background: `${aurora.primary}08`,
                            border: `1px solid ${aurora.primary}20`,
                          }}
                        >
                          <Eye className="size-3" />
                          Curve
                        </button>
                      )}
                      {cust.enabled && !hasCurve && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>Target:</span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0) updateTarget(goal.id, v)
                            }}
                            className="w-16 text-right text-sm font-light rounded px-1.5 py-0.5 focus:outline-none"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.03)",
                              border: `1px solid rgba(255,255,255,0.06)`,
                              color: "rgba(255,255,255,0.8)",
                            }}
                            min={1}
                          />
                          {isRamp && <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.25)" }}>/wk</span>}
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

      {/* Curve Editor Modal */}
      {curveModalGoal && curveModalGoal.defaultMilestoneConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setCurveModalGoal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(135deg, #030a18 0%, #041020 50%, #030a18 100%)",
              border: `1px solid ${aurora.primary}25`,
              boxShadow: `0 0 60px ${aurora.glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${aurora.primary}12 0%, transparent 60%)`,
                pointerEvents: "none",
              }}
            />

            {/* Close button */}
            <button
              onClick={() => setCurveModalGoal(null)}
              className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center cursor-pointer z-10"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <X className="size-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>

            {/* Header */}
            <div className="relative flex items-center gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  background: `${aurora.primary}10`,
                  boxShadow: `0 0 12px ${aurora.glow}`,
                }}
              >
                <Eye className="size-5" style={{ color: aurora.primary }} />
              </div>
              <div>
                <div className="text-[10px] font-light uppercase tracking-[0.15em]" style={{ color: aurora.primary }}>
                  Growth Curve
                </div>
                <h3 className="text-lg font-light tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {curveModalGoal.title}
                </h3>
              </div>
            </div>

            <p className="text-xs font-light relative" style={{ color: "rgba(255,255,255,0.3)" }}>
              Shape the intensity curve. Define how this light grows over time.
            </p>

            {/* Curve Editor */}
            <div className="relative" style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 4 }}>
              <MilestoneCurveEditor
                config={curveConfigs.get(curveModalGoal.id) || curveModalGoal.defaultMilestoneConfig}
                onChange={(config) => handleCurveChange(curveModalGoal.id, config)}
                themeId="zen"
                allowDirectEdit
              />
            </div>

            <Button
              onClick={() => setCurveModalGoal(null)}
              className="w-full relative font-light tracking-wide"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 16px ${aurora.glow}`,
              }}
            >
              Save Curve
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="sticky bottom-0 backdrop-blur-md py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(2, 8, 21, 0.92)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{enabledCount}</span> lights configured
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              className="font-light tracking-wide"
              style={{
                background: aurora.gradient,
                boxShadow: `0 0 16px ${aurora.glow}`,
              }}
            >
              View Aurora
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes customizerShimmer {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.4; transform: translateX(10px); }
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
  aurora,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  subtitle?: string
  aurora: { primary: string; glow: string }
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer group"
      >
        {isExpanded
          ? <ChevronDown className="size-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          : <ChevronRight className="size-4" style={{ color: "rgba(255,255,255,0.3)" }} />
        }
        {icon}
        <span className="text-sm font-light uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          {title}
        </span>
        <span className="text-xs font-light" style={{ color: "rgba(255,255,255,0.2)" }}>
          {count}/{total}
        </span>
        <div
          className="flex-1 ml-2 h-px"
          style={{
            background: `linear-gradient(90deg, ${aurora.primary}12, transparent)`,
          }}
        />
      </button>
      {subtitle && isExpanded && (
        <p className="text-xs italic mb-2 ml-6 font-light" style={{ color: "rgba(255,255,255,0.2)" }}>
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
