"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ChevronLeft, Loader2, Heart, Target } from "lucide-react"

import {
  InnerGameStep,
  type InnerGameProgress,
  type InferredValue,
  type CoreValue,
} from "../types"
import { GoalsTab } from "./GoalsTab"
import { ValuesHub } from "./ValuesHub"
import { CATEGORIES } from "../config"
import { getCompletedSteps, migrateProgress } from "../modules/progressUtils"
import { WelcomeCard } from "./WelcomeCard"
import { ValuesStepPage } from "./ValuesStep"
import { ShadowStep } from "./ShadowStep"
import { PeakExperienceStep } from "./PeakExperienceStep"
import { HurdlesStep } from "./HurdlesStep"
import { CuttingStepPage } from "./CuttingStep"
import { SummaryPage } from "./SummaryPage"
import type { SectionName } from "../modules/progress"

interface InnerGamePageProps {
  isPreviewMode?: boolean
}

export function InnerGamePage({ isPreviewMode = false }: InnerGamePageProps) {
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Progress state
  const [progress, setProgress] = useState<InnerGameProgress | null>(null)
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())

  // Hub/Step view mode - show hub by default, step when user clicks into a section
  const [viewMode, setViewMode] = useState<"hub" | "step">("hub")
  const [activeSection, setActiveSection] = useState<InnerGameStep | null>(null)

  // Welcome modal - only for first-time users
  const [showWelcome, setShowWelcome] = useState(false)

  // Fetch initial data (skip in preview mode)
  useEffect(() => {
    if (isPreviewMode) {
      // In preview mode, set up mock progress and skip API call
      setProgress({
        currentStep: InnerGameStep.WELCOME,
        currentSubstep: 0,
        welcomeDismissed: false,
        valuesCompleted: false,
        shadowCompleted: false,
        peakExperienceCompleted: false,
        hurdlesCompleted: false,
        cuttingCompleted: false,
        shadowResponse: null,
        shadowInferredValues: null,
        peakExperienceResponse: null,
        peakExperienceInferredValues: null,
        hurdlesResponse: null,
        hurdlesInferredValues: null,
        finalCoreValues: null,
        aspirationalValues: null,
      })
      setShowWelcome(true)
      setLoading(false)
      return
    }

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
        // Migrate legacy progress if needed
        const migratedProgress = migrateProgress(data.progress)
        setProgress(migratedProgress)
        setSelectedValues(new Set(data.selectedValues))

        // Only show welcome card for first-time users (never dismissed)
        const isFirstTime = !migratedProgress.welcomeDismissed
        setShowWelcome(isFirstTime)
      } catch (err) {
        console.error("Failed to load progress:", err)
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isPreviewMode])

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

  // Handle welcome dismiss - just dismiss and show hub
  const handleWelcomeDismiss = async () => {
    setShowWelcome(false)
    if (!progress) return

    // Mark welcome as dismissed but stay on hub
    setProgress(prev => prev ? { ...prev, welcomeDismissed: true } : prev)

    // Sync to server
    if (!progress.welcomeDismissed) {
      await updateProgress({ welcomeDismissed: true })
    }
  }

  // Handle section selection from hub
  const handleSelectSection = (step: InnerGameStep) => {
    setActiveSection(step)
    setViewMode("step")
    // Update currentStep so the right component renders
    if (progress) {
      setProgress(prev => prev ? { ...prev, currentStep: step } : prev)
      updateProgress({ currentStep: step })
    }
  }

  // Handle back to hub from any step
  const handleBackToHub = () => {
    setViewMode("hub")
    setActiveSection(null)
  }

  // Handle reset section - calls API and returns to hub
  const handleResetSection = async (section: SectionName) => {
    try {
      const res = await fetch("/api/inner-game/reset-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      })

      if (!res.ok) {
        throw new Error("Failed to reset section")
      }

      const data = await res.json()
      setProgress(data.progress)

      // If resetting values, clear local selected values
      if (section === "values") {
        setSelectedValues(new Set())
      }

      // Return to hub
      setViewMode("hub")
      setActiveSection(null)
    } catch (err) {
      console.error("Failed to reset section:", err)
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
      // Completed all categories -> go to Shadow step
      await updateProgress({
        valuesCompleted: true,
        currentStep: InnerGameStep.SHADOW,
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

  // Handle shadow completion
  const handleShadowComplete = async (response: string, inferredValues: InferredValue[]) => {
    await updateProgress({
      shadowResponse: response,
      shadowInferredValues: inferredValues,
      shadowCompleted: true,
      currentStep: InnerGameStep.PEAK_EXPERIENCE,
    })
  }

  // Handle peak experience completion
  const handlePeakExperienceComplete = async (response: string, inferredValues: InferredValue[]) => {
    await updateProgress({
      peakExperienceResponse: response,
      peakExperienceInferredValues: inferredValues,
      peakExperienceCompleted: true,
      currentStep: InnerGameStep.HURDLES,
    })
  }

  // Handle hurdles completion
  const handleHurdlesComplete = async (response: string, inferredValues: InferredValue[]) => {
    await updateProgress({
      hurdlesResponse: response,
      hurdlesInferredValues: inferredValues,
      hurdlesCompleted: true,
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
          valuesCompleted: false,
          shadowCompleted: false,
          peakExperienceCompleted: false,
          hurdlesCompleted: false,
          cuttingCompleted: false,
          shadowResponse: null,
          shadowInferredValues: null,
          peakExperienceResponse: null,
          peakExperienceInferredValues: null,
          hurdlesResponse: null,
          hurdlesInferredValues: null,
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
      setProgress(migrateProgress(data.progress))
      setShowWelcome(true)

      // Return to hub
      setViewMode("hub")
      setActiveSection(null)
    } catch (err) {
      console.error("Failed to restart:", err)
    }
  }

  // Handle back navigation
  const handleBackToValues = async () => {
    await updateProgress({
      currentStep: InnerGameStep.VALUES,
      currentSubstep: CATEGORIES.length - 1,
    })
  }

  const handleBackToShadow = async () => {
    await updateProgress({ currentStep: InnerGameStep.SHADOW })
  }

  const handleBackToPeakExperience = async () => {
    await updateProgress({ currentStep: InnerGameStep.PEAK_EXPERIENCE })
  }

  const handleBackToHurdles = async () => {
    await updateProgress({ currentStep: InnerGameStep.HURDLES })
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="inner-game-loading">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  // Error state (not shown in preview mode)
  if (!isPreviewMode && (error || !progress)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Inner Game</h1>
        </div>
        <p className="text-destructive">{error || "Failed to load"}</p>
      </div>
    )
  }

  // Preview mode - show welcome card only
  if (isPreviewMode && progress) {
    return (
      <div className="py-8">
        <WelcomeCard
          progress={progress}
          onDismiss={() => {}} // No-op in preview mode
          completedCategories={0}
          isPreviewMode={true}
        />
      </div>
    )
  }

  if (!progress) {
    return null
  }

  const completedSteps = getCompletedSteps(progress)
  const completedCategories = progress.valuesCompleted
    ? CATEGORIES.length
    : progress.currentSubstep

  return (
    <>
      {/* Welcome modal - only show on Values tab */}
      {showWelcome && (
        <WelcomeCard
          progress={progress}
          onDismiss={handleWelcomeDismiss}
          completedCategories={completedCategories}
          isPreviewMode={isPreviewMode}
        />
      )}

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8" data-testid="inner-game-page">
        {/* Page header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Inner Game</h1>
        </div>

        {/* Tabs: Values and Goals */}
        <Tabs defaultValue="values" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="values" className="gap-2">
              <Heart className="h-4 w-4" />
              Values
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
          </TabsList>

          {/* Values Tab - Hub or Step View */}
          <TabsContent value="values" className="space-y-0">
            {viewMode === "hub" ? (
              <ValuesHub
                progress={progress}
                onSelectSection={handleSelectSection}
              />
            ) : (
              <>
                {progress.currentStep === InnerGameStep.VALUES && (
                  <ValuesStepPage
                    currentSubstep={progress.currentSubstep}
                    selectedValues={selectedValues}
                    onToggleValue={handleToggleValue}
                    onNext={handleValuesNext}
                    onBack={handleValuesBack}
                    onSaveValues={saveValues}
                    completedSteps={completedSteps}
                    onBackToHub={handleBackToHub}
                    onStartFresh={() => handleResetSection("values")}
                  />
                )}

                {progress.currentStep === InnerGameStep.SHADOW && (
                  <ShadowStep
                    initialResponse={progress.shadowResponse}
                    initialInferredValues={progress.shadowInferredValues}
                    completedSteps={completedSteps}
                    onBack={handleBackToValues}
                    onComplete={handleShadowComplete}
                    onBackToHub={handleBackToHub}
                    onStartFresh={() => handleResetSection("shadow")}
                  />
                )}

                {progress.currentStep === InnerGameStep.PEAK_EXPERIENCE && (
                  <PeakExperienceStep
                    initialResponse={progress.peakExperienceResponse}
                    initialInferredValues={progress.peakExperienceInferredValues}
                    completedSteps={completedSteps}
                    onBack={handleBackToShadow}
                    onComplete={handlePeakExperienceComplete}
                    onBackToHub={handleBackToHub}
                    onStartFresh={() => handleResetSection("peak_experience")}
                  />
                )}

                {progress.currentStep === InnerGameStep.HURDLES && (
                  <HurdlesStep
                    initialResponse={progress.hurdlesResponse}
                    initialInferredValues={progress.hurdlesInferredValues}
                    completedSteps={completedSteps}
                    onBack={handleBackToPeakExperience}
                    onComplete={handleHurdlesComplete}
                    onBackToHub={handleBackToHub}
                    onStartFresh={() => handleResetSection("hurdles")}
                  />
                )}

                {progress.currentStep === InnerGameStep.CUTTING && (
                  <CuttingStepPage
                    selectedValues={Array.from(selectedValues)}
                    hurdlesInferredValues={progress.hurdlesInferredValues}
                    shadowInferredValues={progress.shadowInferredValues}
                    peakExperienceInferredValues={progress.peakExperienceInferredValues}
                    completedSteps={completedSteps}
                    onBack={handleBackToHurdles}
                    onComplete={handleCuttingComplete}
                    onBackToHub={handleBackToHub}
                    onStartFresh={() => handleResetSection("cutting")}
                  />
                )}

                {progress.currentStep === InnerGameStep.COMPLETE && progress.finalCoreValues && (
                  <SummaryPage
                    coreValues={progress.finalCoreValues}
                    aspirationalValues={progress.aspirationalValues ?? []}
                    completedSteps={completedSteps}
                    onRestart={handleRestart}
                    onBackToHub={handleBackToHub}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals">
            <GoalsTab isPreviewMode={isPreviewMode} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
