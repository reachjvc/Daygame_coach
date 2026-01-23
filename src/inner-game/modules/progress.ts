/**
 * Progress Module
 * Handles business logic for tracking user progress through the inner game journey.
 */

import {
  getOrCreateProgress,
  updateProgress as updateProgressRepo,
  resetProgress as resetProgressRepo,
  type InnerGameProgressRow,
} from "@/src/db/innerGameProgressRepo"
import { deleteAllComparisons } from "@/src/db/valueComparisonRepo"
import { CATEGORIES } from "../config"
import { InnerGameStep, type InnerGameProgress } from "../types"

/**
 * Convert database row to service type.
 */
function rowToProgress(row: InnerGameProgressRow): InnerGameProgress {
  return {
    currentStep: row.current_step as InnerGameStep,
    currentSubstep: row.current_substep,
    welcomeDismissed: row.welcome_dismissed,
    step1Completed: row.step1_completed,
    step2Completed: row.step2_completed,
    step3Completed: row.step3_completed,
    cuttingCompleted: row.cutting_completed,
    hurdlesResponse: row.hurdles_response,
    hurdlesInferredValues: row.hurdles_inferred_values,
    deathbedResponse: row.deathbed_response,
    deathbedInferredValues: row.deathbed_inferred_values,
    finalCoreValues: row.final_core_values,
    aspirationalValues: row.aspirational_values,
  }
}

/**
 * Get user's current progress, creating a new record if none exists.
 */
export async function getUserProgress(userId: string): Promise<InnerGameProgress> {
  const row = await getOrCreateProgress(userId)
  return rowToProgress(row)
}

/**
 * Update specific progress fields.
 */
export async function updateUserProgress(
  userId: string,
  updates: Partial<InnerGameProgress>
): Promise<InnerGameProgress> {
  // Convert service type to database type
  const dbUpdates: Record<string, unknown> = {}

  if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep
  if (updates.currentSubstep !== undefined) dbUpdates.current_substep = updates.currentSubstep
  if (updates.welcomeDismissed !== undefined) dbUpdates.welcome_dismissed = updates.welcomeDismissed
  if (updates.step1Completed !== undefined) dbUpdates.step1_completed = updates.step1Completed
  if (updates.step2Completed !== undefined) dbUpdates.step2_completed = updates.step2Completed
  if (updates.step3Completed !== undefined) dbUpdates.step3_completed = updates.step3Completed
  if (updates.cuttingCompleted !== undefined) dbUpdates.cutting_completed = updates.cuttingCompleted
  if (updates.hurdlesResponse !== undefined) dbUpdates.hurdles_response = updates.hurdlesResponse
  if (updates.hurdlesInferredValues !== undefined) dbUpdates.hurdles_inferred_values = updates.hurdlesInferredValues
  if (updates.deathbedResponse !== undefined) dbUpdates.deathbed_response = updates.deathbedResponse
  if (updates.deathbedInferredValues !== undefined) dbUpdates.deathbed_inferred_values = updates.deathbedInferredValues
  if (updates.finalCoreValues !== undefined) dbUpdates.final_core_values = updates.finalCoreValues
  if (updates.aspirationalValues !== undefined) dbUpdates.aspirational_values = updates.aspirationalValues

  const row = await updateProgressRepo(userId, dbUpdates)
  return rowToProgress(row)
}

/**
 * Reset user's progress to initial state.
 */
export async function resetUserProgress(userId: string): Promise<InnerGameProgress> {
  // Delete all comparisons first
  await deleteAllComparisons(userId)
  const row = await resetProgressRepo(userId)
  return rowToProgress(row)
}

/**
 * Advance to the next category in values step.
 * Returns true if there are more categories, false if all categories are done.
 */
export async function advanceToNextCategory(userId: string): Promise<{
  hasMore: boolean
  nextSubstep: number
}> {
  const progress = await getUserProgress(userId)
  const nextSubstep = progress.currentSubstep + 1

  if (nextSubstep >= CATEGORIES.length) {
    // All categories done, mark step 1 as complete
    await updateUserProgress(userId, {
      step1Completed: true,
      currentStep: InnerGameStep.HURDLES,
      currentSubstep: 0,
    })
    return { hasMore: false, nextSubstep: 0 }
  }

  await updateUserProgress(userId, { currentSubstep: nextSubstep })
  return { hasMore: true, nextSubstep }
}

/**
 * Go back to previous category in values step.
 * Returns true if successfully went back, false if already at first category.
 */
export async function goToPreviousCategory(userId: string): Promise<{
  success: boolean
  prevSubstep: number
}> {
  const progress = await getUserProgress(userId)
  const prevSubstep = progress.currentSubstep - 1

  if (prevSubstep < 0) {
    return { success: false, prevSubstep: 0 }
  }

  await updateUserProgress(userId, { currentSubstep: prevSubstep })
  return { success: true, prevSubstep }
}

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
