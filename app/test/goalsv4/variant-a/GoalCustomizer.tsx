"use client"

import { useState, useMemo } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Repeat,
  Milestone,
  Star,
  Trophy,
  Target,
} from "lucide-react"
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

interface GoalCustomizerProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  pathColor: string
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

const goldColor = "#daa520"
const brassColor = "#cd853f"

export function GoalCustomizer({
  selectedL1,
  selectedL2s,
  selectedL3s,
  pathColor,
  onBack,
  onConfirm,
}: GoalCustomizerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["achievements", "field_work", "results"])
  )

  const [customizations, setCustomizations] = useState<
    Map<string, GoalCustomization>
  >(() => {
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
          style={{ color: `${brassColor}80` }}
        >
          <ArrowLeft className="size-4" />
          Back to selection
        </button>
      </div>

      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Calibrate your instruments
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Fine-tune each orbital body. Toggle them on/off and set their
          parameters. All settings remain adjustable.
        </p>
      </div>

      {/* Vision goal card */}
      <div
        className="relative rounded-xl p-5 overflow-hidden"
        style={{
          border: `2px solid ${goldColor}40`,
          backgroundColor: `${goldColor}05`,
          boxShadow: `0 0 20px ${goldColor}08`,
        }}
      >
        <div
          className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2"
          style={{ borderColor: `${brassColor}40` }}
        />
        <div
          className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2"
          style={{ borderColor: `${brassColor}40` }}
        />
        <div
          className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2"
          style={{ borderColor: `${brassColor}40` }}
        />
        <div
          className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2"
          style={{ borderColor: `${brassColor}40` }}
        />

        <div className="flex items-center gap-3">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: `${goldColor}15` }}
          >
            <Star className="size-5" style={{ color: goldColor }} />
          </div>
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: goldColor }}
            >
              Polar Star
            </div>
            <h3
              className="text-lg font-bold"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* L2 achievements */}
      <CollapsibleSection
        title="Inner Orbit"
        icon={<Trophy className="size-4" style={{ color: goldColor }} />}
        count={
          selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length
        }
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
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: `1px solid ${brassColor}10` }}
              >
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer"
                  style={{
                    background: cust.enabled
                      ? goldColor
                      : `${brassColor}20`,
                  }}
                  role="switch"
                  aria-checked={cust.enabled}
                >
                  <span
                    className={`inline-block size-3.5 rounded-full transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                    style={{
                      backgroundColor: cust.enabled
                        ? "#0a0a1a"
                        : "rgba(255,255,255,0.6)",
                    }}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: cust.enabled
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.35)",
                      textDecoration: cust.enabled ? "none" : "line-through",
                    }}
                  >
                    {l2.title}
                  </span>
                </div>
                <Trophy
                  className="size-3.5 flex-shrink-0"
                  style={{ color: `${brassColor}25` }}
                />
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* L3 goals by category */}
      {(
        Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]
      ).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter(
          (g) => customizations.get(g.id)?.enabled
        ).length
        const isDirtyDog = cat === "dirty_dog"

        return (
          <CollapsibleSection
            key={cat}
            title={CATEGORY_LABELS[cat] ?? cat}
            icon={
              <Target
                className="size-4"
                style={{ color: `${brassColor}45` }}
              />
            }
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={
              isDirtyDog
                ? "Intimate outcomes - opt in if relevant"
                : undefined
            }
          >
            <div className="space-y-2">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    className="rounded-lg p-3 transition-colors"
                    style={{
                      border: cust.enabled
                        ? `1px solid ${brassColor}10`
                        : "1px solid rgba(255,255,255,0.03)",
                      opacity: cust.enabled ? 1 : 0.6,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer"
                        style={{
                          background: cust.enabled
                            ? goldColor
                            : `${brassColor}20`,
                        }}
                        role="switch"
                        aria-checked={cust.enabled}
                      >
                        <span
                          className={`inline-block size-3.5 rounded-full transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`}
                          style={{
                            backgroundColor: cust.enabled
                              ? "#0a0a1a"
                              : "rgba(255,255,255,0.6)",
                          }}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: cust.enabled
                                ? "rgba(255,255,255,0.85)"
                                : "rgba(255,255,255,0.35)",
                              textDecoration: cust.enabled
                                ? "none"
                                : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span
                            className="text-[10px] flex-shrink-0 flex items-center gap-1"
                            style={{ color: `${brassColor}40` }}
                          >
                            {isRamp ? (
                              <Repeat className="size-3" />
                            ) : (
                              <Milestone className="size-3" />
                            )}
                            {isRamp ? "habit" : "milestone"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className="text-xs"
                            style={{ color: `${brassColor}55` }}
                          >
                            Target:
                          </span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0)
                                updateTarget(goal.id, v)
                            }}
                            className="w-16 text-right text-sm font-medium rounded px-1.5 py-0.5 focus:outline-none"
                            style={{
                              backgroundColor: `${brassColor}08`,
                              border: `1px solid ${brassColor}20`,
                              color: "rgba(255,255,255,0.85)",
                            }}
                            min={1}
                          />
                          {isRamp && (
                            <span
                              className="text-xs"
                              style={{ color: `${brassColor}45` }}
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
          </CollapsibleSection>
        )
      })}

      {/* Confirm footer */}
      <div
        className="sticky bottom-0 backdrop-blur-sm py-4 -mx-6 px-6"
        style={{
          backgroundColor: "rgba(10, 10, 26, 0.95)",
          borderTop: `1px solid ${brassColor}15`,
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <span className="font-semibold" style={{ color: goldColor }}>
              {enabledCount}
            </span>{" "}
            instruments calibrated
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onBack}
              style={{ color: `${brassColor}80` }}
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              className="cursor-pointer"
              style={{
                backgroundColor: goldColor,
                color: "#0a0a1a",
                boxShadow: `0 0 12px ${goldColor}40`,
              }}
            >
              Chart the System
              <Star className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
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
          <ChevronDown
            className="size-4"
            style={{ color: "rgba(205, 133, 63, 0.5)" }}
          />
        ) : (
          <ChevronRight
            className="size-4"
            style={{ color: "rgba(205, 133, 63, 0.5)" }}
          />
        )}
        {icon}
        <span
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "rgba(205, 133, 63, 0.6)" }}
        >
          {title}
        </span>
        <span
          className="text-xs"
          style={{ color: "rgba(205, 133, 63, 0.35)" }}
        >
          {count}/{total}
        </span>
        <div
          className="flex-1 ml-2"
          style={{ borderTop: "1px solid rgba(205, 133, 63, 0.1)" }}
        />
      </button>
      {subtitle && isExpanded && (
        <p
          className="text-xs italic mb-2 ml-6"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
