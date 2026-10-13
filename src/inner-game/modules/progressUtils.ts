/**
 * Progress Utilities Module
 * Pure functions for working with progress data - can be used in client components.
 * No database imports allowed here.
 */

import {
  InnerGameStep,
  type InnerGameProgress,
  type SectionAccessResult,
  type SectionStatusResult,
} from "../types"

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

// ============================================================================
// Hub Navigation Utilities
// ============================================================================

/**
 * Check if a section is accessible based on sequential dependencies.
 * Values → Shadow → Peak Experience → Hurdles → Cutting → Complete
 */
export function canAccessSection(
  progress: InnerGameProgress,
  step: InnerGameStep
): SectionAccessResult {
  switch (step) {
    case InnerGameStep.WELCOME:
      return { accessible: true }
    case InnerGameStep.VALUES:
      return { accessible: true } // Always accessible
    case InnerGameStep.SHADOW:
      return progress.valuesCompleted
        ? { accessible: true }
        : { accessible: false, reason: "Complete Values first" }
    case InnerGameStep.PEAK_EXPERIENCE:
      return progress.shadowCompleted
        ? { accessible: true }
        : { accessible: false, reason: "Complete Shadow first" }
    case InnerGameStep.HURDLES:
      return progress.peakExperienceCompleted
        ? { accessible: true }
        : { accessible: false, reason: "Complete Peak Experience first" }
    case InnerGameStep.CUTTING:
      return progress.hurdlesCompleted
        ? { accessible: true }
        : { accessible: false, reason: "Complete Growth Edges first" }
    case InnerGameStep.COMPLETE:
      return progress.cuttingCompleted
        ? { accessible: true }
        : { accessible: false, reason: "Complete Prioritize first" }
    default:
      return { accessible: false, reason: "Unknown section" }
  }
}

/**
 * Get display status for a section in the hub view.
 */
export function getSectionStatus(
  progress: InnerGameProgress,
  step: InnerGameStep
): SectionStatusResult {
  const access = canAccessSection(progress, step)
  if (!access.accessible) {
    return { status: "locked", detail: access.reason }
  }

  switch (step) {
    case InnerGameStep.VALUES:
      if (progress.valuesCompleted) return { status: "completed" }
      // Check if user has started (currentSubstep > 0 means they've progressed)
      if (progress.currentSubstep > 0 || progress.welcomeDismissed) {
        return { status: "in_progress", detail: `${progress.currentSubstep + 1}/11 categories` }
      }
      return { status: "not_started" }

    case InnerGameStep.SHADOW:
      if (progress.shadowCompleted) return { status: "completed" }
      if (progress.shadowResponse) return { status: "in_progress", detail: "Draft saved" }
      return { status: "not_started" }

    case InnerGameStep.PEAK_EXPERIENCE:
      if (progress.peakExperienceCompleted) return { status: "completed" }
      if (progress.peakExperienceResponse) return { status: "in_progress", detail: "Draft saved" }
      return { status: "not_started" }

    case InnerGameStep.HURDLES:
      if (progress.hurdlesCompleted) return { status: "completed" }
      if (progress.hurdlesResponse) return { status: "in_progress", detail: "Draft saved" }
      return { status: "not_started" }

    case InnerGameStep.CUTTING:
      if (progress.cuttingCompleted) return { status: "completed" }
      // Cutting doesn't have partial progress tracking currently
      return { status: "not_started" }

    case InnerGameStep.COMPLETE:
      if (progress.cuttingCompleted) return { status: "completed" }
      return { status: "not_started" }

    default:
      return { status: "not_started" }
  }
}
