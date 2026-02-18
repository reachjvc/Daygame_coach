"use client"

import { useState, useCallback } from "react"
import { OrreryStepBar } from "./variant-a/OrreryStepBar"
import { PlanetaryLanding } from "./variant-a/PlanetaryLanding"
import { StarPicker } from "./variant-a/StarPicker"
import { StarCustomizer } from "./variant-a/StarCustomizer"
import type { GoalCustomization } from "./variant-a/StarCustomizer"
import { OrreryChart } from "./variant-a/OrreryChart"
import { OrreryComplete } from "./variant-a/OrreryComplete"
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

export default function VariantA() {
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
        background: "linear-gradient(180deg, #050510 0%, #0a0a1a 30%, #080816 60%, #050510 100%)",
        color: "white",
      }}
      data-testid="variant-a-orrery"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator — brass-themed, always visible */}
        <div className="mb-8">
          <OrreryStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <PlanetaryLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <StarPicker
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <StarCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <OrreryChart
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
            <OrreryComplete
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
