"use client"

import { useState, useCallback } from "react"
import { JourneyLanding } from "./variant-d/JourneyLanding"
import { GoalExpansion } from "./variant-d/GoalExpansion"
import { CommitmentBuilder } from "./variant-d/CommitmentBuilder"
import { JourneySummary } from "./variant-d/JourneySummary"
import type { GoalTemplate } from "@/src/goals/types"

type FlowPhase =
  | { step: "landing" }
  | { step: "expansion"; path: "one_person" | "abundance" }
  | { step: "commitment"; path: "one_person" | "abundance"; selectedL1: GoalTemplate; selectedL2s: GoalTemplate[]; selectedL3s: GoalTemplate[] }
  | { step: "summary"; path: "one_person" | "abundance"; selectedL1: GoalTemplate; goals: GoalCustomization[]; targetDate: Date | null; allL3Templates: GoalTemplate[] }
  | { step: "life_area"; areaId: string }

interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

export default function VariantD() {
  const [phase, setPhase] = useState<FlowPhase>({ step: "landing" })

  const handleSelectPath = useCallback((path: "one_person" | "abundance") => {
    setPhase({ step: "expansion", path })
  }, [])

  const handleSelectLifeArea = useCallback((areaId: string) => {
    setPhase({ step: "life_area", areaId })
  }, [])

  const handleExpansionConfirm = useCallback((
    selectedL1: GoalTemplate,
    selectedL2s: GoalTemplate[],
    selectedL3s: GoalTemplate[],
  ) => {
    if (phase.step !== "expansion") return
    setPhase({
      step: "commitment",
      path: phase.path,
      selectedL1,
      selectedL2s,
      selectedL3s,
    })
  }, [phase])

  const handleCommitmentConfirm = useCallback((goals: GoalCustomization[], targetDate: Date | null) => {
    if (phase.step !== "commitment") return
    setPhase({
      step: "summary",
      path: phase.path,
      selectedL1: phase.selectedL1,
      goals,
      targetDate,
      allL3Templates: phase.selectedL3s,
    })
  }, [phase])

  const pathColor = (() => {
    if (phase.step === "expansion" || phase.step === "commitment" || phase.step === "summary") {
      return phase.path === "one_person" ? "#ec4899" : "#f97316"
    }
    return "#f97316"
  })()

  return (
    <div className="min-h-screen bg-background" data-testid="variant-d">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Progress indicator */}
        {phase.step !== "landing" && phase.step !== "life_area" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 max-w-md mx-auto">
              {["Choose", "Select", "Customize", "Summary"].map((label, i) => {
                const stepIndex = phase.step === "expansion" ? 1 : phase.step === "commitment" ? 2 : phase.step === "summary" ? 3 : 0
                const isActive = i <= stepIndex
                const isCurrent = i === stepIndex
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`size-2 rounded-full transition-colors ${isCurrent ? "scale-125" : ""}`}
                        style={{ backgroundColor: isActive ? pathColor : "var(--border)" }}
                      />
                      <span className={`text-[10px] ${isActive ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                        {label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div
                        className="h-px flex-1 -mt-3"
                        style={{ backgroundColor: i < stepIndex ? pathColor : "var(--border)" }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Phase content */}
        {phase.step === "landing" && (
          <JourneyLanding
            onSelectPath={handleSelectPath}
            onSelectLifeArea={handleSelectLifeArea}
          />
        )}

        {phase.step === "expansion" && (
          <GoalExpansion
            path={phase.path}
            onBack={() => setPhase({ step: "landing" })}
            onConfirm={handleExpansionConfirm}
          />
        )}

        {phase.step === "commitment" && (
          <CommitmentBuilder
            selectedL1={phase.selectedL1}
            selectedL2s={phase.selectedL2s}
            selectedL3s={phase.selectedL3s}
            pathColor={pathColor}
            onBack={() => setPhase({ step: "expansion", path: phase.path })}
            onConfirm={handleCommitmentConfirm}
          />
        )}

        {phase.step === "summary" && (
          <JourneySummary
            selectedL1={phase.selectedL1}
            goals={phase.goals}
            targetDate={phase.targetDate}
            pathColor={pathColor}
            allL3Templates={phase.allL3Templates}
            onBack={() => {
              // Can't easily go back to commitment without the full state, so go to expansion
              setPhase({ step: "expansion", path: phase.path })
            }}
            onStartOver={() => setPhase({ step: "landing" })}
          />
        )}

        {phase.step === "life_area" && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">
              Life area goal creation for "{phase.areaId}" would go here.
            </p>
            <p className="text-sm text-muted-foreground/60">
              Only daygame has a full template graph. Other areas would use a simplified creation form.
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
