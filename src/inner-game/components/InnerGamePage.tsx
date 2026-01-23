"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import {
  InnerGameStep,
  type InnerGameProgress,
  type InferredValue,
  type CoreValue,
} from "../types"
import { CATEGORIES } from "../config"
import { getCompletedSteps, getResumeStep } from "../modules/progressUtils"
import { WelcomeCard } from "./WelcomeCard"
import { ValuesStepPage } from "./ValuesStep"
import { HurdlesStep } from "./HurdlesStep"
import { DeathbedStep } from "./DeathbedStep"
import { CuttingStepPage } from "./CuttingStep"
import { SummaryPage } from "./SummaryPage"

export function InnerGamePage() {
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Progress state
  const [progress, setProgress] = useState<InnerGameProgress | null>(null)
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const [showWelcome, setShowWelcome] = useState(true)

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/inner-game/progress")
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to load progress")
        }

        const data = await res.json()
        setProgress(data.progress)
        setSelectedValues(new Set(data.selectedValues))

        // Always show welcome card on session start
        setShowWelcome(true)
      } catch (err) {
        console.error("Failed to load progress:", err)
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update progress on server
  const updateProgress = useCallback(async (updates: Partial<InnerGameProgress>) => {
    try {
      const res = await fetch("/api/inner-game/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        throw new Error("Failed to update progress")
      }

      const data = await res.json()
      setProgress(data.progress)
      return data.progress
    } catch (err) {
      console.error("Failed to update progress:", err)
      throw err
    }
  }, [])

  // Save selected values
  const saveValues = useCallback(async () => {
    try {
      const res = await fetch("/api/inner-game/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valueIds: Array.from(selectedValues) }),
      })

      if (!res.ok) {
        throw new Error("Failed to save values")
      }
    } catch (err) {
      console.error("Failed to save values:", err)
      throw err
    }
  }, [selectedValues])

  // Handle welcome dismiss
  const handleWelcomeDismiss = async () => {
    setShowWelcome(false)
    if (!progress) return

    // Treat "welcome dismissed" as true when computing the next step;
    // otherwise first-time users would "resume" to WELCOME again.
    const resumeStep = getResumeStep({ ...progress, welcomeDismissed: true })

    // Optimistically advance client state so the next step renders immediately.
    setProgress(prev =>
      prev
        ? { ...prev, welcomeDismissed: true, currentStep: resumeStep }
        : prev
    )

    // Keep server in sync (and also correct stale currentStep for returning users).
    if (!progress.welcomeDismissed || progress.currentStep !== resumeStep) {
      await updateProgress({
        welcomeDismissed: true,
        currentStep: resumeStep,
      })
    }
  }

  // Handle value toggle
  const handleToggleValue = (id: string) => {
    setSelectedValues(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle values step navigation
  const handleValuesNext = async () => {
    if (!progress) return

    const nextSubstep = progress.currentSubstep + 1
    if (nextSubstep >= CATEGORIES.length) {
      // Completed all categories
      await updateProgress({
        step1Completed: true,
        currentStep: InnerGameStep.HURDLES,
        currentSubstep: 0,
      })
    } else {
      await updateProgress({ currentSubstep: nextSubstep })
    }
  }

  const handleValuesBack = async () => {
    if (!progress || progress.currentSubstep <= 0) return
    await updateProgress({ currentSubstep: progress.currentSubstep - 1 })
  }

  // Handle hurdles completion
  const handleHurdlesComplete = async (response: string, inferredValues: InferredValue[]) => {
    await updateProgress({
      hurdlesResponse: response,
      hurdlesInferredValues: inferredValues,
      step2Completed: true,
      currentStep: InnerGameStep.DEATHBED,
    })
  }

  // Handle deathbed completion
  const handleDeathbedComplete = async (response: string, inferredValues: InferredValue[]) => {
    await updateProgress({
      deathbedResponse: response,
      deathbedInferredValues: inferredValues,
      step3Completed: true,
      currentStep: InnerGameStep.CUTTING,
    })
  }

  // Handle cutting completion
  const handleCuttingComplete = async (
    coreValues: CoreValue[],
    aspirationalValues: { id: string }[]
  ) => {
    await updateProgress({
      finalCoreValues: coreValues,
      aspirationalValues: aspirationalValues,
      cuttingCompleted: true,
      currentStep: InnerGameStep.COMPLETE,
    })
  }

  // Handle restart
  const handleRestart = async () => {
    try {
      // Reset progress
      await fetch("/api/inner-game/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: InnerGameStep.WELCOME,
          currentSubstep: 0,
          welcomeDismissed: false,
          step1Completed: false,
          step2Completed: false,
          step3Completed: false,
          cuttingCompleted: false,
          hurdlesResponse: null,
          hurdlesInferredValues: null,
          deathbedResponse: null,
          deathbedInferredValues: null,
          finalCoreValues: null,
          aspirationalValues: null,
        }),
      })

      // Clear comparisons
      await fetch("/api/inner-game/comparisons", { method: "DELETE" })

      // Clear selected values
      setSelectedValues(new Set())

      // Reload progress
      const res = await fetch("/api/inner-game/progress")
      const data = await res.json()
      setProgress(data.progress)
      setShowWelcome(true)
    } catch (err) {
      console.error("Failed to restart:", err)
    }
  }

  // Handle back navigation for question steps
  const handleBackToValues = async () => {
    await updateProgress({
      currentStep: InnerGameStep.VALUES,
      currentSubstep: CATEGORIES.length - 1,
    })
  }

  const handleBackToHurdles = async () => {
    await updateProgress({ currentStep: InnerGameStep.HURDLES })
  }

  const handleBackToDeathbed = async () => {
    await updateProgress({ currentStep: InnerGameStep.DEATHBED })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  // Error state
  if (error || !progress) {
    return (
      <div className="min-h-screen bg-background py-12">
        <header className="fixed top-0 left-0 w-full bg-background/80 backdrop-blur z-10 border-b">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 pt-20">
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            Inner Game
          </h1>
          <p className="text-destructive">{error || "Failed to load"}</p>
        </div>
      </div>
    )
  }

  const completedSteps = getCompletedSteps(progress)
  const completedCategories = progress.step1Completed
    ? CATEGORIES.length
    : progress.currentSubstep

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-background/80 backdrop-blur z-10 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      {/* Welcome modal */}
      {showWelcome && (
        <WelcomeCard
          progress={progress}
          onDismiss={handleWelcomeDismiss}
          completedCategories={completedCategories}
        />
      )}

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        {progress.currentStep === InnerGameStep.VALUES && (
          <ValuesStepPage
            currentSubstep={progress.currentSubstep}
            selectedValues={selectedValues}
            onToggleValue={handleToggleValue}
            onNext={handleValuesNext}
            onBack={handleValuesBack}
            onSaveValues={saveValues}
            completedSteps={completedSteps}
          />
        )}

        {progress.currentStep === InnerGameStep.HURDLES && (
          <HurdlesStep
            initialResponse={progress.hurdlesResponse}
            initialInferredValues={progress.hurdlesInferredValues}
            completedSteps={completedSteps}
            onBack={handleBackToValues}
            onComplete={handleHurdlesComplete}
          />
        )}

        {progress.currentStep === InnerGameStep.DEATHBED && (
          <DeathbedStep
            initialResponse={progress.deathbedResponse}
            initialInferredValues={progress.deathbedInferredValues}
            completedSteps={completedSteps}
            onBack={handleBackToHurdles}
            onComplete={handleDeathbedComplete}
          />
        )}

        {progress.currentStep === InnerGameStep.CUTTING && (
          <CuttingStepPage
            selectedValues={Array.from(selectedValues)}
            hurdlesInferredValues={progress.hurdlesInferredValues}
            deathbedInferredValues={progress.deathbedInferredValues}
            completedSteps={completedSteps}
            onBack={handleBackToDeathbed}
            onComplete={handleCuttingComplete}
          />
        )}

        {progress.currentStep === InnerGameStep.COMPLETE && progress.finalCoreValues && (
          <SummaryPage
            coreValues={progress.finalCoreValues}
            aspirationalValues={progress.aspirationalValues ?? []}
            completedSteps={completedSteps}
            onRestart={handleRestart}
          />
        )}

        {/* Fallback for welcome step without modal */}
        {progress.currentStep === InnerGameStep.WELCOME && !showWelcome && (
          <div className="text-center py-12">
            <Button onClick={() => setShowWelcome(true)}>
              Start Inner Game Journey
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
