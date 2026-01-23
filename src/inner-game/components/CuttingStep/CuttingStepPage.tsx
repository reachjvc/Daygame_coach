"use client"

import { useState, useMemo } from "react"
import { InnerGameStep, type CoreValue, type InferredValue } from "../../types"
import { CUTTING_CONFIG } from "../../config"
import { NavigationButtons } from "../shared/NavigationButtons"
import { StepProgress } from "../shared/StepProgress"
import { PairComparison } from "./PairComparison"
import { AspirationalCheck } from "./AspirationalCheck"
import { GripVertical, Check } from "lucide-react"

type CuttingStepPageProps = {
  selectedValues: string[]
  hurdlesInferredValues: InferredValue[] | null
  deathbedInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (coreValues: CoreValue[], aspirationalValues: { id: string }[]) => void
}

type Phase = "aspirational" | "pairwise" | "ranking"

export function CuttingStepPage({
  selectedValues,
  hurdlesInferredValues,
  deathbedInferredValues,
  completedSteps,
  onBack,
  onComplete,
}: CuttingStepPageProps) {
  // Merge all values
  const allValues = useMemo(() => {
    const merged = new Set<string>()
    selectedValues.forEach(v => merged.add(v))
    hurdlesInferredValues?.forEach(v => merged.add(v.id))
    deathbedInferredValues?.forEach(v => merged.add(v.id))
    return Array.from(merged)
  }, [selectedValues, hurdlesInferredValues, deathbedInferredValues])

  // Phase state
  const [phase, setPhase] = useState<Phase>(
    allValues.length > CUTTING_CONFIG.minValuesForCutting ? "aspirational" : "ranking"
  )

  // Aspirational phase state
  const [aspirationalIndex, setAspirationalIndex] = useState(0)
  const [aspirationalIds, setAspirationalIds] = useState<Set<string>>(new Set())

  // Pairwise phase state
  const [pairIndex, setPairIndex] = useState(0)
  const [scores, setScores] = useState<Map<string, number>>(new Map())

  // Ranking phase state
  const [rankedValues, setRankedValues] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Get current values for pairwise (excluding aspirational)
  const currentValues = useMemo(() => {
    return allValues.filter(v => !aspirationalIds.has(v))
  }, [allValues, aspirationalIds])

  // Generate pairs for pairwise comparison
  const pairs = useMemo(() => {
    const result: Array<[string, string]> = []
    const shuffled = [...currentValues].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      result.push([shuffled[i], shuffled[i + 1]])
    }
    return result
  }, [currentValues])

  // Handle aspirational choice
  const handleAspirationalChoice = (isAspirational: boolean) => {
    const valueId = allValues[aspirationalIndex]
    if (isAspirational) {
      setAspirationalIds(prev => new Set([...prev, valueId]))
    }

    const nextIndex = aspirationalIndex + 1
    if (nextIndex >= allValues.length) {
      // Done with aspirational, move to next phase
      const remaining = allValues.filter(v => !aspirationalIds.has(v) && v !== valueId || (!isAspirational && v === valueId))
      if (remaining.length > CUTTING_CONFIG.targetCoreValues) {
        setPhase("pairwise")
      } else {
        setRankedValues(remaining.slice(0, CUTTING_CONFIG.targetCoreValues))
        setPhase("ranking")
      }
    } else {
      setAspirationalIndex(nextIndex)
    }
  }

  // Handle pairwise choice
  const handlePairwiseChoice = async (chosenId: string) => {
    // Update scores
    setScores(prev => {
      const newScores = new Map(prev)
      newScores.set(chosenId, (newScores.get(chosenId) ?? 0) + 1)
      return newScores
    })

    // Save comparison to API
    const pair = pairs[pairIndex]
    try {
      await fetch("/api/inner-game/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valueAId: pair[0],
          valueBId: pair[1],
          chosenValueId: chosenId,
          comparisonType: "pairwise",
          roundNumber: 1,
        }),
      })
    } catch (err) {
      console.error("Failed to save comparison:", err)
    }

    const nextIndex = pairIndex + 1
    if (nextIndex >= pairs.length) {
      // Done with pairwise, calculate top values and move to ranking
      const sortedValues = [...currentValues].sort((a, b) => {
        const scoreA = scores.get(a) ?? 0
        const scoreB = scores.get(b) ?? 0
        return scoreB - scoreA
      })
      setRankedValues(sortedValues.slice(0, CUTTING_CONFIG.targetCoreValues))
      setPhase("ranking")
    } else {
      setPairIndex(nextIndex)
    }
  }

  // Handle drag and drop for ranking
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

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <StepProgress
        currentStep={InnerGameStep.CUTTING}
        completedSteps={completedSteps}
      />

      {phase === "aspirational" && (
        <>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Current vs. Aspirational
            </h2>
            <p className="text-muted-foreground">
              Let's separate the values you currently embody from those you aspire to develop.
            </p>
          </div>

          <AspirationalCheck
            value={{
              id: allValues[aspirationalIndex],
              displayName: formatValueName(allValues[aspirationalIndex]),
            }}
            onChoose={handleAspirationalChoice}
            questionNumber={aspirationalIndex + 1}
            totalQuestions={allValues.length}
          />
        </>
      )}

      {phase === "pairwise" && pairs.length > 0 && pairIndex < pairs.length && (
        <>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Prioritize Your Values
            </h2>
            <p className="text-muted-foreground">
              Now let's find which values matter most to you.
            </p>
          </div>

          <PairComparison
            valueA={{
              id: pairs[pairIndex][0],
              displayName: formatValueName(pairs[pairIndex][0]),
            }}
            valueB={{
              id: pairs[pairIndex][1],
              displayName: formatValueName(pairs[pairIndex][1]),
            }}
            onChoose={handlePairwiseChoice}
            questionNumber={pairIndex + 1}
            totalQuestions={pairs.length}
          />
        </>
      )}

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
                <span className="text-foreground font-medium capitalize">
                  {formatValueName(valueId)}
                </span>
              </div>
            ))}
          </div>

          {aspirationalIds.size > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Aspirational Values
              </h3>
              <p className="text-sm text-muted-foreground">
                These are values you're working towards:
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(aspirationalIds).map(id => (
                  <span
                    key={id}
                    className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm capitalize"
                  >
                    {formatValueName(id)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <NavigationButtons
            onBack={onBack}
            onNext={handleComplete}
            nextLabel="Confirm My Values"
          />
        </>
      )}
    </div>
  )
}
