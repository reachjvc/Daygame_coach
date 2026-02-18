"use client"

import { useState, useCallback } from "react"
import { OceanCanvas } from "./variant-c/OceanCanvas"
import { BioStepBar } from "./variant-c/BioStepBar"
import { DeepSeaLanding } from "./variant-c/DeepSeaLanding"
import { OrganismPicker } from "./variant-c/OrganismPicker"
import { OrganismCustomizer } from "./variant-c/OrganismCustomizer"
import type { GoalCustomization } from "./variant-c/OrganismCustomizer"
import { ColonyChart } from "./variant-c/ColonyChart"
import { ColonyComplete } from "./variant-c/ColonyComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "landing" | "pick" | "customize" | "chart" | "complete"

const STEPS = [
  { label: "Ecosystem", key: "landing" },
  { label: "Organisms", key: "pick" },
  { label: "Cultivate", key: "customize" },
  { label: "Colony", key: "chart" },
  { label: "Complete", key: "complete" },
]

interface FlowState {
  step: FlowStep
  path: "one_person" | "abundance" | null
  selectedL1: GoalTemplate | null
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
}

export default function VariantC() {
  const [flow, setFlow] = useState<FlowState>({
    step: "landing",
    path: null,
    selectedL1: null,
    selectedL2s: [],
    selectedL3s: [],
    goals: [],
    curveConfigs: new Map(),
  })

  const currentStepIndex = STEPS.findIndex((s) => s.key === flow.step)
  const pathColor = flow.path === "one_person" ? "#00ffff" : "#ff00ff"

  const handleSelectPath = useCallback((path: "one_person" | "abundance") => {
    setFlow((prev) => ({ ...prev, step: "pick", path }))
  }, [])

  const handlePickConfirm = useCallback((
    selectedL1: GoalTemplate,
    selectedL2s: GoalTemplate[],
    selectedL3s: GoalTemplate[],
  ) => {
    setFlow((prev) => ({
      ...prev,
      step: "customize",
      selectedL1,
      selectedL2s,
      selectedL3s,
    }))
  }, [])

  const handleCustomizeConfirm = useCallback((goals: GoalCustomization[]) => {
    setFlow((prev) => ({ ...prev, step: "chart", goals }))
  }, [])

  const handleChartConfirm = useCallback((curveConfigs: Map<string, MilestoneLadderConfig>) => {
    setFlow((prev) => ({ ...prev, step: "complete", curveConfigs }))
  }, [])

  const handleStartOver = useCallback(() => {
    setFlow({
      step: "landing",
      path: null,
      selectedL1: null,
      selectedL2s: [],
      selectedL3s: [],
      goals: [],
      curveConfigs: new Map(),
    })
  }, [])

  return (
    <OceanCanvas>
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <BioStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <DeepSeaLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <OrganismPicker
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <OrganismCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <ColonyChart
              path={flow.path}
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              goals={flow.goals}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "customize" }))}
              onConfirm={handleChartConfirm}
            />
          )}

          {flow.step === "complete" && flow.selectedL1 && flow.path && (
            <ColonyComplete
              path={flow.path}
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              goals={flow.goals}
              curveConfigs={flow.curveConfigs}
              pathColor={pathColor}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>
    </OceanCanvas>
  )
}
