"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_OPS",
  results: "OUTPUT_METRICS",
  dirty_dog: "RESTRICTED_IO",
  texting: "MSG_PROTOCOL",
  dates: "DATE_HANDLER",
  relationship: "REL_STATE",
}

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface NodeCustomizerProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  pathColor: string
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

export function NodeCustomizer({
  selectedL1,
  selectedL2s,
  selectedL3s,
  pathColor,
  onBack,
  onConfirm,
}: NodeCustomizerProps) {
  const mono = "var(--font-mono, 'Geist Mono', monospace)"

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
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs transition-colors cursor-pointer"
          style={{ color: "rgba(0, 255, 65, 0.4)", fontFamily: mono }}
        >
          <ArrowLeft className="size-3.5" />
          &lt; BACK
        </button>
      </div>

      <div>
        <h2
          className="text-sm font-bold tracking-wider"
          style={{ fontFamily: mono, color: "#00ff41", textTransform: "uppercase" }}
        >
          REGISTER PROGRAMMING
        </h2>
        <p
          className="text-[10px] mt-1 tracking-wide"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.35)" }}
        >
          Configure target registers for each data node. Toggle enable bits and set threshold values.
        </p>
      </div>

      {/* Root directive card */}
      <div
        className="p-4"
        style={{
          border: `1.5px solid ${pathColor}40`,
          backgroundColor: `${pathColor}04`,
          borderRadius: 3,
          boxShadow: `0 0 20px ${pathColor}08, inset 0 0 20px ${pathColor}03`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: pathColor,
              boxShadow: `0 0 8px ${pathColor}`,
            }}
          />
          <div>
            <div
              className="text-[9px] font-bold tracking-wider"
              style={{ fontFamily: mono, color: pathColor, textTransform: "uppercase" }}
            >
              ROOT_DIRECTIVE [L1]
            </div>
            <h3
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Achievement modules */}
      <CircuitCollapsibleSection
        title="SUB-MODULES [L2]"
        hexAddr="0x10"
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
      >
        <div className="space-y-1">
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            return (
              <div
                key={l2.id}
                className="flex items-center gap-3 p-2.5"
                style={{
                  border: "1px solid rgba(0, 255, 65, 0.06)",
                  borderRadius: 2,
                }}
              >
                {/* Toggle switch */}
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className="relative inline-flex h-4 w-8 items-center transition-colors flex-shrink-0 cursor-pointer"
                  style={{
                    background: cust.enabled ? "rgba(0, 255, 65, 0.2)" : "rgba(0, 255, 65, 0.05)",
                    border: cust.enabled ? "1px solid rgba(0, 255, 65, 0.4)" : "1px solid rgba(0, 255, 65, 0.1)",
                    borderRadius: 2,
                  }}
                  role="switch"
                  aria-checked={cust.enabled}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 transition-transform"
                    style={{
                      backgroundColor: cust.enabled ? "#00ff41" : "rgba(0, 255, 65, 0.2)",
                      borderRadius: 1,
                      boxShadow: cust.enabled ? "0 0 4px #00ff41" : "none",
                      transform: cust.enabled ? "translateX(14px)" : "translateX(2px)",
                    }}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      fontFamily: mono,
                      color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                      textDecoration: cust.enabled ? "none" : "line-through",
                    }}
                  >
                    {l2.title}
                  </span>
                </div>
                <span
                  className="text-[8px] flex-shrink-0"
                  style={{
                    fontFamily: mono,
                    color: cust.enabled ? "rgba(0, 229, 255, 0.5)" : "rgba(0, 255, 65, 0.15)",
                  }}
                >
                  {cust.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            )
          })}
        </div>
      </CircuitCollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length
        const isDirtyDog = cat === "dirty_dog"

        return (
          <CircuitCollapsibleSection
            key={cat}
            title={CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
            hexAddr={cat === "field_work" ? "0xA0" : cat === "results" ? "0xB0" : `0x${Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")}`}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={isDirtyDog ? "// RESTRICTED: Intimate outcomes" : undefined}
          >
            <div className="space-y-1">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    className="p-2.5 transition-colors"
                    style={{
                      border: cust.enabled ? "1px solid rgba(0, 255, 65, 0.06)" : "1px solid rgba(0, 255, 65, 0.02)",
                      borderRadius: 2,
                      opacity: cust.enabled ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-4 w-8 items-center transition-colors flex-shrink-0 cursor-pointer"
                        style={{
                          background: cust.enabled ? "rgba(0, 255, 65, 0.2)" : "rgba(0, 255, 65, 0.05)",
                          border: cust.enabled ? "1px solid rgba(0, 255, 65, 0.4)" : "1px solid rgba(0, 255, 65, 0.1)",
                          borderRadius: 2,
                        }}
                        role="switch"
                        aria-checked={cust.enabled}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 transition-transform"
                          style={{
                            backgroundColor: cust.enabled ? "#00ff41" : "rgba(0, 255, 65, 0.2)",
                            borderRadius: 1,
                            boxShadow: cust.enabled ? "0 0 4px #00ff41" : "none",
                            transform: cust.enabled ? "translateX(14px)" : "translateX(2px)",
                          }}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-medium"
                            style={{
                              fontFamily: mono,
                              color: cust.enabled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                              textDecoration: cust.enabled ? "none" : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span
                            className="text-[8px] flex-shrink-0 px-1 py-0.5"
                            style={{
                              fontFamily: mono,
                              color: "rgba(0, 255, 65, 0.2)",
                              backgroundColor: "rgba(0, 255, 65, 0.02)",
                              borderRadius: 1,
                            }}
                          >
                            {isRamp ? "RAMP" : "LADDER"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span
                            className="text-[9px]"
                            style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.3)" }}
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
                            className="w-14 text-right text-[11px] font-medium px-1.5 py-0.5 focus:outline-none"
                            style={{
                              fontFamily: mono,
                              backgroundColor: "rgba(0, 255, 65, 0.03)",
                              border: "1px solid rgba(0, 255, 65, 0.12)",
                              color: "#00ff41",
                              borderRadius: 2,
                            }}
                            min={1}
                          />
                          {isRamp && (
                            <span
                              className="text-[8px]"
                              style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.25)" }}
                            >
                              /wk
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CircuitCollapsibleSection>
        )
      })}

      {/* Confirm footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.95)",
          borderTop: "1px solid rgba(0, 255, 65, 0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontFamily: mono }}>
            <span className="text-xs font-bold" style={{ color: "#00ff41" }}>{enabledCount}</span>
            <span className="text-[10px] ml-1.5" style={{ color: "rgba(0, 255, 65, 0.35)" }}>
              NODES CONFIGURED
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[10px] tracking-wider"
              style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.4)" }}
            >
              &lt; BACK
            </Button>
            <Button
              onClick={handleConfirm}
              className="text-xs font-bold tracking-wider"
              style={{
                fontFamily: mono,
                backgroundColor: pathColor,
                borderRadius: 3,
                boxShadow: `0 0 12px ${pathColor}40`,
                textTransform: "uppercase",
              }}
            >
              BUILD NETWORK &gt;&gt;
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CircuitCollapsibleSection({
  title,
  hexAddr,
  count,
  total,
  isExpanded,
  onToggle,
  subtitle,
  children,
}: {
  title: string
  hexAddr: string
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  subtitle?: string
  children: React.ReactNode
}) {
  const mono = "var(--font-mono, 'Geist Mono', monospace)"

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer group"
      >
        {isExpanded
          ? <ChevronDown className="size-3.5" style={{ color: "rgba(0, 255, 65, 0.4)" }} />
          : <ChevronRight className="size-3.5" style={{ color: "rgba(0, 255, 65, 0.4)" }} />
        }
        <span
          className="text-[9px] font-bold"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.25)" }}
        >
          [{hexAddr}]
        </span>
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.5)", textTransform: "uppercase" }}
        >
          {title}
        </span>
        <span
          className="text-[9px]"
          style={{ fontFamily: mono, color: "rgba(0, 255, 65, 0.25)" }}
        >
          {count}/{total}
        </span>
        <div className="flex-1 ml-2" style={{ borderTop: "1px solid rgba(0, 255, 65, 0.06)" }} />
      </button>
      {subtitle && isExpanded && (
        <p
          className="text-[9px] mb-2 ml-6"
          style={{ fontFamily: mono, color: "rgba(255, 171, 0, 0.4)" }}
        >
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
