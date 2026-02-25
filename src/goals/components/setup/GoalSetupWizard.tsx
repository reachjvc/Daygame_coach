"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSetupCatalog } from "@/src/goals/hooks/useSetupCatalog"
import { buildSetupInserts } from "@/src/goals/goalsService"
import { STEPS, STEP_LABELS, nextCustomId, type FlowStep } from "./setupConstants"
import { AuroraBackground } from "./AuroraBackground"
import { AnimatedStep } from "./AnimatedStep"
import { BottomBar } from "./BottomBar"
import { DirectionStep } from "./DirectionStep"
import { GoalsStep } from "./GoalsStep"
import { SummaryStep } from "./SummaryStep"
import { AuroraOrreryStep } from "./AuroraOrreryStep"
import { OnboardingChoice } from "./OnboardingChoice"
import { getDaygamePathL1 } from "@/src/goals/data/goalGraph"
import type { DaygamePath, HabitRampStep, MilestoneLadderConfig, SetupCustomGoal, SetupCustomCategory } from "@/src/goals/types"

export function GoalSetupWizard({ returnPath = "/dashboard/goals" }: { returnPath?: string } = {}) {
  const router = useRouter()
  const catalog = useSetupCatalog()

  const [step, setStep] = useState<FlowStep>("onboarding")
  const [onboardingTrack, setOnboardingTrack] = useState<"simple" | "full" | null>(null)
  const [path, setPath] = useState<DaygamePath | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [selectedL1s, setSelectedL1s] = useState<Set<string>>(new Set())
  const [customL1s, setCustomL1s] = useState<{ id: string; text: string; path: DaygamePath }[]>([])
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [curveConfigs, setCurveConfigs] = useState<Record<string, MilestoneLadderConfig>>({})
  const [rampConfigs, setRampConfigs] = useState<Record<string, HabitRampStep[]>>({})
  const [customGoals, setCustomGoals] = useState<SetupCustomGoal[]>([])
  const [customCategories, setCustomCategories] = useState<SetupCustomCategory[]>([])
  const [targetDates, setTargetDates] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)

  // Only auto-select the core funnel goals — the rest stay in the catalog for manual opt-in
  const AUTO_SELECTED_GOAL_IDS = new Set([
    "l3_approach_frequency",
    "l3_session_frequency",
    "l3_approach_volume",
    "l3_phone_numbers",
    "l3_instadates",
  ])

  const handleSelectPath = useCallback(
    (p: DaygamePath) => {
      setPath(p)
      // Don't change L1 selections — let individual L1 clicks handle that
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

  const handleOnboardingChoice = useCallback((track: "simple" | "full") => {
    setOnboardingTrack(track)
    setStep("direction")
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

  // --- Goal counts ---
  const selectedDaygameCount =
    catalog.daygameL3Goals.filter((g) => selectedGoals.has(g.id)).length
  const otherGoalCount = catalog.lifeAreas
    .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
    .reduce((sum, area) => {
      return (
        sum +
        (area.suggestions ?? []).filter((_, i) => selectedGoals.has(`${area.id}_s${i}`)).length
      )
    }, 0)
  const customGoalCount = customGoals.filter((g) => g.title.trim()).length
  const totalGoals = selectedDaygameCount + otherGoalCount + customGoalCount

  // --- Create goals handler ---
  const handleCreateGoals = useCallback(async () => {
    if (!path) return
    setIsCreating(true)
    setError(null)
    try {
      const inserts = buildSetupInserts({
        path,
        selectedAreas,
        selectedGoalIds: selectedGoals,
        targets,
        curveConfigs,
        rampConfigs,
        customGoals,
        customCategories,
        targetDates,
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
  }, [path, selectedAreas, selectedGoals, targets, curveConfigs, rampConfigs, customGoals, customCategories, targetDates, router, returnPath])

  // --- CTA navigation ---
  const goNext = useCallback(() => {
    if (step === "orrery") {
      handleCreateGoals()
      return
    }
    // Simple track: skip summary
    if (onboardingTrack === "simple" && step === "goals") {
      setStep("orrery")
      return
    }
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex])
  }, [stepIndex, step, handleCreateGoals, onboardingTrack])

  const goToStep = useCallback(
    (i: number) => {
      if (i < stepIndex && i >= 0) setStep(STEPS[i])
    },
    [stepIndex]
  )

  const ctaConfig = useMemo(() => {
    switch (step) {
      case "onboarding":
        return {
          label: "",
          disabled: true,
          status: "Choose how to begin",
        }
      case "direction":
        return {
          label: "Choose Goals \u2192",
          disabled: !path,
          status: path
            ? `${path === "fto" ? "Find The One" : "Abundance"} selected`
            : "Select a path to continue",
        }
      case "goals":
        return {
          label: onboardingTrack === "simple" ? "View Your System \u2192" : "View Summary \u2192",
          disabled: selectedGoals.size === 0,
          status: `${selectedGoals.size} goals selected`,
        }
      case "summary":
        return {
          label: "View Your System \u2192",
          disabled: false,
          status: `${totalGoals} goals ready`,
        }
      case "orrery":
        return {
          label: isCreating ? "Creating..." : "Create Goals",
          disabled: isCreating,
          status: `${totalGoals} goals \u00B7 ${1 + selectedAreas.size} areas`,
        }
    }
  }, [step, path, selectedGoals.size, totalGoals, selectedAreas.size, isCreating, onboardingTrack])

  return (
    <div className="relative">
      <AuroraBackground stepIndex={stepIndex} />

      <AnimatedStep stepKey={step}>
        {step === "onboarding" && (
          <OnboardingChoice onChoose={handleOnboardingChoice} />
        )}
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
          />
        )}
        {step === "goals" && (
          <GoalsStep
            daygameByCategory={catalog.daygameByCategory}
            daygameL3Goals={catalog.daygameL3Goals}
            lifeAreas={catalog.lifeAreas}
            selectedAreas={selectedAreas}
            selectedGoals={selectedGoals}
            targets={targets}
            curveConfigs={curveConfigs}
            rampConfigs={rampConfigs}
            customGoals={customGoals}
            customCategories={customCategories}
            onToggle={toggleGoal}
            onUpdateTarget={updateTarget}
            onUpdateCurve={updateCurveConfig}
            onUpdateRamp={updateRampConfig}
            onAddCustomGoal={addCustomGoal}
            onRemoveCustomGoal={removeCustomGoal}
            onUpdateCustomGoalTitle={updateCustomGoalTitle}
            onAddCustomCategory={addCustomCategory}
            onRenameCustomCategory={renameCustomCategory}
            onRemoveCustomCategory={removeCustomCategory}
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
            path={path}
            customGoals={customGoals}
            customCategories={customCategories}
          />
        )}
        {step === "orrery" && (
          <AuroraOrreryStep
            lifeAreas={catalog.lifeAreas}
            selectedAreas={selectedAreas}
            selectedGoals={selectedGoals}
            totalGoals={totalGoals}
            path={path}
            onCreateGoals={handleCreateGoals}
            isCreating={isCreating}
          />
        )}
      </AnimatedStep>

      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-500/90 px-4 py-2 text-white text-sm shadow-lg">
          {error}
        </div>
      )}

      {step !== "onboarding" && (
        <BottomBar
          currentStep={stepIndex}
          steps={STEP_LABELS}
          statusText={ctaConfig.status}
          ctaLabel={ctaConfig.label}
          ctaDisabled={ctaConfig.disabled}
          onCta={goNext}
          onStepClick={goToStep}
        />
      )}
    </div>
  )
}
