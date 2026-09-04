"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import { HistoryBarrierProvider } from "@/src/shared/HistoryBarrierContext"
import { PILLARS, OBJECTIVES, TARGETS, TEMPLATES, deriveStartValue, getObjectivesForPillar, getTemplatesForPillar, getPrimaryTemplateForObjective } from "@/src/goals/data/newGoalFramework"
import { todayISO } from "@/src/goals/horizonService"
import type { Pillar, Template, TargetOverride } from "@/src/goals/data/newGoalFramework"
import type { IntakeMatches, IntakeResolution } from "@/src/goals/intakeService"
import type { CustomTarget, CustomCard, NewGoalsFlowState } from "@/src/goals/types"
import type { ProgramSelection } from "@/src/programs/types"
import { GoalIntake } from "./GoalIntake"
import { GoalsConfigStep } from "./GoalsConfigStep"
import { SummaryStep } from "./SummaryStep"
import { clarifierPrompt, clarifierOption, AUTHORED_CLARIFIERS } from "./clarifiers"
import { ArrowLeft, ArrowRight, Check, Compass, Dumbbell, Heart, Landmark, type LucideIcon } from "lucide-react"
import { applyProgramReference } from "@/src/goals/northStarStorage"
import { getProgram } from "@/src/programs/data/catalog"

/** What POST /api/goals/plan reports back about the programs it enrolled. */
interface EnrolledRef {
  programId: string
  enrollmentId: string
  startedAt: string
}


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

// The four life areas offered as one-click focus entry points below the matcher.
// (Vices is deliberately excluded — it's reachable via the plan board's area toggles.)
const FOCUS_AREA_IDS = ["health", "wealth", "relations", "meaning"] as const
const FOCUS_AREA_ICONS: Record<string, LucideIcon> = { Dumbbell, Landmark, Heart, Compass }
// Icons drawn as a solid silhouette rather than an outline.
const FILLED_FOCUS_ICONS = new Set(["Heart"])

// The objective choices a focus-area click offers: the authored clarifier options
// (curated order + copy), else the area's own objectives.
const clarifierObjectiveIds = (pillarId: string): string[] => {
  const authored = Object.keys(AUTHORED_CLARIFIERS[pillarId]?.options ?? {})
  return (authored.length ? authored : getObjectivesForPillar(pillarId).map((o) => o.id)).slice(0, 5)
}

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

export function NewGoalsFlow({
  onSaved,
  sandbox = false,
  onSandboxSave,
}: {
  onSaved?: () => void
  /** Fully disconnected mode: no rehydrate from /api/goals/plan, no POST on save. */
  sandbox?: boolean
  /** Sandbox save hands the flow state up instead of persisting it. */
  onSandboxSave?: (state: NewGoalsFlowState) => void
} = {}) {
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
  // True only when the user TYPED a north star and matched it. Distinct from `matches`,
  // which the focus-area entry point also seeds (with an empty match) to mount the plan
  // board. Once a north star exists, the plan follows it directly — the focus-area picker
  // hides (areas stay toggleable on the plan board itself).
  const [intakeMatched, setIntakeMatched] = useState(false)
  // Per-tier target dates — flow-state ONLY (deliberately NOT persisted: dating an
  // L0/L1 row would make the production hub render countdown/Destinations badges).
  const [pillarDates, setPillarDates] = useState<Record<string, string>>({})
  const [objectiveDates, setObjectiveDates] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  // Optional workout programs attached under Health (≤1 per discipline) → enrolled (idempotently) on save.
  const [programSelections, setProgramSelections] = useState<ProgramSelection[]>([])

  const { step, isFirst, isLast, goNext, goBack } = useSteppedFlow(STEPS, "plan")

  // Rehydrate a previously saved plan when the flow opens. Sandbox stays blank —
  // it must not read (or reflect) the user's real plan.
  useEffect(() => {
    if (sandbox) return
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
        if (Array.isArray(data.programSelections) && data.programSelections.length) setProgramSelections(data.programSelections)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sandbox])

  const handleSave = useCallback(async () => {
    if (sandbox) {
      // Disconnected save: hand the plan up (the lab materializes it locally).
      onSandboxSave?.({ pillars: pillarOrder, objectives: objectiveOrder, targetOverrides, labels, customTargets })
      setSaveStatus("saved")
      if (onSaved) setTimeout(onSaved, 900)
      return
    }
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
          programSelections,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed")
      /**
       * Tell the Life Mastery plan which enrollments this save created.
       *
       * Without it, a program started here was the one of three entry points
       * that left the plan claiming whatever it claimed before — the plan and
       * the database asserting different things about what you train, with
       * nothing to settle it. Day names are not sent: this screen does not edit
       * the training week, and `applyProgramToWorkoutRoutine` leaves an existing
       * week alone when given none.
       */
      const body = (await res.json().catch(() => null)) as { enrolled?: EnrolledRef[] } | null
      for (const ref of body?.enrolled ?? []) {
        applyProgramReference({
          programId: ref.programId,
          enrollmentId: ref.enrollmentId,
          label: getProgram(ref.programId)?.name ?? ref.programId,
          startedAt: ref.startedAt,
        })
      }
      setSaveStatus("saved")
      // Hand off to the Track view after a beat so the "✓ Saved" confirmation shows.
      if (onSaved) setTimeout(onSaved, 900)
    } catch (e) {
      console.error("Save plan failed:", e)
      setSaveStatus("error")
    }
  }, [sandbox, onSandboxSave, pillarOrder, objectiveOrder, targetOverrides, labels, customTargets, programSelections, onSaved])

  // Any edit after a save returns the button to its actionable state.
  useEffect(() => {
    setSaveStatus((s) => (s === "saved" ? "idle" : s))
  }, [targetOverrides, pillarOrder, objectiveOrder, labels, customTargets, programSelections])

  const renameItem = useCallback((id: string, label: string) => {
    setLabels((prev) => ({ ...prev, [id]: label }))
  }, [])

  const addCustomTarget = useCallback((pillarId: string, cardId?: string) => {
    const id = nextId("custom_tgt")
    setCustomTargets((prev) => [...prev, { id, pillarId, unit: "", cardId }])
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
    setIntakeMatched(true)
    // res.pillarIds arrive in match-score order (strongest first) — that IS the machine's
    // best guess at priority, so it LEADS the rank. Any area already on (rehydrated from a
    // saved plan, or clicked as a focus area) keeps its place behind them rather than
    // outranking what the user just typed.
    if (res.pillarIds.length) setPillarOrder(prev => appendOrder(res.pillarIds, prev))
    // NOTHING is preselected. The match's job is to ORDER the areas (above) and RANK the
    // routines inside each (templatesForPillarRanked) — picking is the user's move, since
    // "the one thing that needs to happen" is a decision we shouldn't make for them.
  }, [])

  // Routine cards the user wrote themselves; their goals carry `cardId`.
  const [customCards, setCustomCards] = useState<CustomCard[]>([])
  const addCustomCard = useCallback((pillarId: string) => {
    const id = nextId("custom_card")
    setCustomCards((prev) => [...prev, { id, pillarId }])
    setLabels((prev) => ({ ...prev, [id]: "My routine" }))
  }, [])
  const removeCustomCard = useCallback((id: string) => {
    setCustomCards((prev) => prev.filter((c) => c.id !== id))
    // The card's goals go with it — leaving them behind would strand them as
    // loose goals the user never asked for.
    setCustomTargets((prev) => prev.filter((c) => c.cardId !== id))
    setLabels((prev) => { const n = { ...prev }; delete n[id]; return n })
  }, [])

  // Areas the user wrote themselves. They live alongside the framework pillars in
  // `pillarOrder`, so they rank, date, and drag exactly like the built-in ones.
  const [customAreas, setCustomAreas] = useState<Pillar[]>([])
  const addCustomArea = useCallback(() => {
    const id = nextId("custom_area")
    // Cycle the accent so two custom areas never read as the same one.
    const palette = ["#14b8a6", "#f472b6", "#38bdf8", "#fb923c"]
    setCustomAreas((prev) => [
      ...prev,
      { id, label: "My area", tagline: "Your own", icon: "Sparkles", color: palette[prev.length % palette.length], glowColor: "rgba(255,255,255,0.2)", values: [] },
    ])
    setLabels((prev) => ({ ...prev, [id]: "My area" }))
    setPillarOrder((prev) => appendOrder(prev, [id]))
  }, [])

  // An area's own target date ("" → back to inheriting the main "achieve goal by" date).
  const changePillarDate = useCallback((id: string, date: string) => {
    setPillarDates((prev) => {
      const next = { ...prev }
      if (date) next[id] = date
      else delete next[id] // back to inheriting the main date
      return next
    })
  }, [])

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

  // Focus-area entry point. Clicking a card toggles the area on and asks that area's
  // clarifying question INLINE under the cards (the plan board would be empty noise at
  // this point — it only mounts once the user picks an objective, or via a typed match).
  // Which areas were clicked this session — rehydrated areas shouldn't sprout questions.
  const [focusPicked, setFocusPicked] = useState<string[]>([])
  const pickFocusArea = useCallback((pillarId: string) => {
    const isOn = selectedPillars.has(pillarId)
    setFocusPicked((prev) => (isOn ? prev.filter((x) => x !== pillarId) : [...prev, pillarId]))
    toggleArea(pillarId)
  }, [selectedPillars, toggleArea])

  // Answering the inline question: apply the objective's primary routine, then mount the
  // plan board — now it opens with something real (the routine picked, the area decided).
  const chooseFocusObjective = useCallback((objectiveId: string) => {
    const tmpl = getPrimaryTemplateForObjective(objectiveId)
    if (tmpl) applyTemplate(tmpl, 0)
    setMatches((m) => m ?? { pillars: [], objectives: [] })
  }, [applyTemplate])

  // "Skip" on an inline question → open the board anyway; its question tree re-asks there.
  const openBoard = useCallback(() => {
    setMatches((m) => m ?? { pillars: [], objectives: [] })
  }, [])

  const areaDecided = useCallback((pillarId: string) =>
    getTemplatesForPillar(pillarId).some((t) => appliedTemplateIds.has(t.id)),
  [appliedTemplateIds])

  // Inline questions: only for areas clicked this session, still on, not yet decided,
  // and only while the board is unmounted (once it mounts, its question tree takes over).
  const inlineQuestionAreas = !matches
    ? focusPicked.filter((id) => selectedPillars.has(id) && !areaDecided(id))
    : []

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
              <GoalIntake onMatched={onMatched} date={intakeDate} onChangeDate={setIntakeDate} matched={intakeMatched} />

              {/* Or skip typing: click a focus area to start the plan from that life area.
                  Hidden once a north star is matched — the plan is then the next thing. */}
              {!intakeMatched && (
              <div className="mb-8">
                <p className="text-xs text-zinc-500 text-center mb-3">…or pick a focus area</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FOCUS_AREA_IDS.map((id) => {
                    const pillar = PILLARS.find((p) => p.id === id)
                    if (!pillar) return null
                    const Icon = FOCUS_AREA_ICONS[pillar.icon]
                    const on = selectedPillars.has(pillar.id)
                    return (
                      <button
                        key={pillar.id}
                        onClick={() => pickFocusArea(pillar.id)}
                        aria-pressed={on}
                        className={`relative rounded-xl border p-4 text-center transition-all ${
                          on
                            ? "border-white/25 bg-white/[0.07]"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        {on && (
                          <span
                            className="absolute top-2 right-2 size-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: pillar.color }}
                          >
                            <Check className="size-3 text-zinc-950" strokeWidth={3} />
                          </span>
                        )}
                        {Icon && (
                          <Icon
                            className="size-6 mx-auto mb-2"
                            style={{ color: pillar.color }}
                            fill={FILLED_FOCUS_ICONS.has(pillar.icon) ? pillar.color : "none"}
                          />
                        )}
                        <span className="block text-sm font-semibold text-white">{pillar.label}</span>
                        <span className="block text-[11px] text-zinc-500 mt-0.5">{pillar.tagline}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Clicked an area → ask that area's question right here, where they clicked.
                    Answering applies the routine and opens the plan board below. */}
                {inlineQuestionAreas.map((pillarId) => {
                  const pillar = PILLARS.find((p) => p.id === pillarId)
                  if (!pillar) return null
                  return (
                    <div
                      key={pillar.id}
                      className="mt-4 rounded-xl border bg-white/[0.03] p-4"
                      style={{ borderColor: `${pillar.color}40` }}
                    >
                      <p className="text-sm font-semibold text-white mb-3">
                        {clarifierPrompt(pillar.id, pillar.label)}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {clarifierObjectiveIds(pillar.id).map((objId) => {
                          const obj = OBJECTIVES.find((o) => o.id === objId)
                          if (!obj) return null
                          const copy = clarifierOption(pillar.id, objId)
                          return (
                            <button
                              key={objId}
                              onClick={() => chooseFocusObjective(objId)}
                              className="text-left rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 transition-all px-3 py-2.5"
                            >
                              <span className="flex items-center gap-2">
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                                <span className="text-[13px] font-medium text-white">{copy?.label ?? obj.label}</span>
                              </span>
                              <span className="block text-[11px] text-zinc-500 mt-0.5 pl-4">{copy?.sub ?? obj.description}</span>
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={openBoard}
                        className="mt-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Not sure — show me everything in {pillar.label} ↓
                      </button>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
            {/* Breathing room after the north star — it's an intake, and what follows is a
                separate question. The gap is the beat between the two. */}
            {matches && <div className="h-[18vh] min-h-16" aria-hidden />}
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
              customCards={customCards}
              onAddCustomCard={addCustomCard}
              onRemoveCustomCard={removeCustomCard}
              customAreas={customAreas}
              onAddCustomArea={addCustomArea}
              onRename={renameItem}
              onAddCustomTarget={addCustomTarget}
              onRemoveCustomTarget={removeCustomTarget}
              startDate={startDate}
              onChangeStartDate={setStartDate}
              pillarDates={pillarDates}
              onChangePillarDate={changePillarDate}
              objectiveDates={objectiveDates}
              onChangeObjectiveDate={(id, d) => setObjectiveDates(prev => ({ ...prev, [id]: d }))}
              programSelections={programSelections}
              onChangeProgramSelections={setProgramSelections}
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
