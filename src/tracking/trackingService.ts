/**
 * Tracking Service - Business Logic Layer
 *
 * This service provides the public API for all tracking operations.
 * API routes should import from this service, not directly from trackingRepo.
 *
 * Currently delegates to trackingRepo - business logic can be extracted here
 * as needed for better separation of concerns.
 */

import {
  // Sessions
  createSession as repoCreateSession,
  getSession as repoGetSession,
  getActiveSession as repoGetActiveSession,
  updateSession as repoUpdateSession,
  abandonSession as repoAbandonSession,
  reactivateSession as repoReactivateSession,
  deleteSession as repoDeleteSession,
  getSessionWithApproaches as repoGetSessionWithApproaches,
  getUserSessions as repoGetUserSessions,
  getSessionSummaries as repoGetSessionSummaries,
  getSessionApproaches as repoGetSessionApproaches,
  getSessionIntentionSuggestions as repoGetSessionIntentionSuggestions,
  type SessionIntentionSuggestions,
  // Approaches
  createApproach as repoCreateApproach,
  updateApproach as repoUpdateApproach,
  getUserApproaches as repoGetUserApproaches,
  // Field Reports
  createFieldReport as repoCreateFieldReport,
  updateFieldReport as repoUpdateFieldReport,
  getFieldReport as repoGetFieldReport,
  deleteFieldReport as repoDeleteFieldReport,
  getUserFieldReports as repoGetUserFieldReports,
  getDraftFieldReports as repoGetDraftFieldReports,
  getFieldReportTemplates as repoGetFieldReportTemplates,
  getFieldReportTemplate as repoGetFieldReportTemplate,
  getMostRecentlyUsedTemplateId as repoGetMostRecentlyUsedTemplateId,
  getFavoriteTemplateIds as repoGetFavoriteTemplateIds,
  addFavoriteTemplate as repoAddFavoriteTemplate,
  removeFavoriteTemplate as repoRemoveFavoriteTemplate,
  // Custom Report Templates
  createCustomReportTemplate as repoCreateCustomReportTemplate,
  getUserCustomReportTemplates as repoGetUserCustomReportTemplates,
  getCustomReportTemplate as repoGetCustomReportTemplate,
  updateCustomReportTemplate as repoUpdateCustomReportTemplate,
  deleteCustomReportTemplate as repoDeleteCustomReportTemplate,
  // Reviews
  createReview as repoCreateReview,
  updateReview as repoUpdateReview,
  getUserReviews as repoGetUserReviews,
  getReviewTemplates as repoGetReviewTemplates,
  getLatestCommitment as repoGetLatestCommitment,
  // Custom Review Templates
  createCustomReviewTemplate as repoCreateCustomReviewTemplate,
  deleteCustomReviewTemplate as repoDeleteCustomReviewTemplate,
  // Stats
  getUserTrackingStats as repoGetUserTrackingStats,
  getOrCreateUserTrackingStats as repoGetOrCreateUserTrackingStats,
  getDailyStats as repoGetDailyStats,
  getApproachesPerHour as repoGetApproachesPerHour,
  // Milestones
  getUserMilestones as repoGetUserMilestones,
  // Sticking Points
  createStickingPoint as repoCreateStickingPoint,
  updateStickingPoint as repoUpdateStickingPoint,
  getUserStickingPoints as repoGetUserStickingPoints,
} from "@/src/db/trackingRepo"

import type {
  SessionRow,
  SessionInsert,
  SessionUpdate,
  SessionWithApproaches,
  SessionSummary,
  ApproachRow,
  ApproachInsert,
  ApproachUpdate,
  FieldReportRow,
  FieldReportInsert,
  FieldReportUpdate,
  FieldReportTemplateRow,
  FieldReportTemplateInsert,
  FieldReportTemplateUpdate,
  ReviewRow,
  ReviewInsert,
  ReviewUpdate,
  ReviewType,
  ReviewTemplateRow,
  ReviewTemplateInsert,
  UserTrackingStatsRow,
  MilestoneRow,
  StickingPointRow,
  StickingPointInsert,
  StickingPointUpdate,
  DailyStats,
} from "@/src/db/trackingTypes"
import type { ConversationFieldValue, DailyWeekSummary } from "./types"
import { ALL_MILESTONES } from "@/src/tracking/data/milestones"
import { syncLinkedGoals } from "@/src/db/goalRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { rollTrackingCounters } from "@/src/db/trackingRepo"
import { gateStreaks } from "@/src/db/metricsRepo"
import { reconcileUserProgress } from "./achievementsSyncService"

// ============================================
// Sessions
// ============================================

/**
 * Create a new session.
 * Note: The UI should check for existing active sessions first using getActiveSession()
 * and show a dialog to let the user choose to resume or start fresh.
 */
export async function createSession(session: SessionInsert): Promise<SessionRow> {
  return repoCreateSession(session)
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  return repoGetSession(sessionId)
}

export async function getActiveSession(userId: string): Promise<SessionRow | null> {
  return repoGetActiveSession(userId)
}

/**
 * Editing a finished session changes what it earned.
 *
 * `primary_location` feeds Globetrotter and `unique_locations`; `goal_met`
 * feeds Goal Crusher; `duration_minutes` feeds Marathon. Correcting a mistyped
 * location used to leave the old name in the counters until some unrelated
 * write happened to trigger a recount.
 */
export async function updateSession(
  sessionId: string,
  updates: SessionUpdate
): Promise<SessionRow> {
  const row = await repoUpdateSession(sessionId, updates)
  await reconcileUserProgress(row.user_id)
  return row
}

export async function endSession(sessionId: string): Promise<SessionRow> {
  const session = await repoGetSessionWithApproaches(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }

  const endedAt = new Date()
  const startedAt = new Date(session.started_at)
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

  const totalApproaches = session.approaches.length
  const goalMet = session.goal ? totalApproaches >= session.goal : false

  const updatedSession = await repoUpdateSession(sessionId, {
    ended_at: endedAt.toISOString(),
    is_active: false,
    duration_minutes: durationMinutes,
    total_approaches: totalApproaches,
    goal_met: goalMet,
    end_reason: 'completed',
  })

  await reconcileUserProgress(session.user_id)

  // Sync linked goals with updated tracking stats
  // The timezone is not optional here. Without it the goal sync rolls the week
  // by the SERVER clock, which for a Copenhagen user just past midnight on
  // Monday is still last week — and the roll then wipes the counters this
  // reconcile has only just written.
  await syncGoals(session.user_id)

  return updatedSession
}

/**
 * Abandon a session - used when user starts a new session while this one is still active.
 * Unlike endSession, this marks the session as 'abandoned' and does NOT update stats/milestones.
 */
export async function abandonSession(sessionId: string): Promise<SessionRow> {
  return repoAbandonSession(sessionId)
}

/**
 * Reopening a finished session makes it a live one again, so it stops counting
 * as completed until it is ended. The counters have to be told, or they keep
 * reporting a session that is currently running as finished.
 */
export async function reactivateSession(sessionId: string): Promise<SessionWithApproaches> {
  const session = await repoReactivateSession(sessionId)
  await reconcileUserProgress(session.user_id)
  return session
}

/**
 * Deleting a session takes its approaches with it (the foreign key cascades), so
 * the counters have to be worked out again. They go DOWN; the badges do not —
 * `reconcileUserProgress` only ever inserts, so nothing already earned is taken
 * away from a user who tidies up their history.
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  await repoDeleteSession(sessionId, userId)
  await reconcileUserProgress(userId)
}

export async function getSessionWithApproaches(
  sessionId: string
): Promise<SessionWithApproaches | null> {
  return repoGetSessionWithApproaches(sessionId)
}

export async function getUserSessions(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SessionRow[]> {
  return repoGetUserSessions(userId, limit, offset)
}

export async function getSessionSummaries(
  userId: string,
  limit?: number
): Promise<SessionSummary[]> {
  return repoGetSessionSummaries(userId, limit)
}

export async function getSessionApproaches(sessionId: string): Promise<ApproachRow[]> {
  return repoGetSessionApproaches(sessionId)
}

export async function getSessionIntentionSuggestions(
  userId: string
): Promise<SessionIntentionSuggestions> {
  return repoGetSessionIntentionSuggestions(userId)
}

// ============================================
// Approaches
// ============================================

export async function createApproach(approach: ApproachInsert): Promise<ApproachRow> {
  const row = await repoCreateApproach(approach)
  await reconcileUserProgress(approach.user_id)
  return row
}

/**
 * THE OUTCOME ARRIVES HERE, NOT ON CREATE.
 *
 * The tracker saves the approach the moment it is logged and sets "she gave me
 * her number" a tap later, through this function. It used to update nothing but
 * the row, which is why an account with 23 real numbers had a phone-number total
 * of 0 and could not win a single Numbers badge. Reconciling here is the fix.
 */
export async function updateApproach(
  approachId: string,
  updates: ApproachUpdate
): Promise<ApproachRow> {
  const row = await repoUpdateApproach(approachId, updates)
  await reconcileUserProgress(row.user_id)
  return row
}

export async function getUserApproaches(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ApproachRow[]> {
  return repoGetUserApproaches(userId, limit, offset)
}

// ============================================
// Field Reports
// ============================================

export async function createFieldReport(report: FieldReportInsert): Promise<FieldReportRow> {
  const row = await repoCreateFieldReport(report)
  await reconcileUserProgress(report.user_id)
  await syncGoals(report.user_id)
  return row
}

/**
 * A draft becoming a real report is an edit, not a create — so this path has to
 * recount too. It never did, which meant a report written as a draft and
 * submitted later counted for nothing.
 */
export async function updateFieldReport(
  reportId: string,
  updates: FieldReportUpdate
): Promise<FieldReportRow> {
  const row = await repoUpdateFieldReport(reportId, updates)
  await reconcileUserProgress(row.user_id)
  return row
}

export async function getFieldReport(reportId: string): Promise<FieldReportRow | null> {
  return repoGetFieldReport(reportId)
}

export async function deleteFieldReport(reportId: string, userId: string): Promise<void> {
  await repoDeleteFieldReport(reportId, userId)
  await reconcileUserProgress(userId)
}

export async function getUserFieldReports(
  userId: string,
  limit?: number,
  offset?: number
): Promise<FieldReportRow[]> {
  return repoGetUserFieldReports(userId, limit, offset)
}

export async function getDraftFieldReports(userId: string, limit?: number): Promise<FieldReportRow[]> {
  return repoGetDraftFieldReports(userId, limit)
}

export async function getFieldReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]> {
  return repoGetFieldReportTemplates(userId)
}

export async function getFieldReportTemplate(
  templateId: string
): Promise<FieldReportTemplateRow | null> {
  return repoGetFieldReportTemplate(templateId)
}

export async function getMostRecentlyUsedTemplateId(userId: string): Promise<string | null> {
  return repoGetMostRecentlyUsedTemplateId(userId)
}

export async function getFavoriteTemplateIds(userId: string): Promise<string[]> {
  return repoGetFavoriteTemplateIds(userId)
}

export async function addFavoriteTemplate(userId: string, templateId: string): Promise<string[]> {
  return repoAddFavoriteTemplate(userId, templateId)
}

export async function removeFavoriteTemplate(userId: string, templateId: string): Promise<string[]> {
  return repoRemoveFavoriteTemplate(userId, templateId)
}

// ============================================
// Custom Report Templates
// ============================================

/**
 * Generate a URL-safe slug from a template name.
 * Ensures uniqueness by appending timestamp if needed.
 */
export function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36)
  return `${baseSlug}-${timestamp}`
}

/**
 * Estimate completion time based on field types.
 * More complex fields take longer to fill out.
 */
export function estimateMinutes(fields: FieldReportTemplateInsert["static_fields"]): number {
  let minutes = 0
  for (const field of fields) {
    switch (field.type) {
      case "textarea":
        minutes += 3
        break
      case "text":
      case "select":
      case "multiselect":
        minutes += 1
        break
      case "scale":
      case "number":
        minutes += 0.5
        break
      default:
        minutes += 1
    }
  }
  return Math.max(1, Math.round(minutes))
}

/**
 * Save a new custom report template for a user.
 * Generates slug and estimates completion time automatically.
 */
export async function saveCustomReportTemplate(
  userId: string,
  config: {
    name: string
    description?: string
    fields: FieldReportTemplateInsert["static_fields"]
  }
): Promise<FieldReportTemplateRow> {
  // Validate inputs
  if (!config.name.trim()) {
    throw new Error("Template name is required")
  }
  if (config.fields.length === 0) {
    throw new Error("At least one field is required")
  }

  const template: FieldReportTemplateInsert = {
    user_id: userId,
    name: config.name.trim(),
    slug: generateSlug(config.name),
    description: config.description?.trim(),
    estimated_minutes: estimateMinutes(config.fields),
    is_system: false,
    static_fields: config.fields,
    dynamic_fields: [],
    active_dynamic_fields: [],
  }

  return repoCreateCustomReportTemplate(template)
}

/**
 * Get all custom report templates for a user.
 */
export async function getUserCustomReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]> {
  return repoGetUserCustomReportTemplates(userId)
}

/**
 * Get a single custom report template by ID.
 * Returns null if not found or not owned by user.
 */
export async function getCustomReportTemplate(
  userId: string,
  templateId: string
): Promise<FieldReportTemplateRow | null> {
  return repoGetCustomReportTemplate(templateId, userId)
}

/**
 * Update an existing custom report template.
 */
export async function updateCustomReportTemplate(
  userId: string,
  templateId: string,
  updates: {
    name?: string
    description?: string
    fields?: FieldReportTemplateInsert["static_fields"]
  }
): Promise<FieldReportTemplateRow> {
  const templateUpdates: FieldReportTemplateUpdate = {}

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      throw new Error("Template name cannot be empty")
    }
    templateUpdates.name = updates.name.trim()
  }

  if (updates.description !== undefined) {
    templateUpdates.description = updates.description.trim()
  }

  if (updates.fields !== undefined) {
    if (updates.fields.length === 0) {
      throw new Error("At least one field is required")
    }
    templateUpdates.static_fields = updates.fields
    templateUpdates.estimated_minutes = estimateMinutes(updates.fields)
  }

  return repoUpdateCustomReportTemplate(templateId, userId, templateUpdates)
}

/**
 * Delete a custom report template.
 */
export async function deleteCustomReportTemplate(
  userId: string,
  templateId: string
): Promise<void> {
  return repoDeleteCustomReportTemplate(templateId, userId)
}

// ============================================
// Reviews
// ============================================

export async function createReview(review: ReviewInsert): Promise<ReviewRow> {
  const row = await repoCreateReview(review)
  await reconcileUserProgress(review.user_id)
  return row
}

/** A review submitted out of a draft has to count, same as one written in one go. */
export async function updateReview(
  reviewId: string,
  updates: ReviewUpdate
): Promise<ReviewRow> {
  const row = await repoUpdateReview(reviewId, updates)
  await reconcileUserProgress(row.user_id)
  return row
}

export async function getUserReviews(
  userId: string,
  reviewType?: ReviewType,
  limit?: number
): Promise<ReviewRow[]> {
  return repoGetUserReviews(userId, reviewType, limit)
}

export async function getReviewTemplates(
  userId: string,
  reviewType?: ReviewType
): Promise<ReviewTemplateRow[]> {
  return repoGetReviewTemplates(userId, reviewType)
}

export async function getLatestCommitment(userId: string): Promise<string | null> {
  return repoGetLatestCommitment(userId)
}

// ============================================
// Custom Review Templates
// ============================================

/**
 * Save a new custom review template for a user.
 * Generates slug and estimates completion time automatically.
 */
export async function saveCustomReviewTemplate(
  userId: string,
  config: {
    name: string
    description?: string
    reviewType: ReviewType
    fields: ReviewTemplateInsert["static_fields"]
  }
): Promise<ReviewTemplateRow> {
  if (!config.name.trim()) {
    throw new Error("Template name is required")
  }
  if (config.fields.length === 0) {
    throw new Error("At least one field is required")
  }

  const template: ReviewTemplateInsert = {
    user_id: userId,
    name: config.name.trim(),
    slug: generateSlug(config.name),
    description: config.description?.trim(),
    estimated_minutes: estimateMinutes(config.fields),
    review_type: config.reviewType,
    is_system: false,
    static_fields: config.fields,
    dynamic_fields: [],
    active_dynamic_fields: [],
  }

  return repoCreateCustomReviewTemplate(template)
}

/**
 * Delete a custom review template.
 */
export async function deleteCustomReviewTemplate(
  userId: string,
  templateId: string
): Promise<void> {
  return repoDeleteCustomReviewTemplate(templateId, userId)
}

// ============================================
// Daily Review Aggregation
// ============================================

/**
 * Aggregate daily reviews for a given week range.
 * Used by the weekly review to show daily reflection patterns.
 */
export async function aggregateDailyReviewsForWeek(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<DailyWeekSummary> {
  const reviews = await repoGetUserReviews(userId, "daily", 14)
  const startDate = new Date(weekStart)
  const endDate = new Date(weekEnd)

  const weekReviews = reviews.filter((r) => {
    const date = new Date(r.period_start)
    return date >= startDate && date <= endDate && !r.is_draft
  })

  const energies: number[] = []
  const dayRatings: number[] = []
  const processRatings: number[] = []
  const blockers: string[] = []
  const gladMoments: string[] = []
  const valuesAlignment = { toward: 0, neutral: 0, away: 0 }
  let lowDays = 0

  for (const review of weekReviews) {
    const fields = (review.fields || {}) as Record<string, string>

    const energy = Number(fields.energy)
    const dayRating = Number(fields.day_rating)
    const processRating = Number(fields.process_rating)

    if (energy > 0) energies.push(energy)
    if (dayRating > 0) dayRatings.push(dayRating)
    if (processRating > 0) processRatings.push(processRating)

    if (energy > 0 && energy <= 2 && dayRating > 0 && dayRating <= 2) {
      lowDays++
    }

    if (fields.blocker?.trim()) {
      blockers.push(fields.blocker.trim())
    }

    if (fields.glad_moment?.trim()) {
      gladMoments.push(fields.glad_moment.trim())
    }

    const alignment = fields.values_alignment
    if (alignment === "toward" || alignment === "neutral" || alignment === "away") {
      valuesAlignment[alignment]++
    }
  }

  const avg = (arr: number[]) => arr.length > 0
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
    : null

  const avgEnergy = avg(energies)
  const avgDayRating = avg(dayRatings)
  const avgProcessRating = avg(processRatings)
  const processOutcomeGap = avgProcessRating !== null && avgDayRating !== null
    ? Math.round((avgProcessRating - avgDayRating) * 10) / 10
    : null

  return {
    count: weekReviews.length,
    avgEnergy,
    avgDayRating,
    avgProcessRating,
    processOutcomeGap,
    blockers: blockers.slice(0, 7),
    valuesAlignment,
    gladMoments: gladMoments.slice(0, 5),
    lowDays,
  }
}

// ============================================
// Stats
// ============================================

export async function getUserTrackingStats(
  userId: string
): Promise<UserTrackingStatsRow | null> {
  return repoGetUserTrackingStats(userId)
}

export async function getOrCreateUserTrackingStats(
  userId: string
): Promise<UserTrackingStatsRow> {
  return repoGetOrCreateUserTrackingStats(userId)
}

/**
 * The stats row ready to be shown to the user.
 *
 * Two corrections, both of which have to happen or the numbers lie:
 *
 * 1. ROLL. `current_week_*` are the counts for the week named by
 *    `week_start_date`. They are only rewritten when the user logs something,
 *    so a user who did nothing since Sunday would otherwise open the app on
 *    Monday and see last week's numbers presented as this week's.
 * 2. GATE. A streak is a number plus the period it was last earned in; read
 *    raw, a streak that ended in June still reads as live in August.
 *
 * The dashboard's metric path already did both (`metricsRepo.loadStats`). This
 * is the same pair for the raw-row endpoint, which did neither.
 */
export async function getTrackingStatsForDisplay(
  userId: string
): Promise<UserTrackingStatsRow> {
  const timezone = await getUserTimezone(userId)
  await rollTrackingCounters(userId, timezone)
  return gateStreaks(await repoGetOrCreateUserTrackingStats(userId), timezone)
}

export async function getDailyStats(userId: string, days?: number): Promise<DailyStats[]> {
  return repoGetDailyStats(userId, days)
}

export async function getApproachesPerHour(
  userId: string,
  sessionId?: string
): Promise<number> {
  return repoGetApproachesPerHour(userId, sessionId)
}

// ============================================
// Milestones
// ============================================

export async function getUserMilestones(userId: string, limit?: number): Promise<MilestoneRow[]> {
  const milestones = await repoGetUserMilestones(userId, limit)
  return milestones.filter(m => {
    if (m.milestone_type in ALL_MILESTONES) return true
    console.warn(`[trackingService] Unknown milestone_type "${m.milestone_type}" — skipping`)
    return false
  })
}

// ============================================
// Pure Helpers (extracted from trackingRepo)
// ============================================

/**
 * A week is "active" if 2+ sessions OR 5+ approaches were logged.
 *
 * Re-exported from `counterRules`, where it lives with the rest of the counter
 * rules and can be imported by `trackingRepo` without closing an import cycle.
 */
export { isWeekActive } from "@/src/tracking/counterRules"

/**
 * Push the freshly derived counters into any goal that tracks them.
 *
 * Always with the user's timezone: every week boundary downstream is read
 * against it, and passing null means the server's own clock decides, which is
 * how a Copenhagen user could end a session at 00:30 on Monday and watch this
 * week's counters get zeroed a moment later.
 */
async function syncGoals(userId: string): Promise<void> {
  const timezone = await getUserTimezone(userId)
  await syncLinkedGoals(userId, timezone).catch((e) =>
    console.error("syncLinkedGoals failed:", e)
  )
}

// ============================================
// Sticking Points
// ============================================

export async function createStickingPoint(
  point: StickingPointInsert
): Promise<StickingPointRow> {
  return repoCreateStickingPoint(point)
}

export async function updateStickingPoint(
  pointId: string,
  updates: StickingPointUpdate
): Promise<StickingPointRow> {
  return repoUpdateStickingPoint(pointId, updates)
}

export async function getUserStickingPoints(
  userId: string,
  status?: StickingPointRow["status"]
): Promise<StickingPointRow[]> {
  return repoGetUserStickingPoints(userId, status)
}

// ============================================
// Conversation Field Helpers
// ============================================

/**
 * Extract text from a conversation field value.
 * Handles both plain string (legacy) and ConversationFieldValue object formats.
 */
export function getConversationText(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "text" in value) {
    return (value as ConversationFieldValue).text
  }
  return ""
}

/**
 * Extract audio URL from a conversation field value, if present.
 */
export function getConversationAudioUrl(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "audioUrl" in value) {
    return (value as ConversationFieldValue).audioUrl || null
  }
  return null
}

// ============================================
// Re-export types for convenience
// ============================================

export type {
  SessionRow,
  SessionInsert,
  SessionUpdate,
  SessionWithApproaches,
  SessionSummary,
  SessionIntentionSuggestions,
  ApproachRow,
  ApproachInsert,
  ApproachUpdate,
  FieldReportRow,
  FieldReportInsert,
  FieldReportUpdate,
  FieldReportTemplateRow,
  ReviewRow,
  ReviewInsert,
  ReviewUpdate,
  ReviewType,
  ReviewTemplateRow,
  UserTrackingStatsRow,
  MilestoneRow,
  StickingPointRow,
  StickingPointInsert,
  StickingPointUpdate,
  DailyStats,
}

export type { DailyWeekSummary } from "./types"
