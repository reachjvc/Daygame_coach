"use client"

import { useState, useCallback } from "react"
import { AuroraStepBar } from "./variant-e/AuroraStepBar"
import { AuroraLanding } from "./variant-e/AuroraLanding"
import { AuroraGoalPicker } from "./variant-e/AuroraGoalPicker"
import { AuroraCustomizer } from "./variant-e/AuroraCustomizer"
import type { GoalCustomization } from "./variant-e/AuroraCustomizer"
import { AuroraChart } from "./variant-e/AuroraChart"
import { AuroraComplete } from "./variant-e/AuroraComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "landing" | "pick" | "customize" | "chart" | "complete"

const STEPS = [
  { label: "Aurora", key: "landing" },
  { label: "Bands", key: "pick" },
  { label: "Tune", key: "customize" },
  { label: "Observe", key: "chart" },
  { label: "Illuminate", key: "complete" },
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

export default function VariantE() {
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
        background: "linear-gradient(180deg, #020815 0%, #030a18 30%, #041020 60%, #020815 100%)",
        color: "white",
      }}
      data-testid="variant-e"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <AuroraStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <AuroraLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <AuroraGoalPicker
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && flow.path && (
            <AuroraCustomizer
              path={flow.path}
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <AuroraChart
              path={flow.path}
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              goals={flow.goals}
              onBack={() => setFlow((prev) => ({ ...prev, step: "customize" }))}
              onConfirm={handleChartConfirm}
            />
          )}

          {flow.step === "complete" && flow.selectedL1 && flow.path && (
            <AuroraComplete
              path={flow.path}
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              goals={flow.goals}
              curveConfigs={flow.curveConfigs}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>
    </div>
  )
}
