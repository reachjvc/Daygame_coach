"use client"

import { useState } from "react"
import { CATEGORIES } from "../../config"
import { InnerGameStep } from "../../types"
import { CategoryCard } from "./CategoryCard"
import { NavigationButtons } from "../shared/NavigationButtons"
import { StepProgress } from "../shared/StepProgress"

type ValuesStepPageProps = {
  currentSubstep: number
  selectedValues: Set<string>
  onToggleValue: (id: string) => void
  onNext: () => void | Promise<void>
  onBack: () => void | Promise<void>
  onSaveValues: () => Promise<void>
  completedSteps: InnerGameStep[]
}

export function ValuesStepPage({
  currentSubstep,
  selectedValues,
  onToggleValue,
  onNext,
  onBack,
  onSaveValues,
  completedSteps,
}: ValuesStepPageProps) {
  const [isSaving, setIsSaving] = useState(false)
  const category = CATEGORIES[currentSubstep]
  const isLastCategory = currentSubstep === CATEGORIES.length - 1

  const handleNext = async () => {
    setIsSaving(true)
    try {
      await onSaveValues()
    } catch (err) {
      console.error("Failed to save values:", err)
    }
    try {
      await onNext()
    } catch (err) {
      console.error("Failed to advance step:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    onBack()
  }

  if (!category) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Category not found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <StepProgress
        currentStep={InnerGameStep.VALUES}
        completedSteps={completedSteps}
      />

      {/* Compact category indicator */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-sm font-medium text-foreground truncate">
            {currentSubstep + 1}/{CATEGORIES.length}
          </span>
        </div>
        {/* Mini progress dots */}
        <div className="flex gap-1">
          {CATEGORIES.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx < currentSubstep
                  ? "bg-primary"
                  : idx === currentSubstep
                  ? "bg-primary/60 ring-2 ring-primary/30"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Category card */}
      <CategoryCard
        category={category}
        selectedValues={selectedValues}
        onToggleValue={onToggleValue}
      />

      {/* Navigation */}
      <NavigationButtons
        onBack={currentSubstep > 0 ? handleBack : undefined}
        onNext={handleNext}
        backLabel="Previous"
        nextLabel={isLastCategory ? "Complete Values" : "Next"}
        isLoading={isSaving}
      />
    </div>
  )
}
