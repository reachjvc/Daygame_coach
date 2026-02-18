"use client"

import { useState, useCallback } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LifeAreaSelector } from "./variant-a/LifeAreaSelector"
import { GoalPathPicker } from "./variant-a/GoalPathPicker"
import { GoalTreeCustomizer } from "./variant-a/GoalTreeCustomizer"
import { GoalSuccessView } from "./variant-a/GoalSuccessView"
import { StepIndicator } from "./variant-a/StepIndicator"
import type { LifeAreaConfig, GoalTemplate } from "@/src/goals/types"
import type { BatchGoalInsert } from "@/src/goals/treeGenerationService"

type FlowStep = "area" | "path" | "customize" | "success"

const STEPS = [
  { label: "Life Area", key: "area" },
  { label: "Goal Path", key: "path" },
  { label: "Customize", key: "customize" },
  { label: "Done", key: "success" },
]

export default function VariantA() {
  const [step, setStep] = useState<FlowStep>("area")
  const [selectedArea, setSelectedArea] = useState<LifeAreaConfig | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null)
  const [createdGoals, setCreatedGoals] = useState<BatchGoalInsert[] | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  const handleSelectArea = useCallback((area: LifeAreaConfig) => {
    setSelectedArea(area)
    setStep("path")
  }, [])

  const handleSelectGoal = useCallback((template: GoalTemplate) => {
    setSelectedTemplate(template)
    setStep("customize")
  }, [])

  const handleConfirmCreate = useCallback(async (inserts: BatchGoalInsert[]) => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: inserts }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create goals")
      }

      setCreatedGoals(inserts)
      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goals")
    } finally {
      setIsCreating(false)
    }
  }, [])

  const handleStartOver = useCallback(() => {
    setStep("area")
    setSelectedArea(null)
    setSelectedTemplate(null)
    setCreatedGoals(null)
    setError(null)
  }, [])

  const handleBackToArea = useCallback(() => {
    setStep("area")
    setSelectedTemplate(null)
  }, [])

  const handleBackToPath = useCallback(() => {
    setStep("path")
    setSelectedTemplate(null)
  }, [])

  return (
    <div className="max-w-4xl mx-auto" data-testid="variant-a-root">
      {/* Back to chooser */}
      <div className="mb-4">
        <a
          href="/test/goals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to variant chooser
        </a>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === "area" && (
          <LifeAreaSelector
            selectedAreaId={selectedArea?.id ?? null}
            onSelect={handleSelectArea}
          />
        )}

        {step === "path" && selectedArea && (
          <GoalPathPicker
            areaId={selectedArea.id}
            onSelectGoal={handleSelectGoal}
            onBack={handleBackToArea}
          />
        )}

        {step === "customize" && selectedTemplate && (
          <GoalTreeCustomizer
            selectedTemplate={selectedTemplate}
            onConfirm={handleConfirmCreate}
            onBack={handleBackToPath}
            isCreating={isCreating}
          />
        )}

        {step === "success" && createdGoals && (
          <GoalSuccessView
            createdGoals={createdGoals}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  )
}
