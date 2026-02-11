"use client"

import { useState, useMemo } from "react"
import { GripVertical, LayoutGrid } from "lucide-react"

import { InnerGameStep, type CoreValue, type InferredValue } from "../../types"
import { CUTTING_CONFIG } from "../../config"
import { buildValuesWithSource, getAspirationalDefault } from "../../modules/valueCutting"
import { NavigationButtons } from "../shared/NavigationButtons"
import { StepProgress } from "../shared/StepProgress"
import { SelectEssentialsPhase } from "./SelectEssentialsPhase"
import { EliminatePhase } from "./EliminatePhase"
import { AspirationalCheck } from "./AspirationalCheck"
import type { PrioritizationPhase } from "./types"

type CuttingStepPageProps = {
  selectedValues: string[]
  hurdlesInferredValues: InferredValue[] | null
  shadowInferredValues: InferredValue[] | null
  peakExperienceInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (coreValues: CoreValue[], aspirationalValues: { id: string }[]) => void
  onBackToHub?: () => void
  onStartFresh?: () => void
  onStepClick?: (step: InnerGameStep) => void
}

export function CuttingStepPage({
  selectedValues,
  hurdlesInferredValues,
  shadowInferredValues,
  peakExperienceInferredValues,
  completedSteps,
  onBack,
  onComplete,
  onBackToHub,
  onStartFresh,
  onStepClick,
}: CuttingStepPageProps) {
  // Build the merged list of all values with their sources
  const allValuesWithSource = useMemo(() => {
    return buildValuesWithSource(
      selectedValues,
      shadowInferredValues,
      peakExperienceInferredValues,
      hurdlesInferredValues
    )
  }, [selectedValues, shadowInferredValues, peakExperienceInferredValues, hurdlesInferredValues])

  // Debug: log total values to help diagnose the bug
  console.log("[CuttingStepPage] Total values:", allValuesWithSource.length)
  console.log("[CuttingStepPage] Selected values from props:", selectedValues.length)
  console.log("[CuttingStepPage] Shadow inferred:", shadowInferredValues?.length ?? 0)
  console.log("[CuttingStepPage] Peak inferred:", peakExperienceInferredValues?.length ?? 0)
  console.log("[CuttingStepPage] Hurdles inferred:", hurdlesInferredValues?.length ?? 0)

  // Phase state
  const [phase, setPhase] = useState<PrioritizationPhase>("select_essentials")

  // Phase 1: Select Essentials
  const [selectedEssentials, setSelectedEssentials] = useState<Set<string>>(new Set())

  // Phase 2: Eliminate
  const [eliminatedIds, setEliminatedIds] = useState<string[]>([])

  // Phase 3: Aspirational Check
  const [aspirationalIndex, setAspirationalIndex] = useState(0)
  const [aspirationalIds, setAspirationalIds] = useState<Set<string>>(new Set())

  // Phase 4: Final Ranking
  const [rankedValues, setRankedValues] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Get the current core values (after selection and elimination)
  const coreValueIds = useMemo(() => {
    const essentials = Array.from(selectedEssentials)
    return essentials.filter(id => !eliminatedIds.includes(id))
  }, [selectedEssentials, eliminatedIds])

  // Get the values with source for the current core values
  const coreValuesWithSource = useMemo(() => {
    return allValuesWithSource.filter(v => coreValueIds.includes(v.id))
  }, [allValuesWithSource, coreValueIds])

  // Handle Phase 1: Toggle essential selection
  const handleToggleEssential = (id: string) => {
    setSelectedEssentials(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle Phase 1: Continue from selection
  const handleSelectionContinue = () => {
    const count = selectedEssentials.size
    if (count === 0) return

    if (count > CUTTING_CONFIG.targetCoreValues) {
      // Need to eliminate some
      setPhase("eliminate")
    } else {
      // Go straight to aspirational check
      setRankedValues(Array.from(selectedEssentials))
      setPhase("aspirational")
    }
  }

  // Handle Phase 2: Remove a value
  const handleRemove = (id: string) => {
    setEliminatedIds(prev => [...prev, id])

    // Check if we've reached target
    const remainingCount = selectedEssentials.size - eliminatedIds.length - 1
    if (remainingCount <= CUTTING_CONFIG.targetCoreValues) {
      // Auto-continue when target reached
      const finalIds = Array.from(selectedEssentials).filter(
        vId => !eliminatedIds.includes(vId) && vId !== id
      )
      setRankedValues(finalIds)
      setPhase("aspirational")
    }
  }

  // Handle Phase 2: Undo last removal
  const handleUndoRemove = () => {
    setEliminatedIds(prev => prev.slice(0, -1))
  }

  // Handle Phase 2: Continue from elimination
  const handleEliminateContinue = () => {
    const remainingCount = selectedEssentials.size - eliminatedIds.length
    if (remainingCount > CUTTING_CONFIG.targetCoreValues) return

    const finalIds = Array.from(selectedEssentials).filter(
      id => !eliminatedIds.includes(id)
    )
    setRankedValues(finalIds)
    setPhase("aspirational")
  }

  // Handle Phase 3: Aspirational choice
  const handleAspirationalChoice = (isAspirational: boolean) => {
    const valueId = rankedValues[aspirationalIndex]
    if (isAspirational) {
      setAspirationalIds(prev => new Set([...prev, valueId]))
    }

    const nextIndex = aspirationalIndex + 1
    if (nextIndex >= rankedValues.length) {
      // Done with aspirational, move to ranking
      setPhase("ranking")
    } else {
      setAspirationalIndex(nextIndex)
    }
  }

  // Handle Phase 4: Drag and drop ranking
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newRanked = [...rankedValues]
    const [draggedItem] = newRanked.splice(draggedIndex, 1)
    newRanked.splice(index, 0, draggedItem)
    setRankedValues(newRanked)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Handle final completion
  const handleComplete = () => {
    const coreValues: CoreValue[] = rankedValues.map((id, index) => ({
      id,
      rank: index + 1,
    }))
    const aspirationalArray = Array.from(aspirationalIds).map(id => ({ id }))
    onComplete(coreValues, aspirationalArray)
  }

  const formatValueName = (id: string) => id.replace(/-/g, " ")

  // Get essential values with source for elimination phase
  const essentialValuesWithSource = useMemo(() => {
    return allValuesWithSource.filter(v => selectedEssentials.has(v.id))
  }, [allValuesWithSource, selectedEssentials])

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <StepProgress
        currentStep={InnerGameStep.CUTTING}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />

      {/* Phase 1: Select Essentials */}
      {phase === "select_essentials" && (
        <SelectEssentialsPhase
          values={allValuesWithSource}
          selectedIds={selectedEssentials}
          onToggle={handleToggleEssential}
          onContinue={handleSelectionContinue}
          onBackToHub={onBackToHub}
        />
      )}

      {/* Phase 2: Eliminate to 7 */}
      {phase === "eliminate" && (
        <EliminatePhase
          values={essentialValuesWithSource}
          onRemove={handleRemove}
          onUndo={handleUndoRemove}
          onContinue={handleEliminateContinue}
          removedIds={eliminatedIds}
          targetCount={CUTTING_CONFIG.targetCoreValues}
          onBackToHub={onBackToHub}
        />
      )}

      {/* Phase 3: Aspirational Check */}
      {phase === "aspirational" && aspirationalIndex < rankedValues.length && (
        <>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Current vs. Aspirational
            </h2>
            <p className="text-muted-foreground">
              For each value, tell us if you already embody it or if you're developing it.
            </p>
          </div>

          {(() => {
            const currentValue = coreValuesWithSource.find(
              v => v.id === rankedValues[aspirationalIndex]
            )
            if (!currentValue) return null

            const smartDefault = getAspirationalDefault(currentValue.source)

            return (
              <AspirationalCheck
                value={{
                  id: currentValue.id,
                  displayName: currentValue.displayName,
                }}
                source={currentValue.source}
                defaultValue={smartDefault}
                onChoose={handleAspirationalChoice}
                questionNumber={aspirationalIndex + 1}
                totalQuestions={rankedValues.length}
              />
            )
          })()}

          {/* Back to Overview link */}
          {onBackToHub && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={onBackToHub}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Back to Overview
              </button>
            </div>
          )}
        </>
      )}

      {/* Phase 4: Final Ranking */}
      {phase === "ranking" && (
        <>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Your Core Values
            </h2>
            <p className="text-muted-foreground">
              Drag to reorder these by importance. Your top value should be #1.
            </p>
          </div>

          <div className="space-y-2">
            {rankedValues.map((valueId, index) => (
              <div
                key={valueId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border
                  bg-card cursor-move transition-all
                  ${draggedIndex === index ? "border-primary bg-primary/10" : "border-border"}
                `}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </span>
                <span className="text-foreground font-medium capitalize flex-1">
                  {formatValueName(valueId)}
                </span>
                {aspirationalIds.has(valueId) && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
                    Aspiring
                  </span>
                )}
              </div>
            ))}
          </div>

          {aspirationalIds.size > 0 && aspirationalIds.size < rankedValues.length && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{aspirationalIds.size}</span> of your core values are aspirational—things you're actively developing. That's great for growth!
              </p>
            </div>
          )}

          <NavigationButtons
            onBack={onBack}
            onNext={handleComplete}
            nextLabel="Confirm My Values"
            onBackToHub={onBackToHub}
          />

          {/* Start fresh link */}
          {onStartFresh && (
            <div className="text-center pt-4 border-t border-border/50 mt-6">
              <button
                type="button"
                onClick={onStartFresh}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Start fresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
