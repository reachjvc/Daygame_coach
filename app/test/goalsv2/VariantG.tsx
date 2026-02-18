"use client"

import { useState, useCallback } from "react"
import { ConstellationStepBar } from "./variant-g/ConstellationStepBar"
import { StarfieldLanding } from "./variant-g/StarfieldLanding"
import { GoalStarPicker } from "./variant-g/GoalStarPicker"
import { GoalCustomizer } from "./variant-g/GoalCustomizer"
import type { GoalCustomization } from "./variant-g/GoalCustomizer"
import { ConstellationChart } from "./variant-g/ConstellationChart"
import { ConstellationComplete } from "./variant-g/ConstellationComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "landing" | "pick" | "customize" | "chart" | "complete"

const STEPS = [
  { label: "Life Area", key: "landing" },
  { label: "Goal Path", key: "pick" },
  { label: "Customize", key: "customize" },
  { label: "Chart", key: "chart" },
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

export default function VariantG() {
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
  const pathColor = flow.path === "one_person" ? "#ec4899" : "#f97316"

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
    <div
      className="min-h-[600px] rounded-2xl"
      style={{
        background: "linear-gradient(180deg, #030712 0%, #0a0f1a 30%, #0d1025 60%, #030712 100%)",
        color: "white",
      }}
      data-testid="variant-g"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator — always visible */}
        <div className="mb-8">
          <ConstellationStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <StarfieldLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <GoalStarPicker
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <GoalCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <ConstellationChart
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
            <ConstellationComplete
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
    </div>
  )
}
