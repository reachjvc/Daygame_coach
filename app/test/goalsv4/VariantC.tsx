"use client"

import { useState, useCallback } from "react"
import { AuroraStepIndicator } from "./variant-c/AuroraStepIndicator"
import { AuroraLanding } from "./variant-c/AuroraLanding"
import { AuroraGoalPicker } from "./variant-c/AuroraGoalPicker"
import { AuroraCurveCustomizer } from "./variant-c/AuroraCurveCustomizer"
import { AuroraVisualization } from "./variant-c/AuroraVisualization"
import { AuroraCompletion } from "./variant-c/AuroraCompletion"
import type { GoalTemplate, MilestoneLadderConfig, GoalDisplayCategory } from "@/src/goals/types"

/**
 * Flow steps represent atmospheric layers the user ascends through:
 * Horizon -> Thermosphere -> Mesosphere -> Magnetosphere -> Zenith
 */
type FlowStep = "landing" | "pick" | "customize" | "visualize" | "complete"

const STEPS = [
  { label: "Horizon", key: "landing" },
  { label: "Thermosphere", key: "pick" },
  { label: "Mesosphere", key: "customize" },
  { label: "Magnetosphere", key: "visualize" },
  { label: "Zenith", key: "complete" },
]

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
  displayCategory: GoalDisplayCategory | null
  templateType: "milestone_ladder" | "habit_ramp" | null
}

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

export default function VariantC() {
  const [flow, setFlow] = useState<FlowState>(INITIAL_STATE)

  const currentStepIndex = STEPS.findIndex((s) => s.key === flow.step)

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
    setFlow((prev) => ({ ...prev, step: "visualize", goals }))
  }, [])

  const handleVisualizationConfirm = useCallback((curveConfigs: Map<string, MilestoneLadderConfig>) => {
    setFlow((prev) => ({ ...prev, step: "complete", curveConfigs }))
  }, [])

  const handleStartOver = useCallback(() => {
    setFlow(INITIAL_STATE)
  }, [])

  const handleGoToStep = useCallback(
    (stepKey: string) => {
      const targetIndex = STEPS.findIndex((s) => s.key === stepKey)
      if (targetIndex < currentStepIndex) {
        setFlow((prev) => ({ ...prev, step: stepKey as FlowStep }))
      }
    },
    [currentStepIndex]
  )

  return (
    <div
      className="min-h-[600px] rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #020815 0%, #030a18 30%, #041020 60%, #020815 100%)",
        color: "white",
      }}
      data-testid="variant-c"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Atmospheric layer step indicator */}
        <div className="mb-8">
          <AuroraStepIndicator
            steps={STEPS}
            currentStepIndex={currentStepIndex}
            onStepClick={handleGoToStep}
          />
        </div>

        {/* Step content with smooth transition wrapper */}
        <div className="min-h-[400px]">
          {flow.step === "landing" && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <AuroraLanding onSelectPath={handleSelectPath} />
            </div>
          )}

          {flow.step === "pick" && flow.path && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <AuroraGoalPicker
                path={flow.path}
                onBack={() => setFlow((prev) => ({ ...prev, step: "landing", path: null }))}
                onConfirm={handlePickConfirm}
              />
            </div>
          )}

          {flow.step === "customize" && flow.selectedL1 && flow.path && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <AuroraCurveCustomizer
                path={flow.path}
                selectedL1={flow.selectedL1}
                selectedL2s={flow.selectedL2s}
                selectedL3s={flow.selectedL3s}
                onBack={() => setFlow((prev) => ({ ...prev, step: "pick" }))}
                onConfirm={handleCustomizeConfirm}
              />
            </div>
          )}

          {flow.step === "visualize" && flow.selectedL1 && flow.path && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <AuroraVisualization
                path={flow.path}
                selectedL1={flow.selectedL1}
                selectedL2s={flow.selectedL2s}
                selectedL3s={flow.selectedL3s}
                goals={flow.goals}
                onBack={() => setFlow((prev) => ({ ...prev, step: "customize" }))}
                onConfirm={handleVisualizationConfirm}
              />
            </div>
          )}

          {flow.step === "complete" && flow.selectedL1 && flow.path && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <AuroraCompletion
                path={flow.path}
                selectedL1={flow.selectedL1}
                selectedL2s={flow.selectedL2s}
                selectedL3s={flow.selectedL3s}
                goals={flow.goals}
                curveConfigs={flow.curveConfigs}
                onStartOver={handleStartOver}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
