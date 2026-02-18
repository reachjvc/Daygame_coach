"use client"

import { useState, useCallback } from "react"
import { ForgeStepIndicator } from "./variant-f/ForgeStepIndicator"
import { ForgeLanding } from "./variant-f/ForgeLanding"
import { ForgeGoalSelection } from "./variant-f/ForgeGoalSelection"
import { ForgeCustomize } from "./variant-f/ForgeCustomize"
import type { ForgeGoalCustomization } from "./variant-f/ForgeCustomize"
import { TheForge } from "./variant-f/TheForge"
import { ForgeComplete } from "./variant-f/ForgeComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "area" | "path" | "customize" | "forge" | "complete"

const STEPS = [
  { label: "Life Area", key: "area" },
  { label: "Goal Path", key: "path" },
  { label: "Customize", key: "customize" },
  { label: "Forge", key: "forge" },
  { label: "Done", key: "complete" },
]

export default function VariantF() {
  const [step, setStep] = useState<FlowStep>("area")
  const [selectedPath, setSelectedPath] = useState<"one_person" | "abundance" | null>(null)
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2s, setSelectedL2s] = useState<GoalTemplate[]>([])
  const [selectedL3s, setSelectedL3s] = useState<GoalTemplate[]>([])
  const [customizedGoals, setCustomizedGoals] = useState<ForgeGoalCustomization[]>([])
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, MilestoneLadderConfig>>({})

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  const pathColor = selectedPath === "one_person" ? "#ec4899" : "#f97316"

  // Landing handlers
  const handleSelectPath = useCallback((path: "one_person" | "abundance") => {
    setSelectedPath(path)
    setStep("path")
  }, [])

  const handleSelectLifeArea = useCallback((_areaId: string) => {
    // For non-daygame areas, just show a placeholder
    // In real app this would go to a simplified creator
  }, [])

  // Goal selection handler
  const handleGoalSelectionConfirm = useCallback((
    l1: GoalTemplate,
    l2s: GoalTemplate[],
    l3s: GoalTemplate[],
  ) => {
    setSelectedL1(l1)
    setSelectedL2s(l2s)
    setSelectedL3s(l3s)
    setStep("customize")
  }, [])

  // Customize handler
  const handleCustomizeConfirm = useCallback((goals: ForgeGoalCustomization[]) => {
    setCustomizedGoals(goals)
    setStep("forge")
  }, [])

  // Forge handler
  const handleForgeComplete = useCallback((configs: Record<string, MilestoneLadderConfig>) => {
    setCategoryConfigs(configs)
    setStep("complete")
  }, [])

  // Start over
  const handleStartOver = useCallback(() => {
    setStep("area")
    setSelectedPath(null)
    setSelectedL1(null)
    setSelectedL2s([])
    setSelectedL3s([])
    setCustomizedGoals([])
    setCategoryConfigs({})
  }, [])

  return (
    <div className="max-w-4xl mx-auto" data-testid="variant-f-root">
      {/* Step indicator — always visible */}
      <div className="mb-8">
        <ForgeStepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === "area" && (
          <ForgeLanding
            onSelectPath={handleSelectPath}
            onSelectLifeArea={handleSelectLifeArea}
          />
        )}

        {step === "path" && selectedPath && (
          <ForgeGoalSelection
            path={selectedPath}
            onBack={() => setStep("area")}
            onConfirm={handleGoalSelectionConfirm}
          />
        )}

        {step === "customize" && selectedL1 && (
          <ForgeCustomize
            selectedL1={selectedL1}
            selectedL2s={selectedL2s}
            selectedL3s={selectedL3s}
            pathColor={pathColor}
            onBack={() => setStep("path")}
            onConfirm={handleCustomizeConfirm}
          />
        )}

        {step === "forge" && customizedGoals.length > 0 && (
          <TheForge
            goals={customizedGoals}
            selectedL3s={selectedL3s}
            onBack={() => setStep("customize")}
            onComplete={handleForgeComplete}
          />
        )}

        {step === "complete" && (
          <ForgeComplete
            goals={customizedGoals}
            categoryConfigs={categoryConfigs}
            selectedL1Title={selectedL1?.title || ""}
            pathColor={pathColor}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  )
}
