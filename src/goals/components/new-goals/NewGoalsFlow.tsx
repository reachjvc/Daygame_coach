"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import { getObjectivesForPillar, TARGETS } from "@/src/goals/data/newGoalFramework"
import type { Template, TargetOverride } from "@/src/goals/data/newGoalFramework"
import { IdentityStep } from "./IdentityStep"
import { GoalsConfigStep } from "./GoalsConfigStep"
import { SummaryStep } from "./SummaryStep"
import { ArrowLeft, ArrowRight } from "lucide-react"

const STEPS = ["focus", "goals", "summary"] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  focus: "Focus",
  goals: "Goals",
  summary: "Summary",
}

let _customId = 0
function nextId(prefix: string) { return `${prefix}_${++_customId}` }

export function NewGoalsFlow() {
  const [selectedPillars, setSelectedPillars] = useState<Set<string>>(new Set())
  const [selectedObjectives, setSelectedObjectives] = useState<Set<string>>(new Set())
  const [targetOverrides, setTargetOverrides] = useState<Record<string, TargetOverride>>({})
  const [customPillars, setCustomPillars] = useState<{ id: string; label: string }[]>([])

  const { step, isFirst, isLast, goNext, goBack } = useSteppedFlow(STEPS, "focus")

  const hasEnabledTargets = useMemo(() => {
    return Object.values(targetOverrides).some(o => o.enabled)
  }, [targetOverrides])

  const canAdvance =
    (step === "focus" && selectedPillars.size > 0) ||
    (step === "goals" && hasEnabledTargets) ||
    step === "summary"

  const togglePillar = useCallback((pillarId: string) => {
    setSelectedPillars(prev => {
      const next = new Set(prev)
      if (next.has(pillarId)) {
        next.delete(pillarId)
        const orphanIds = getObjectivesForPillar(pillarId).map(o => o.id)
        setSelectedObjectives(prev2 => {
          const next2 = new Set(prev2)
          for (const id of orphanIds) next2.delete(id)
          return next2
        })
      } else {
        next.add(pillarId)
      }
      return next
    })
  }, [])

  const addCustomPillar = useCallback((label: string) => {
    const id = nextId("custom_pillar")
    setCustomPillars(prev => [...prev, { id, label }])
    setSelectedPillars(prev => new Set(prev).add(id))
  }, [])

  const toggleObjective = useCallback((id: string) => {
    setSelectedObjectives(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const applyTemplate = useCallback((template: Template, levelIndex: number) => {
    const level = template.levels[levelIndex]

    // Set the template's objectives as selected
    setSelectedObjectives(prev => {
      const next = new Set(prev)
      for (const objId of template.objectiveIds) next.add(objId)
      return next
    })
    // Apply target overrides: enabled from template.targetOverrides, values from level.targetValues
    setTargetOverrides(prev => {
      const next = { ...prev }
      for (const [targetId, enabled] of Object.entries(template.targetOverrides)) {
        const levelValue = level?.targetValues[targetId]
        const mc = TARGETS.find(t => t.id === targetId)?.milestoneConfig
        next[targetId] = {
          enabled,
          value: levelValue ?? next[targetId]?.value ?? mc?.target ?? 0,
          // Inherit the target's authored step count / curve so the ladder keeps
          // its intended shape (a previously user-set value wins via `||` / `??`).
          steps: next[targetId]?.steps || mc?.steps || 0,
          curveTension: next[targetId]?.curveTension ?? mc?.curveTension ?? 0,
          targetDate: next[targetId]?.targetDate ?? "",
        }
      }
      return next
    })
  }, [])

  const unapplyTemplate = useCallback((template: Template) => {
    // Disable all targets that this template enables
    setTargetOverrides(prev => {
      const next = { ...prev }
      for (const [targetId, enabled] of Object.entries(template.targetOverrides)) {
        if (enabled) {
          next[targetId] = { ...next[targetId], enabled: false, value: 0, startValue: undefined, steps: 0, curveTension: 0, targetDate: '', milestoneEdits: undefined, rampSteps: undefined }
        }
      }
      return next
    })
    // Remove objectives
    setSelectedObjectives(prev => {
      const next = new Set(prev)
      for (const objId of template.objectiveIds) next.delete(objId)
      return next
    })
  }, [])

  const updateTarget = useCallback(
    (targetId: string, updates: Partial<TargetOverride>) => {
      setTargetOverrides(prev => {
        const existing = prev[targetId]
        const merged = { ...existing, ...updates }
        // Changing the milestone count remaps step indices, so any pinned
        // milestone values/dates from the old count are no longer meaningful.
        if (updates.steps !== undefined && existing?.steps !== updates.steps) {
          merged.milestoneEdits = undefined
        }
        return { ...prev, [targetId]: merged }
      })
    },
    [],
  )

  return (
    <HistoryBarrierProvider>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Step indicator */}
        <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <div className="h-px flex-1 bg-white/10" />}
                <div
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${
                    s === step ? "bg-white/10 text-white" : "text-zinc-500"
                  }`}
                >
                  {STEP_LABELS[s]}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
          {step === "focus" && (
            <IdentityStep
              selectedPillars={selectedPillars}
              onTogglePillar={togglePillar}
              onNext={goNext}
              customPillars={customPillars}
              onAddCustomPillar={addCustomPillar}
            />
          )}
          {step === "goals" && (
            <GoalsConfigStep
              selectedPillars={selectedPillars}
              selectedObjectives={selectedObjectives}
              targetOverrides={targetOverrides}
              onToggleObjective={toggleObjective}
              onApplyTemplate={applyTemplate}
              onUnapplyTemplate={unapplyTemplate}
              onUpdateTarget={updateTarget}
            />
          )}
          {step === "summary" && (
            <SummaryStep
              selectedPillars={selectedPillars}
              selectedObjectives={selectedObjectives}
              targetOverrides={targetOverrides}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between">
            <button
              onClick={goBack}
              disabled={isFirst}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <button
              onClick={goNext}
              disabled={isLast || !canAdvance}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/15"
            >
              {isLast ? "Done" : "Next"} {!isLast && <ArrowRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </HistoryBarrierProvider>
  )
}
