"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import { getObjectivesForPillar, OBJECTIVES, TARGETS, deriveStartValue, getTemplatesForPillar, getPrimaryTemplateForObjective } from "@/src/goals/data/newGoalFramework"
import type { Template, TargetOverride } from "@/src/goals/data/newGoalFramework"
import type { CustomTarget } from "@/src/goals/types"
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
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [customTargets, setCustomTargets] = useState<CustomTarget[]>([])
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const { step, isFirst, isLast, goNext, goBack } = useSteppedFlow(STEPS, "focus")

  // Rehydrate a previously saved plan when the flow opens.
  useEffect(() => {
    let cancelled = false
    fetch("/api/goals/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (Array.isArray(data.pillars) && data.pillars.length) setSelectedPillars(new Set(data.pillars))
        if (Array.isArray(data.objectives) && data.objectives.length) setSelectedObjectives(new Set(data.objectives))
        if (data.targetOverrides && Object.keys(data.targetOverrides).length) setTargetOverrides(data.targetOverrides)
        if (data.labels && Object.keys(data.labels).length) setLabels(data.labels)
        if (Array.isArray(data.customTargets) && data.customTargets.length) setCustomTargets(data.customTargets)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSave = useCallback(async () => {
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/goals/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillars: [...selectedPillars],
          objectives: [...selectedObjectives],
          targetOverrides,
          labels,
          customTargets,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed")
      setSaveStatus("saved")
    } catch (e) {
      console.error("Save plan failed:", e)
      setSaveStatus("error")
    }
  }, [selectedPillars, selectedObjectives, targetOverrides, labels, customTargets])

  // Any edit after a save returns the button to its actionable state.
  useEffect(() => {
    setSaveStatus((s) => (s === "saved" ? "idle" : s))
  }, [targetOverrides, selectedPillars, selectedObjectives, labels, customTargets])

  const renameItem = useCallback((id: string, label: string) => {
    setLabels((prev) => ({ ...prev, [id]: label }))
  }, [])

  const addCustomTarget = useCallback((pillarId: string) => {
    const id = nextId("custom_tgt")
    setCustomTargets((prev) => [...prev, { id, pillarId, unit: "" }])
    setLabels((prev) => ({ ...prev, [id]: "New goal" }))
    setTargetOverrides((prev) => ({
      ...prev,
      [id]: { enabled: true, value: 10, steps: 7, curveTension: 0, targetDate: "" },
    }))
  }, [])

  const removeCustomTarget = useCallback((id: string) => {
    setCustomTargets((prev) => prev.filter((c) => c.id !== id))
    setLabels((prev) => { const n = { ...prev }; delete n[id]; return n })
    setTargetOverrides((prev) => { const n = { ...prev }; delete n[id]; return n })
  }, [])

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
        const target = TARGETS.find(t => t.id === targetId)
        const mc = target?.milestoneConfig
        const value = levelValue ?? next[targetId]?.value ?? mc?.target ?? 0
        // Seed a level-appropriate START that scales with the chosen target, so the
        // ladder (start → target) makes sense at every level — not just Beginner.
        // Cumulative metrics (no metricKind) keep the authored baseline start.
        const startValue =
          enabled && target?.metricKind && target.metricKind !== "cumulative" && mc
            ? deriveStartValue(target.metricKind, value)
            : undefined
        // Cap milestone count to the span so a tiny range (e.g. pull-ups 3→5 or
        // 5 kiss closes) doesn't repeat the same number across many dots.
        const authoredSteps = mc?.steps || 0
        const effStart = startValue ?? mc?.start
        const span = mc && effStart != null ? Math.abs(value - effStart) : Infinity
        const cappedSteps = Number.isFinite(span)
          ? Math.min(authoredSteps, Math.max(2, Math.floor(span) + 1))
          : authoredSteps
        next[targetId] = {
          enabled,
          value,
          startValue,
          // Recompute steps fresh for the chosen level (a level switch resets the
          // numbers), capping to the span so the ladder is appropriately fine.
          steps: cappedSteps || mc?.steps || 0,
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

  // Free-text intake → apply a template per matched objective (so its targets are
  // actually enabled on the Goals step), plus a starter template for any matched
  // area with no specific objective, then select the pillars and advance.
  const applyIntake = useCallback((pillarIds: string[], objectiveIds: string[]) => {
    if (pillarIds.length) setSelectedPillars(prev => { const n = new Set(prev); for (const id of pillarIds) n.add(id); return n })

    const templates = new Set<Template>()
    for (const objId of objectiveIds) {
      const tmpl = getPrimaryTemplateForObjective(objId)
      if (tmpl) templates.add(tmpl)
    }
    const objPillars = new Set(objectiveIds.map(id => OBJECTIVES.find(o => o.id === id)?.pillarId).filter(Boolean))
    for (const pid of pillarIds) {
      if (!objPillars.has(pid)) {
        const starter = getTemplatesForPillar(pid)[0]
        if (starter) templates.add(starter)
      }
    }
    for (const t of templates) applyTemplate(t, 0)
    if (objectiveIds.length) setSelectedObjectives(prev => { const n = new Set(prev); for (const id of objectiveIds) n.add(id); return n })
    goNext()
  }, [applyTemplate, goNext])

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
              onApplyIntake={applyIntake}
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
              labels={labels}
              customTargets={customTargets}
              onRename={renameItem}
              onAddCustomTarget={addCustomTarget}
              onRemoveCustomTarget={removeCustomTarget}
            />
          )}
          {step === "summary" && (
            <SummaryStep
              selectedPillars={selectedPillars}
              selectedObjectives={selectedObjectives}
              targetOverrides={targetOverrides}
              labels={labels}
              customTargets={customTargets}
              onRename={renameItem}
              onSave={handleSave}
              saveStatus={saveStatus}
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
