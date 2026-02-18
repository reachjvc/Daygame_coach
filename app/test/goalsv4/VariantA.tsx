"use client"

import { useState, useCallback } from "react"
import { AstrolabeStepGauge } from "./variant-a/AstrolabeStepGauge"
import { OrreryLanding } from "./variant-a/OrreryLanding"
import { GoalPicker } from "./variant-a/GoalPicker"
import { GoalCustomizer } from "./variant-a/GoalCustomizer"
import type { GoalCustomization } from "./variant-a/GoalCustomizer"
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

const STEP_KEYS: FlowStep[] = ["landing", "pick", "customize", "chart", "complete"]

interface FlowState {
  step: FlowStep
  path: "one_person" | "abundance" | null
  selectedL1: GoalTemplate | null
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  goals: GoalCustomization[]
  curveConfigs: Map<string, MilestoneLadderConfig>
}

const INITIAL_STATE: FlowState = {
  step: "landing",
  path: null,
  selectedL1: null,
  selectedL2s: [],
  selectedL3s: [],
  goals: [],
  curveConfigs: new Map(),
}

export default function VariantA() {
  const [flow, setFlow] = useState<FlowState>(INITIAL_STATE)

  const currentStepIndex = STEPS.findIndex((s) => s.key === flow.step)
  const pathColor = flow.path === "one_person" ? "#ec4899" : "#f97316"

  const handleSelectPath = useCallback(
    (path: "one_person" | "abundance") => {
      setFlow((prev) => ({ ...prev, step: "pick", path }))
    },
    []
  )

  const handlePickConfirm = useCallback(
    (
      selectedL1: GoalTemplate,
      selectedL2s: GoalTemplate[],
      selectedL3s: GoalTemplate[]
    ) => {
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

  const handleCustomizeConfirm = useCallback(
    (goals: GoalCustomization[]) => {
      setFlow((prev) => ({ ...prev, step: "chart", goals }))
    },
    []
  )

  const handleChartConfirm = useCallback(
    (curveConfigs: Map<string, MilestoneLadderConfig>) => {
      setFlow((prev) => ({ ...prev, step: "complete", curveConfigs }))
    },
    []
  )

  const handleStartOver = useCallback(() => {
    setFlow(INITIAL_STATE)
  }, [])

  const handleStepClick = useCallback(
    (index: number) => {
      const targetStep = STEP_KEYS[index]
      if (!targetStep) return
      // Only allow going back to previous steps
      if (index < currentStepIndex) {
        setFlow((prev) => ({ ...prev, step: targetStep }))
      }
    },
    [currentStepIndex]
  )

  return (
    <div
      className="min-h-[600px] rounded-2xl"
      style={{
        background:
          "linear-gradient(180deg, #050510 0%, #0a0a1a 30%, #080816 60%, #050510 100%)",
        color: "white",
      }}
      data-testid="variant-a-orrery-v4"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator -- brass-themed astrolabe gauge */}
        <div className="mb-8">
          <AstrolabeStepGauge
            steps={STEPS}
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <OrreryLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "pick" && flow.path && (
            <GoalPicker
              path={flow.path}
              onBack={() =>
                setFlow((prev) => ({
                  ...prev,
                  step: "landing",
                  path: null,
                }))
              }
              onConfirm={handlePickConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <GoalCustomizer
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={() =>
                setFlow((prev) => ({ ...prev, step: "pick" }))
              }
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "chart" &&
            flow.selectedL1 &&
            flow.path && (
              <OrreryChart
                path={flow.path}
                selectedL1={flow.selectedL1}
                selectedL2s={flow.selectedL2s}
                selectedL3s={flow.selectedL3s}
                goals={flow.goals}
                pathColor={pathColor}
                onBack={() =>
                  setFlow((prev) => ({
                    ...prev,
                    step: "customize",
                  }))
                }
                onConfirm={handleChartConfirm}
              />
            )}

          {flow.step === "complete" &&
            flow.selectedL1 &&
            flow.path && (
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
