"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import { TARGETS, TEMPLATES, deriveStartValue, getTemplatesForPillar, getPrimaryTemplateForObjective } from "@/src/goals/data/newGoalFramework"
import { todayISO } from "@/src/goals/horizonService"
import type { Template, TargetOverride } from "@/src/goals/data/newGoalFramework"
import type { IntakeMatches, IntakeResolution } from "@/src/goals/intakeService"
import type { CustomTarget } from "@/src/goals/types"
import { GoalIntake } from "./GoalIntake"
import { GoalsConfigStep } from "./GoalsConfigStep"
import { SummaryStep } from "./SummaryStep"
import { ArrowLeft, ArrowRight } from "lucide-react"

// Journey: Plan (type your goal → match → templates/areas/priority appear inline, no extra
// step) → Roadmap (staggered dated cascade → save → track).
const STEPS = ["plan", "roadmap"] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  plan: "Plan",
  roadmap: "Roadmap",
}

let _customId = 0
function nextId(prefix: string) { return `${prefix}_${++_customId}` }

// Append ids not already present (order-preserving); remove a set of ids.
const appendOrder = (prev: string[], ids: string[]) => {
  const has = new Set(prev)
  const next = [...prev]
  for (const id of ids) if (!has.has(id)) { next.push(id); has.add(id) }
  return next
}
const removeOrder = (prev: string[], ids: string[]) => {
  const rm = new Set(ids)
  return prev.filter((x) => !rm.has(x))
}

export function NewGoalsFlow({ onSaved }: { onSaved?: () => void } = {}) {
  // Priority RANK is the source of truth: ordered arrays, not Sets. Children still
  // receive Sets (derived) so their `.has()` membership checks are unchanged.
  const [pillarOrder, setPillarOrder] = useState<string[]>([])
  const [objectiveOrder, setObjectiveOrder] = useState<string[]>([])
  const selectedPillars = useMemo(() => new Set(pillarOrder), [pillarOrder])
  const selectedObjectives = useMemo(() => new Set(objectiveOrder), [objectiveOrder])
  const [targetOverrides, setTargetOverrides] = useState<Record<string, TargetOverride>>({})
  // Which templates the user EXPLICITLY picked. Source of truth for the "is this routine
  // selected?" UI — we can't infer it from enabled targets because sibling routines in an
  // area share targets (a narrow routine reads as "active" when a broad one is applied).
  const [appliedTemplateIds, setAppliedTemplateIds] = useState<Set<string>>(new Set())
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [customTargets, setCustomTargets] = useState<CustomTarget[]>([])
  const [startDate, setStartDate] = useState<string>(() => todayISO())
  // Overall "achieve by" anchor captured at intake (distinct from startDate = the start).
  const [intakeDate, setIntakeDate] = useState<string>("")
  // The intake match result — drives template ranking + pre-selection on the Plan step.
  const [matches, setMatches] = useState<IntakeMatches | null>(null)
  // Per-tier target dates — flow-state ONLY (deliberately NOT persisted: dating an
  // L0/L1 row would make the production hub render countdown/Destinations badges).
  const [pillarDates, setPillarDates] = useState<Record<string, string>>({})
  const [objectiveDates, setObjectiveDates] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const { step, isFirst, isLast, goNext, goBack } = useSteppedFlow(STEPS, "plan")

  // Rehydrate a previously saved plan when the flow opens.
  useEffect(() => {
    let cancelled = false
    fetch("/api/goals/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        // data.pillars/objectives arrive in saved priority order (position).
        if (Array.isArray(data.pillars) && data.pillars.length) setPillarOrder(data.pillars)
        if (Array.isArray(data.objectives) && data.objectives.length) setObjectiveOrder(data.objectives)
        if (data.targetOverrides && Object.keys(data.targetOverrides).length) {
          setTargetOverrides(data.targetOverrides)
          // No template ids are persisted, so reconstruct "applied" from enabled targets: a
          // template counts as picked if all the targets it enables are enabled in the saved plan.
          const ids = new Set<string>()
          for (const t of TEMPLATES) {
            const wants = Object.entries(t.targetOverrides).filter(([, on]) => on).map(([id]) => id)
            if (wants.length && wants.every((id) => data.targetOverrides[id]?.enabled)) ids.add(t.id)
          }
          if (ids.size) setAppliedTemplateIds(ids)
        }
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
          pillars: pillarOrder,
          objectives: objectiveOrder,
          targetOverrides,
          labels,
          customTargets,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed")
      setSaveStatus("saved")
      // Hand off to the Track view after a beat so the "✓ Saved" confirmation shows.
      if (onSaved) setTimeout(onSaved, 900)
    } catch (e) {
      console.error("Save plan failed:", e)
      setSaveStatus("error")
    }
  }, [pillarOrder, objectiveOrder, targetOverrides, labels, customTargets, onSaved])

  // Any edit after a save returns the button to its actionable state.
  useEffect(() => {
    setSaveStatus((s) => (s === "saved" ? "idle" : s))
  }, [targetOverrides, pillarOrder, objectiveOrder, labels, customTargets])

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
    (step === "plan" && hasEnabledTargets) ||
    step === "roadmap"

  const toggleObjective = useCallback((id: string) => {
    setObjectiveOrder(prev => prev.includes(id) ? removeOrder(prev, [id]) : appendOrder(prev, [id]))
  }, [])

  // Priority ranking: area order = rank (#1..N) → persists via `position`, orders the roadmap.
  const reorderPillars = useCallback((ids: string[]) => {
    setPillarOrder(prev => appendOrder(ids.filter(id => prev.includes(id)), prev))
  }, [])

  const applyTemplate = useCallback((template: Template, levelIndex: number) => {
    const level = template.levels[levelIndex]

    setAppliedTemplateIds(prev => prev.has(template.id) ? prev : new Set(prev).add(template.id))
    // Set the template's objectives as selected (append, preserving rank order)
    setObjectiveOrder(prev => appendOrder(prev, template.objectiveIds))
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
    setAppliedTemplateIds(prev => { if (!prev.has(template.id)) return prev; const n = new Set(prev); n.delete(template.id); return n })
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
    setObjectiveOrder(prev => removeOrder(prev, template.objectiveIds))
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

  // Match → store the match (drives template ranking), seed area rank (match-score order),
  // and PRE-APPLY the primary template per matched objective so the plan appears immediately
  // BELOW the matcher (same page — no extra step). The user refines areas/templates/priority
  // right there. (No goNext — the plan is inline.)
  const onMatched = useCallback((m: IntakeMatches, res: IntakeResolution) => {
    setMatches(m)
    if (res.pillarIds.length) setPillarOrder(prev => appendOrder(prev, res.pillarIds))
    // AUTO-apply only the objectives that clearly dominate their area (resolveIntake.objectiveIds —
    // tested tie/floor logic). Each auto-objective applies its primary routine. The remaining
    // (ambiguous / weak) areas get NOTHING here → the Plan step asks an objective-level question
    // ("which part of {area}?") so the user narrows it. No template dumping.
    for (const objId of res.objectiveIds) {
      const tmpl = getPrimaryTemplateForObjective(objId)
      if (tmpl) applyTemplate(tmpl, 0)
    }
  }, [applyTemplate])

  // Toggle a whole area on/off. Off → unapply all its templates (disable targets +
  // drop objectives) and remove the pillar. On → add the pillar so its suggestions show.
  const toggleArea = useCallback((pillarId: string) => {
    if (selectedPillars.has(pillarId)) {
      for (const t of getTemplatesForPillar(pillarId)) unapplyTemplate(t)
      setPillarOrder(prev => removeOrder(prev, [pillarId]))
    } else {
      setPillarOrder(prev => appendOrder(prev, [pillarId]))
    }
  }, [selectedPillars, unapplyTemplate])

  return (
    <HistoryBarrierProvider>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Step indicator */}
        <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-2">
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
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24">
          {step === "plan" && (
            <>
            {/* Matcher stays a comfortable reading width even though the plan below goes full-width. */}
            <div className="max-w-3xl mx-auto">
              <GoalIntake onMatched={onMatched} date={intakeDate} onChangeDate={setIntakeDate} matched={!!matches} />
            </div>
            {matches && (
            <GoalsConfigStep
              selectedPillars={selectedPillars}
              selectedObjectives={selectedObjectives}
              pillarOrder={pillarOrder}
              appliedTemplateIds={appliedTemplateIds}
              matches={matches}
              intakeDate={intakeDate}
              onChangeIntakeDate={setIntakeDate}
              onToggleArea={toggleArea}
              onReorderPillars={reorderPillars}
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
              startDate={startDate}
              onChangeStartDate={setStartDate}
              objectiveDates={objectiveDates}
              onChangeObjectiveDate={(id, d) => setObjectiveDates(prev => ({ ...prev, [id]: d }))}
            />
            )}
            </>
          )}
          {step === "roadmap" && (
            <div className="max-w-4xl mx-auto">
            <SummaryStep
              selectedPillars={selectedPillars}
              selectedObjectives={selectedObjectives}
              pillarOrder={pillarOrder}
              objectiveOrder={objectiveOrder}
              targetOverrides={targetOverrides}
              labels={labels}
              customTargets={customTargets}
              onRename={renameItem}
              onSave={handleSave}
              saveStatus={saveStatus}
              startDate={startDate}
              pillarDates={pillarDates}
              objectiveDates={objectiveDates}
              defaultView="roadmap"
            />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
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
