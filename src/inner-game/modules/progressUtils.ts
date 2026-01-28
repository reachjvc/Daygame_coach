/**
 * Progress Utilities Module
 * Pure functions for working with progress data - can be used in client components.
 * No database imports allowed here.
 */

import { InnerGameStep, type InnerGameProgress } from "../types"

/**
 * Calculate completion percentage for the entire journey.
 * Steps: welcome, values, shadow, peak_experience, hurdles, cutting
 */
export function calculateCompletionPercentage(progress: InnerGameProgress): number {
  let completed = 0
  const total = 6 // welcome, values, shadow, peak_experience, hurdles, cutting

  if (progress.welcomeDismissed) completed++
  if (progress.valuesCompleted) completed++
  if (progress.shadowCompleted) completed++
  if (progress.peakExperienceCompleted) completed++
  if (progress.hurdlesCompleted) completed++
  if (progress.cuttingCompleted) completed++

  return Math.round((completed / total) * 100)
}

/**
 * Get the step number user should be on based on their progress.
 * Used when welcome card navigates to "continue where you left off".
 *
 * Step order: Values → Shadow → Peak Experience → Hurdles → Cutting → Complete
 */
export function getResumeStep(progress: InnerGameProgress): InnerGameStep {
  if (progress.cuttingCompleted) return InnerGameStep.COMPLETE
  if (progress.hurdlesCompleted) return InnerGameStep.CUTTING
  if (progress.peakExperienceCompleted) return InnerGameStep.HURDLES
  if (progress.shadowCompleted) return InnerGameStep.PEAK_EXPERIENCE
  if (progress.valuesCompleted) return InnerGameStep.SHADOW
  if (progress.welcomeDismissed) return InnerGameStep.VALUES
  return InnerGameStep.WELCOME
}

/**
 * Get list of completed step numbers for progress display.
 */
export function getCompletedSteps(progress: InnerGameProgress): InnerGameStep[] {
  const completed: InnerGameStep[] = []

  if (progress.welcomeDismissed) completed.push(InnerGameStep.WELCOME)
  if (progress.valuesCompleted) completed.push(InnerGameStep.VALUES)
  if (progress.shadowCompleted) completed.push(InnerGameStep.SHADOW)
  if (progress.peakExperienceCompleted) completed.push(InnerGameStep.PEAK_EXPERIENCE)
  if (progress.hurdlesCompleted) completed.push(InnerGameStep.HURDLES)
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

/**
 * Migrate legacy progress fields to new structure.
 * Used during transition period to support old progress data.
 */
export function migrateProgress(progress: InnerGameProgress): InnerGameProgress {
  return {
    ...progress,
    // Map legacy step1/2/3 completed to new field names
    valuesCompleted: progress.valuesCompleted ?? progress.step1Completed ?? false,
    shadowCompleted: progress.shadowCompleted ?? false,
    peakExperienceCompleted: progress.peakExperienceCompleted ?? false,
    hurdlesCompleted: progress.hurdlesCompleted ?? progress.step2Completed ?? false,
    // Note: step3Completed was for deathbed, which is now deprecated
  }
}
