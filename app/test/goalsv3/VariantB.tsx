"use client"

import { useState, useCallback } from "react"
import { NebulaStepBar } from "./variant-b/NebulaStepBar"
import { NebulaLanding } from "./variant-b/NebulaLanding"
import { NebulaGoalPicker } from "./variant-b/NebulaGoalPicker"
import { NebulaCustomizer } from "./variant-b/NebulaCustomizer"
import type { GoalCustomization } from "./variant-b/NebulaCustomizer"
import { NebulaChart } from "./variant-b/NebulaChart"
import { NebulaComplete } from "./variant-b/NebulaComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type FlowStep = "landing" | "pick" | "customize" | "chart" | "complete"

const STEPS = [
  { label: "Nebula", key: "landing" },
  { label: "Stars", key: "pick" },
  { label: "Calibrate", key: "customize" },
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

export default function VariantB() {
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

  const handlePickConfirm = useCallback(
    (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => {
      setFlow((prev) => ({
        ...prev,
        step: "customize",
        selectedL1,
        selectedL2s,
        selectedL3s,
      }))
    },
    []
  )

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
      className="min-h-[600px] rounded-2xl relative overflow-hidden"
      style={{
        background: "#000005",
        color: "white",
      }}
      data-testid="variant-b"
    >
      {/* Subtle ambient nebula glow at the edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 10% 20%, rgba(99,102,241,0.03) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 90% 80%, rgba(168,85,247,0.02) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.02) 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <NebulaStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && <NebulaLanding onSelectPath={handleSelectPath} />}

          {flow.step === "pick" && flow.path && (
            <NebulaGoalPicker
              path={flow.path}
              onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <NebulaCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" && flow.selectedL1 && flow.path && (
            <NebulaChart
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
            <NebulaComplete
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
