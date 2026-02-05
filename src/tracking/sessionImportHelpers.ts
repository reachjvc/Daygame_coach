/**
 * Helper functions for SessionImportSection component.
 * Extracted for testability.
 */

import { MOOD_OPTIONS } from "./config"
import type { SessionSummaryData } from "./types"

/**
 * Get emoji for a mood value.
 * Returns "-" for null (no mood selected), neutral emoji for invalid values.
 */
export function getMoodEmoji(value: number | null): string {
  if (value === null) return "-"
  return MOOD_OPTIONS.find((m) => m.value === value)?.emoji || "😶"
}

/**
 * Determine if session has any context worth displaying.
 * Used to conditionally render the session context section.
 */
export function hasSessionContext(sessionData: SessionSummaryData | null): boolean {
  if (!sessionData) return false

  return (
    sessionData.goal !== null ||
    sessionData.preSessionMood !== null ||
    !!sessionData.sessionFocus ||
    !!sessionData.techniqueFocus ||
    !!sessionData.ifThenPlan ||
    !!sessionData.customIntention ||
    sessionData.approachMoods.length > 0 ||
    (sessionData.approachNotes?.length ?? 0) > 0
  )
}

/**
 * Default collapse threshold for session context section.
 * Collapsed by default if more than this many approaches.
 */
export const COLLAPSE_THRESHOLD = 5

/**
 * Determine default expanded state based on approach count.
 */
export function getDefaultExpanded(sessionData: SessionSummaryData | null): boolean {
  if (!sessionData) return false
  return sessionData.approachCount <= COLLAPSE_THRESHOLD
}
