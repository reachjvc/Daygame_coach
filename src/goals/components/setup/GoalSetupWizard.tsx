"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import { useBackableState } from "@/src/shared/useBackableState"
import { useSetupCatalog } from "@/src/goals/hooks/useSetupCatalog"
import { buildSetupInserts } from "@/src/goals/goalsService"
import { STEPS, STEP_LABELS, nextCustomId, type FlowStep } from "./setupConstants"
import { AuroraBackground } from "./AuroraBackground"
import { AnimatedStep } from "./AnimatedStep"
import { BottomBar } from "./BottomBar"
import { DirectionStep } from "./DirectionStep"
import { GoalsStep, type GoalsStepTourHandle } from "./GoalsStep"
import { GoalsStepTour } from "./GoalsStepTour"
import { SummaryStep } from "./SummaryStep"
import { GoalCatalogPicker } from "../GoalCatalogPicker"
import { getDaygamePathL1, GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"
import type { DaygamePath, HabitRampStep, MilestoneLadderConfig, SetupCustomGoal, SetupCustomCategory } from "@/src/goals/types"

export function GoalSetupWizard({ returnPath = "/dashboard/goals" }: { returnPath?: string } = {}) {
  const router = useRouter()
  const catalog = useSetupCatalog()

  const { step, stepIndex, setStep } = useSteppedFlow(STEPS, "direction" as FlowStep)
  const [path, setPath] = useState<DaygamePath | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedL1s, setSelectedL1s] = useState<Set<string>>(new Set())
  const [customL1s, setCustomL1s] = useState<{ id: string; text: string; path: DaygamePath }[]>([])
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [curveConfigs, setCurveConfigs] = useState<Record<string, MilestoneLadderConfig>>({})
  const [rampConfigs, setRampConfigs] = useState<Record<string, HabitRampStep[]>>({})
  const [rampEnabled, setRampEnabled] = useState<Set<string>>(new Set())
  const [customGoals, setCustomGoals] = useState<SetupCustomGoal[]>([])
  const [customCategories, setCustomCategories] = useState<SetupCustomCategory[]>([])
  const [targetDates, setTargetDates] = useState<Record<string, string>>({})
  const [goalDates, setGoalDates] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const goalsStepRef = useRef<GoalsStepTourHandle>(null)
  const [tourRequested, setTourRequested] = useState(false)
  const [showCatalog, setShowCatalog] = useBackableState(false)

  // Dynamic tour target IDs — computed from current selections
  const tourTargets = useMemo(() => {
    const { daygameL3Goals, daygameByCategory } = catalog
    const firstCurveGoal = daygameL3Goals.find(
      (g) => selectedGoals.has(g.id) && g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null
    )
    const firstRampGoal = daygameL3Goals.find(
      (g) => selectedGoals.has(g.id) && g.templateType === "habit_ramp" && rampEnabled.has(g.id) && g.defaultRampSteps != null && g.defaultRampSteps.length > 1
    )
    // Find the section ID for the category containing the first curve (or ramp) goal
    const anchorGoal = firstCurveGoal ?? firstRampGoal
    let sectionId: string | null = null
    if (anchorGoal) {
      const cat = daygameByCategory.find((c) => c.goals.some((g) => g.id === anchorGoal.id))
      if (cat) sectionId = `dg_${cat.category}`
    }
    return {
      firstCurveGoalId: firstCurveGoal?.id ?? null,
      firstRampGoalId: firstRampGoal?.id ?? null,
      firstCurveSectionId: sectionId,
    }
  }, [catalog, selectedGoals, rampEnabled])

  // Only auto-select the core funnel goals — the rest stay in the catalog for manual opt-in
  const AUTO_SELECTED_GOAL_IDS = new Set([
    "l3_approach_frequency",
    "l3_session_frequency",
    "l3_approach_volume",
    "l3_phone_numbers",
    "l3_instadates",
  ])

  // Preselected habit_ramp goals auto-get ramp enabled
  const AUTO_RAMP_GOAL_IDS = new Set(
    [...AUTO_SELECTED_GOAL_IDS].filter((id) => GOAL_TEMPLATE_MAP[id]?.templateType === "habit_ramp")
  )

  const handleSelectPath = useCallback(
    (p: DaygamePath) => {
      // Toggle: clicking the already-selected path deselects it
      setPath((prev) => {
        if (prev === p) return null
        return p
      })
      // Only auto-select goals when selecting (not deselecting)
      if (path !== p) {
        setSelectedGoals((prev) => {
          const next = new Set<string>()
          for (const id of prev) {
            if (!id.startsWith("l3_") && !id.startsWith("l2_")) next.add(id)
          }
          for (const id of AUTO_SELECTED_GOAL_IDS) {
            next.add(id)
          }
          return next
        })
        setRampEnabled((prev) => {
          const next = new Set(prev)
          for (const id of AUTO_RAMP_GOAL_IDS) next.add(id)
          return next
        })
      }
    },
    []
  )

  const toggleL1 = useCallback((id: string) => {
    setSelectedL1s((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const addCustomL1 = useCallback((p: DaygamePath) => {
    const id = nextCustomId("cl1")
    setCustomL1s((prev) => [...prev, { id, text: "", path: p }])
    setSelectedL1s((prev) => new Set([...prev, id]))
  }, [])

  const updateCustomL1Text = useCallback((id: string, text: string) => {
    setCustomL1s((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))
  }, [])

  const removeCustomL1 = useCallback((id: string) => {
    setCustomL1s((prev) => prev.filter((l) => l.id !== id))
    setSelectedL1s((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleSkipToGoals = useCallback(() => {
    setShowCatalog(true)
  }, [])

  const handleToggleArea = useCallback(
    (areaId: string) => {
      const wasSelected = selectedAreas.has(areaId)
      setSelectedAreas((prev) => {
        const next = new Set(prev)
        next.has(areaId) ? next.delete(areaId) : next.add(areaId)
        return next
      })
      setSelectedGoals((prev) => {
        const next = new Set(prev)
        if (wasSelected) {
          for (const id of prev) {
            if (id.startsWith(`${areaId}_s`)) next.delete(id)
          }
        } else {
          const area = catalog.lifeAreas.find((a) => a.id === areaId)
          if (area?.suggestions) {
            area.suggestions.forEach((_, i) => next.add(`${areaId}_s${i}`))
          }
        }
        return next
      })
    },
    [catalog.lifeAreas, selectedAreas]
  )

  const toggleGoal = useCallback((id: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const updateTarget = useCallback((id: string, value: number) => {
    setTargets((prev) => ({ ...prev, [id]: value }))
  }, [])

  const updateCurveConfig = useCallback((id: string, config: MilestoneLadderConfig) => {
    setCurveConfigs((prev) => ({ ...prev, [id]: config }))
    setTargets((prev) => ({ ...prev, [id]: config.target }))
  }, [])

  const updateRampConfig = useCallback((id: string, steps: HabitRampStep[]) => {
    setRampConfigs((prev) => ({ ...prev, [id]: steps }))
    if (steps.length > 0) {
      setTargets((prev) => ({ ...prev, [id]: steps[0].frequencyPerWeek }))
    }
  }, [])

  const toggleRamp = useCallback((id: string) => {
    setRampEnabled((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const addCustomGoal = useCallback((categoryId: string) => {
    const id = nextCustomId("cg")
    const goal: SetupCustomGoal = { id, title: "", categoryId, target: 1, period: "total" }
    setCustomGoals((prev) => [...prev, goal])
    setSelectedGoals((prev) => new Set([...prev, id]))
  }, [])

  const removeCustomGoal = useCallback((goalId: string) => {
    setCustomGoals((prev) => prev.filter((g) => g.id !== goalId))
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      next.delete(goalId)
      return next
    })
  }, [])

  const updateCustomGoalTitle = useCallback((goalId: string, title: string) => {
    setCustomGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, title } : g)))
  }, [])

  const addCustomCategory = useCallback(() => {
    const id = nextCustomId("cc")
    setCustomCategories((prev) => [...prev, { id, name: "" }])
  }, [])

  const renameCustomCategory = useCallback((catId: string, name: string) => {
    setCustomCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name } : c)))
  }, [])

  const updateTargetDate = useCallback((areaId: string, date: string) => {
    setTargetDates((prev) => ({ ...prev, [areaId]: date }))
  }, [])

  const updateGoalDate = useCallback((goalId: string, date: string) => {
    setGoalDates((prev) => ({ ...prev, [goalId]: date }))
  }, [])

  const removeCustomCategory = useCallback((catId: string) => {
    setCustomGoals((prev) => {
      const removed = prev.filter((g) => g.categoryId === catId)
      setSelectedGoals((sel) => {
        const next = new Set(sel)
        for (const g of removed) next.delete(g.id)
        return next
      })
      return prev.filter((g) => g.categoryId !== catId)
    })
    setCustomCategories((prev) => prev.filter((c) => c.id !== catId))
  }, [])

  // --- Create goals handler ---
  const handleCreateGoals = useCallback(async () => {
    if (!path) return
    setIsCreating(true)
    setError(null)
    try {
      // Strip out past dates so they never reach the DB
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const minDate = tomorrow.toISOString().slice(0, 10)
      const filterDates = (dates: Record<string, string>) =>
        Object.fromEntries(Object.entries(dates).filter(([, d]) => d >= minDate))

      const inserts = buildSetupInserts({
        path,
        selectedAreas,
        selectedGoalIds: selectedGoals,
        targets,
        curveConfigs,
        rampConfigs,
        rampEnabled,
        customGoals,
        customCategories,
        targetDates: filterDates(targetDates),
        goalDates: filterDates(goalDates),
      })
      if (inserts.length === 0) {
        setError("No goals selected — go back and pick at least one")
        return
      }

      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: inserts }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || "Failed to create goals")
      }
      const separator = returnPath.includes("?") ? "&" : "?"
      router.push(`${returnPath}${separator}fromSetup=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goals")
    } finally {
      setIsCreating(false)
    }
  }, [path, selectedAreas, selectedGoals, targets, curveConfigs, rampConfigs, rampEnabled, customGoals, customCategories, targetDates, goalDates, router, returnPath])

  // --- CTA navigation ---
  const goNext = useCallback(() => {
    if (step === "summary") {
      handleCreateGoals()
      return
    }
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
  }, [stepIndex, step, handleCreateGoals])

  const goToStep = useCallback(
    (i: number) => {
      if (i < stepIndex && i >= 0) setStep(STEPS[i])
    },
    [stepIndex]
  )

  const ctaConfig = useMemo(() => {
    switch (step) {
      case "direction":
        return { label: "Choose Goals \u2192", disabled: !path }
      case "goals":
        return { label: "View Summary \u2192", disabled: selectedGoals.size === 0 }
      case "summary":
        return { label: isCreating ? "Creating..." : "Create Goals", disabled: isCreating }
    }
  }, [step, path, selectedGoals.size, isCreating])

  // Life area IDs for keyboard shortcuts (3-6)
  const otherAreaIds = useMemo(
    () => catalog.lifeAreas.filter((a) => a.id !== "daygame" && a.id !== "custom").map((a) => a.id),
    [catalog.lifeAreas]
  )

  // L1 IDs for contextual number-key shortcuts
  const currentL1Ids = useMemo(
    () => (path ? getDaygamePathL1(path).map((l) => l.id) : []),
    [path]
  )

  // --- Keyboard: Enter → advance, digits → contextual selection ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip inside inputs/textareas/selects for all shortcuts
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Enter") {
          ;(e.target as HTMLElement).blur()
          e.preventDefault()
        }
        return
      }

      // --- Enter → advance ---
      if (e.key === "Enter") {
        if ((e.target as HTMLElement)?.closest("button")) return
        if (!ctaConfig.disabled) {
          e.preventDefault()
          goNext()
        }
        return
      }

      if (step === "direction") {
        // --- Digit keys → contextual: if a path is expanded, toggle L1 reasons; otherwise select top-level cards ---
        const digit = parseInt(e.key, 10)
        if (isNaN(digit) || digit < 1 || digit > 9) return
        e.preventDefault()

        // Focus a button by ID after React re-renders
        const focusAfter = (id: string) => {
          requestAnimationFrame(() => {
            document.getElementById(id)?.focus()
          })
        }

        if (path && currentL1Ids.length > 0) {
          // Path is expanded → digits toggle L1 reasons (1-indexed)
          const l1Index = digit - 1
          if (l1Index < currentL1Ids.length) {
            toggleL1(currentL1Ids[l1Index])
            focusAfter(`btn-l1-${currentL1Ids[l1Index]}`)
          }
        } else {
          // Nothing expanded → digits select top-level cards
          // 1 = FTO, 2 = Abundance
          if (digit === 1) { handleSelectPath("fto"); focusAfter("btn-path-fto") }
          if (digit === 2) { handleSelectPath("abundance"); focusAfter("btn-path-abundance") }
          // 3-6 = life area cards
          if (digit >= 3 && digit <= 6) {
            const areaId = otherAreaIds[digit - 3]
            if (areaId) { handleToggleArea(areaId); focusAfter(`btn-area-${areaId}`) }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [step, ctaConfig.disabled, goNext, handleSelectPath, toggleL1, currentL1Ids, handleToggleArea, otherAreaIds, path])

  if (showCatalog) {
    return (
      <div className="relative">
        <AuroraBackground stepIndex={0} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-20 sm:pb-28">
          <GoalCatalogPicker
            onTreeCreated={() => {
              const separator = returnPath.includes("?") ? "&" : "?"
              router.push(`${returnPath}${separator}fromSetup=true`)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <AuroraBackground stepIndex={stepIndex} />

      <AnimatedStep stepKey={step}>
        {step === "direction" && (
          <DirectionStep
            lifeAreas={catalog.lifeAreas}
            selectedPath={path}
            selectedAreas={selectedAreas}
            selectedL1s={selectedL1s}
            customL1s={customL1s}
            selectedGoals={selectedGoals}
            targetDates={targetDates}
            onSelectPath={handleSelectPath}
            onToggleL1={toggleL1}
            onAddCustomL1={addCustomL1}
            onUpdateCustomL1={updateCustomL1Text}
            onRemoveCustomL1={removeCustomL1}
            onToggleArea={handleToggleArea}
            onToggleGoal={toggleGoal}
            onUpdateTargetDate={updateTargetDate}
            onAdvance={goNext}
            onSkipToGoals={handleSkipToGoals}
          />
        )}
        {step === "goals" && (
            <GoalsStep
              ref={goalsStepRef}
              daygameByCategory={catalog.daygameByCategory}
              daygameL3Goals={catalog.daygameL3Goals}
              lifeAreas={catalog.lifeAreas}
              selectedAreas={selectedAreas}
              selectedGoals={selectedGoals}
              targets={targets}
              curveConfigs={curveConfigs}
              rampConfigs={rampConfigs}
              rampEnabled={rampEnabled}
              customGoals={customGoals}
              customCategories={customCategories}
              path={path}
              targetDates={targetDates}
              goalDates={goalDates}
              onToggle={toggleGoal}
              onUpdateTarget={updateTarget}
              onUpdateCurve={updateCurveConfig}
              onUpdateRamp={updateRampConfig}
              onToggleRamp={toggleRamp}
              onAddCustomGoal={addCustomGoal}
              onRemoveCustomGoal={removeCustomGoal}
              onUpdateCustomGoalTitle={updateCustomGoalTitle}
              onAddCustomCategory={addCustomCategory}
              onRenameCustomCategory={renameCustomCategory}
              onRemoveCustomCategory={removeCustomCategory}
              onUpdateGoalDate={updateGoalDate}
              onTourStart={() => setTourRequested(true)}
            />
        )}
        {step === "summary" && (
          <SummaryStep
            daygameL3Goals={catalog.daygameL3Goals}
            lifeAreas={catalog.lifeAreas}
            selectedAreas={selectedAreas}
            selectedGoals={selectedGoals}
            targets={targets}
            rampConfigs={rampConfigs}
            rampEnabled={rampEnabled}
            path={path}
            customGoals={customGoals}
            customCategories={customCategories}
          />
        )}
      </AnimatedStep>

      {step === "goals" && (
        <GoalsStepTour
          tourRef={goalsStepRef}
          triggerStart={tourRequested}
          onTourEnd={() => setTourRequested(false)}
          selectedGoals={selectedGoals}
          firstCurveGoalId={tourTargets.firstCurveGoalId}
          firstRampGoalId={tourTargets.firstRampGoalId}
          firstCurveSectionId={tourTargets.firstCurveSectionId}
        />
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-500/90 px-4 py-2 text-white text-sm shadow-lg">
          {error}
        </div>
      )}

      <BottomBar
        currentStep={stepIndex}
        steps={STEP_LABELS}
        ctaLabel={ctaConfig.label}
        ctaDisabled={ctaConfig.disabled}
        onCta={goNext}
        onStepClick={goToStep}
        onBack={() => goToStep(stepIndex - 1)}
      />
    </div>
  )
}
