/**
 * Progress Utilities Module
 * Pure functions for working with progress data - can be used in client components.
 * No database imports allowed here.
 */

import { CATEGORIES } from "../config"
import { InnerGameStep, type InnerGameProgress } from "../types"

/**
 * Calculate completion percentage for the entire journey.
 */
export function calculateCompletionPercentage(progress: InnerGameProgress): number {
  let completed = 0
  const total = 5 // welcome, values, hurdles, deathbed, cutting

  if (progress.welcomeDismissed) completed++
  if (progress.step1Completed) completed++
  if (progress.step2Completed) completed++
  if (progress.step3Completed) completed++
  if (progress.cuttingCompleted) completed++

  return Math.round((completed / total) * 100)
}

/**
 * Get the step number user should be on based on their progress.
 * Used when welcome card navigates to "continue where you left off".
 */
export function getResumeStep(progress: InnerGameProgress): InnerGameStep {
  if (progress.cuttingCompleted) return InnerGameStep.COMPLETE
  if (progress.step3Completed) return InnerGameStep.CUTTING
  if (progress.step2Completed) return InnerGameStep.DEATHBED
  if (progress.step1Completed) return InnerGameStep.HURDLES
  if (progress.welcomeDismissed) return InnerGameStep.VALUES
  return InnerGameStep.WELCOME
}

/**
 * Get list of completed step numbers for progress display.
 */
export function getCompletedSteps(progress: InnerGameProgress): InnerGameStep[] {
  const completed: InnerGameStep[] = []

  if (progress.welcomeDismissed) completed.push(InnerGameStep.WELCOME)
  if (progress.step1Completed) completed.push(InnerGameStep.VALUES)
  if (progress.step2Completed) completed.push(InnerGameStep.HURDLES)
  if (progress.step3Completed) completed.push(InnerGameStep.DEATHBED)
  if (progress.cuttingCompleted) completed.push(InnerGameStep.CUTTING)

  return completed
}

/**
 * Check if user can navigate to a specific step.
 * Users can go back to any completed step, or forward to the next incomplete step.
 */
export function canNavigateToStep(progress: InnerGameProgress, targetStep: InnerGameStep): boolean {
  const completedSteps = getCompletedSteps(progress)
  const currentStep = progress.currentStep

  // Can always go to welcome
  if (targetStep === InnerGameStep.WELCOME) return true

  // Can go to completed steps
  if (completedSteps.includes(targetStep)) return true

  // Can go to current step
  if (targetStep === currentStep) return true

  // Can go to next step if previous is completed
  if (targetStep === currentStep + 1) return true

  return false
}
