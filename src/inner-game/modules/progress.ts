/**
 * Progress Module
 * Handles business logic for tracking user progress through the inner game journey.
 */

import {
  getOrCreateProgress,
  updateProgress as updateProgressRepo,
  resetProgress as resetProgressRepo,
  resetSection as resetSectionRepo,
  type InnerGameProgressRow,
  type SectionName,
} from "@/src/db/innerGameProgressRepo"
import { deleteAllComparisons } from "@/src/db/valueComparisonRepo"
import { deleteUserValues } from "@/src/db/valuesRepo"
import { CATEGORIES } from "../config"
import { InnerGameStep, type InnerGameProgress } from "../types"

export type { SectionName }

/**
 * Convert database row to service type.
 */
function rowToProgress(row: InnerGameProgressRow): InnerGameProgress {
  return {
    currentStep: row.current_step as InnerGameStep,
    currentSubstep: row.current_substep,
    welcomeDismissed: row.welcome_dismissed,
    valuesCompleted: row.values_completed,
    shadowCompleted: row.shadow_completed,
    peakExperienceCompleted: row.peak_experience_completed,
    hurdlesCompleted: row.hurdles_completed,
    cuttingCompleted: row.cutting_completed,
    shadowResponse: row.shadow_response,
    shadowInferredValues: row.shadow_inferred_values,
    peakExperienceResponse: row.peak_experience_response,
    peakExperienceInferredValues: row.peak_experience_inferred_values,
    hurdlesResponse: row.hurdles_response,
    hurdlesInferredValues: row.hurdles_inferred_values,
    essentialSelection: row.essential_selection,
    finalCoreValues: row.final_core_values,
    aspirationalValues: row.aspirational_values,
    // Legacy fields for backward compatibility
    step1Completed: row.step1_completed,
    step2Completed: row.step2_completed,
    step3Completed: row.step3_completed,
    deathbedResponse: row.deathbed_response,
    deathbedInferredValues: row.deathbed_inferred_values,
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
  if (updates.valuesCompleted !== undefined) dbUpdates.values_completed = updates.valuesCompleted
  if (updates.shadowCompleted !== undefined) dbUpdates.shadow_completed = updates.shadowCompleted
  if (updates.peakExperienceCompleted !== undefined) dbUpdates.peak_experience_completed = updates.peakExperienceCompleted
  if (updates.hurdlesCompleted !== undefined) dbUpdates.hurdles_completed = updates.hurdlesCompleted
  if (updates.cuttingCompleted !== undefined) dbUpdates.cutting_completed = updates.cuttingCompleted
  if (updates.shadowResponse !== undefined) dbUpdates.shadow_response = updates.shadowResponse
  if (updates.shadowInferredValues !== undefined) dbUpdates.shadow_inferred_values = updates.shadowInferredValues
  if (updates.peakExperienceResponse !== undefined) dbUpdates.peak_experience_response = updates.peakExperienceResponse
  if (updates.peakExperienceInferredValues !== undefined) dbUpdates.peak_experience_inferred_values = updates.peakExperienceInferredValues
  if (updates.hurdlesResponse !== undefined) dbUpdates.hurdles_response = updates.hurdlesResponse
  if (updates.hurdlesInferredValues !== undefined) dbUpdates.hurdles_inferred_values = updates.hurdlesInferredValues
  if (updates.essentialSelection !== undefined) dbUpdates.essential_selection = updates.essentialSelection
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
 * Reset a specific section and all dependent sections.
 * Handles clearing related tables (user_values for values, comparisons for all).
 */
export async function resetUserSection(
  userId: string,
  section: SectionName
): Promise<InnerGameProgress> {
  // Clear related tables based on section being reset
  if (section === "values") {
    await deleteUserValues(userId)
  }
  // All sections cascade to cutting, so always clear comparisons
  await deleteAllComparisons(userId)

  const row = await resetSectionRepo(userId, section)
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
    // All categories done, mark values as complete and go to Shadow step
    await updateUserProgress(userId, {
      valuesCompleted: true,
      currentStep: InnerGameStep.SHADOW,
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
