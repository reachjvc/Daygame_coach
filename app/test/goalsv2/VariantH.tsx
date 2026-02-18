"use client"

import { useState, useCallback } from "react"
import type { GoalTemplate, CurveThemeId, MilestoneLadderConfig } from "@/src/goals/types"
import { MomentumThemeProvider } from "./variant-h/MomentumThemeProvider"
import { MomentumStepBar } from "./variant-h/MomentumStepBar"
import { MomentumLanding } from "./variant-h/MomentumLanding"
import { MomentumGoalSelection } from "./variant-h/MomentumGoalSelection"
import { MomentumCustomize } from "./variant-h/MomentumCustomize"
import type { GoalCustomization } from "./variant-h/MomentumCustomize"
import { MomentumForge } from "./variant-h/MomentumForge"
import { MomentumComplete } from "./variant-h/MomentumComplete"

type FlowStep = "landing" | "goals" | "customize" | "momentum" | "complete"

const STEPS = [
  { label: "Life Area", key: "landing" },
  { label: "Goal Path", key: "goals" },
  { label: "Customize", key: "customize" },
  { label: "Momentum", key: "momentum" },
  { label: "Complete", key: "complete" },
]

interface FlowState {
  step: FlowStep
  path: "one_person" | "abundance" | null
  selectedL1: GoalTemplate | null
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  customizedGoals: GoalCustomization[]
  curveConfig: MilestoneLadderConfig | null
}

export default function VariantH() {
  const [themeId, setThemeId] = useState<CurveThemeId>("zen")
  const [flow, setFlow] = useState<FlowState>({
    step: "landing",
    path: null,
    selectedL1: null,
    selectedL2s: [],
    selectedL3s: [],
    customizedGoals: [],
    curveConfig: null,
  })

  const toggleTheme = useCallback(() => {
    setThemeId((prev) => (prev === "zen" ? "cyberpunk" : "zen"))
  }, [])

  const currentStepIndex = STEPS.findIndex((s) => s.key === flow.step)

  const pathColor = flow.path === "one_person" ? "#ec4899" : "#f97316"

  // Handlers
  const handleSelectPath = useCallback((path: "one_person" | "abundance") => {
    setFlow((prev) => ({ ...prev, step: "goals", path }))
  }, [])

  const handleGoalConfirm = useCallback(
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
    setFlow((prev) => ({ ...prev, step: "momentum", customizedGoals: goals }))
  }, [])

  const handleMomentumConfirm = useCallback((config: MilestoneLadderConfig) => {
    setFlow((prev) => ({ ...prev, step: "complete", curveConfig: config }))
  }, [])

  const handleStartOver = useCallback(() => {
    setFlow({
      step: "landing",
      path: null,
      selectedL1: null,
      selectedL2s: [],
      selectedL3s: [],
      customizedGoals: [],
      curveConfig: null,
    })
  }, [])

  const handleBackToLanding = useCallback(() => {
    setFlow((prev) => ({ ...prev, step: "landing", path: null }))
  }, [])

  const handleBackToGoals = useCallback(() => {
    if (!flow.path) return
    setFlow((prev) => ({ ...prev, step: "goals" }))
  }, [flow.path])

  const handleBackToCustomize = useCallback(() => {
    setFlow((prev) => ({ ...prev, step: "customize" }))
  }, [])

  return (
    <MomentumThemeProvider themeId={themeId} onToggle={toggleTheme}>
      <div
        style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}
        data-testid="variant-h-root"
      >
        {/* Step bar — always visible */}
        <div style={{ marginBottom: 32 }}>
          <MomentumStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Flow content */}
        <div style={{ minHeight: 400 }}>
          {flow.step === "landing" && (
            <MomentumLanding onSelectPath={handleSelectPath} />
          )}

          {flow.step === "goals" && flow.path && (
            <MomentumGoalSelection
              path={flow.path}
              onBack={handleBackToLanding}
              onConfirm={handleGoalConfirm}
            />
          )}

          {flow.step === "customize" && flow.selectedL1 && (
            <MomentumCustomize
              selectedL1={flow.selectedL1}
              selectedL2s={flow.selectedL2s}
              selectedL3s={flow.selectedL3s}
              pathColor={pathColor}
              onBack={handleBackToGoals}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {flow.step === "momentum" && (
            <MomentumForge
              goals={flow.customizedGoals}
              pathColor={pathColor}
              onBack={handleBackToCustomize}
              onConfirm={handleMomentumConfirm}
            />
          )}

          {flow.step === "complete" && flow.curveConfig && (
            <MomentumComplete
              goals={flow.customizedGoals}
              curveConfig={flow.curveConfig}
              pathColor={pathColor}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>
    </MomentumThemeProvider>
  )
}
