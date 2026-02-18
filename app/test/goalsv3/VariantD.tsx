"use client"

import { useState, useCallback } from "react"
import { CircuitBackground } from "./variant-d/CircuitBackground"
import { CircuitStepBar } from "./variant-d/CircuitStepBar"
import { CircuitLanding } from "./variant-d/CircuitLanding"
import { NodeSelector } from "./variant-d/NodeSelector"
import { NodeCustomizer } from "./variant-d/NodeCustomizer"
import type { GoalCustomization } from "./variant-d/NodeCustomizer"
import { NetworkChart } from "./variant-d/NetworkChart"
import { CircuitComplete } from "./variant-d/CircuitComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "landing" | "pick" | "customize" | "chart" | "complete"

const STEPS = [
  { label: "System", key: "landing" },
  { label: "Nodes", key: "pick" },
  { label: "Config", key: "customize" },
  { label: "Network", key: "chart" },
  { label: "Deploy", key: "complete" },
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

export default function VariantD() {
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
      className="relative min-h-[600px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #050505 30%, #0d0d0d 60%, #080808 100%)",
        color: "white",
        borderRadius: 6,
      }}
      data-testid="variant-d"
    >
      {/* PCB grid background */}
      <CircuitBackground />

      <div className="relative mx-auto max-w-4xl px-6 py-8" style={{ zIndex: 1 }}>
        {/* Step indicator */}
        <div className="mb-8">
          <CircuitStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <CircuitLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <NodeSelector
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <NodeCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <NetworkChart
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
            <CircuitComplete
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
