"use client"

import { useState, useCallback } from "react"
import { SeasonStepBar } from "./variant-i/SeasonStepBar"
import { SeasonLanding } from "./variant-i/SeasonLanding"
import { SeasonGoalPicker } from "./variant-i/SeasonGoalPicker"
import { SeasonCustomize } from "./variant-i/SeasonCustomize"
import type { GoalCustomization } from "./variant-i/SeasonCustomize"
import { SeasonPlanner } from "./variant-i/SeasonPlanner"
import { SeasonComplete } from "./variant-i/SeasonComplete"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"

type SeasonId = "spring" | "summer" | "fall" | "winter"

type FlowPhase =
  | { step: "landing" }
  | { step: "goals"; path: "one_person" | "abundance" }
  | {
      step: "customize"
      path: "one_person" | "abundance"
      selectedL1: GoalTemplate
      selectedL2s: GoalTemplate[]
      selectedL3s: GoalTemplate[]
    }
  | {
      step: "seasons"
      path: "one_person" | "abundance"
      selectedL1: GoalTemplate
      selectedL3s: GoalTemplate[]
      goals: GoalCustomization[]
      targetDate: Date | null
    }
  | {
      step: "complete"
      visionTitle: string
      goals: GoalCustomization[]
      seasonAssignments: Record<SeasonId, string[]>
      seasonCurveConfigs: Record<SeasonId, MilestoneLadderConfig>
    }
  | { step: "life_area"; areaId: string }

const STEPS = [
  { label: "Life Area", key: "landing" },
  { label: "Goal Path", key: "goals" },
  { label: "Customize", key: "customize" },
  { label: "Seasons", key: "seasons" },
  { label: "Done", key: "complete" },
]

function getStepIndex(step: string): number {
  const idx = STEPS.findIndex((s) => s.key === step)
  return idx >= 0 ? idx : 0
}

export default function VariantI() {
  const [phase, setPhase] = useState<FlowPhase>({ step: "landing" })

  const handleSelectPath = useCallback(
    (path: "one_person" | "abundance") => {
      setPhase({ step: "goals", path })
    },
    []
  )

  const handleSelectLifeArea = useCallback((areaId: string) => {
    setPhase({ step: "life_area", areaId })
  }, [])

  const handleGoalsConfirm = useCallback(
    (
      selectedL1: GoalTemplate,
      selectedL2s: GoalTemplate[],
      selectedL3s: GoalTemplate[]
    ) => {
      if (phase.step !== "goals") return
      setPhase({
        step: "customize",
        path: phase.path,
        selectedL1,
        selectedL2s,
        selectedL3s,
      })
    },
    [phase]
  )

  const handleCustomizeConfirm = useCallback(
    (goals: GoalCustomization[], targetDate: Date | null) => {
      if (phase.step !== "customize") return
      setPhase({
        step: "seasons",
        path: phase.path,
        selectedL1: phase.selectedL1,
        selectedL3s: phase.selectedL3s,
        goals,
        targetDate,
      })
    },
    [phase]
  )

  const handleSeasonsComplete = useCallback(
    (seasonAssignments: Record<SeasonId, string[]>) => {
      if (phase.step !== "seasons") return
      setPhase({
        step: "complete",
        visionTitle: phase.selectedL1.title,
        goals: phase.goals,
        seasonAssignments,
        seasonCurveConfigs: {
          spring: {
            start: 0,
            target: 100,
            steps: 5,
            curveTension: 1.2,
          },
          summer: {
            start: 0,
            target: 200,
            steps: 5,
            curveTension: 0,
          },
          fall: {
            start: 0,
            target: 300,
            steps: 5,
            curveTension: -0.5,
          },
          winter: {
            start: 0,
            target: 50,
            steps: 4,
            curveTension: 0,
          },
        },
      })
    },
    [phase]
  )

  const handleStartOver = useCallback(() => {
    setPhase({ step: "landing" })
  }, [])

  const pathColor = (() => {
    if (
      phase.step === "goals" ||
      phase.step === "customize" ||
      phase.step === "seasons"
    ) {
      return phase.path === "one_person" ? "#ec4899" : "#f97316"
    }
    return "#f97316"
  })()

  const currentStepIndex = getStepIndex(phase.step)

  return (
    <div className="min-h-screen bg-background" data-testid="variant-i">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Step indicator -- always visible */}
        <div className="mb-8">
          <SeasonStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Phase content */}
        {phase.step === "landing" && (
          <SeasonLanding
            onSelectPath={handleSelectPath}
            onSelectLifeArea={handleSelectLifeArea}
          />
        )}

        {phase.step === "goals" && (
          <SeasonGoalPicker
            path={phase.path}
            onBack={() => setPhase({ step: "landing" })}
            onConfirm={handleGoalsConfirm}
          />
        )}

        {phase.step === "customize" && (
          <SeasonCustomize
            selectedL1={phase.selectedL1}
            selectedL2s={phase.selectedL2s}
            selectedL3s={phase.selectedL3s}
            pathColor={pathColor}
            onBack={() =>
              setPhase({ step: "goals", path: phase.path })
            }
            onConfirm={handleCustomizeConfirm}
          />
        )}

        {phase.step === "seasons" && (
          <SeasonPlanner
            selectedL1={phase.selectedL1}
            selectedL3s={phase.selectedL3s}
            goals={phase.goals}
            pathColor={pathColor}
            onBack={() => {
              setPhase({
                step: "goals",
                path: phase.path,
              })
            }}
            onComplete={handleSeasonsComplete}
          />
        )}

        {phase.step === "complete" && (
          <SeasonComplete
            visionTitle={phase.visionTitle}
            goals={phase.goals}
            seasonAssignments={phase.seasonAssignments}
            seasonCurveConfigs={phase.seasonCurveConfigs}
            onStartOver={handleStartOver}
          />
        )}

        {phase.step === "life_area" && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">
              Life area goal creation for &quot;{phase.areaId}&quot;
              would go here.
            </p>
            <p className="text-sm text-muted-foreground/60">
              Only daygame has a full template graph. Other areas would
              use a simplified creation form.
            </p>
            <button
              onClick={() => setPhase({ step: "landing" })}
              className="text-sm text-primary cursor-pointer hover:underline"
            >
              Back to start
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
