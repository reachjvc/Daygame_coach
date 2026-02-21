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
  countMonthlyReviews as repoCountMonthlyReviews,
  // Stats
  getUserTrackingStats as repoGetUserTrackingStats,
  getOrCreateUserTrackingStats as repoGetOrCreateUserTrackingStats,
  updateUserTrackingStats as repoUpdateUserTrackingStats,
  getDailyStats as repoGetDailyStats,
  getApproachesPerHour as repoGetApproachesPerHour,
  // Milestones
  getUserMilestones as repoGetUserMilestones,
  checkAndAwardMilestone as repoCheckAndAwardMilestone,
  checkAndAwardMilestones as repoCheckAndAwardMilestones,
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
  ApproachOutcome,
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
  UserTrackingStatsRow,
  UserTrackingStatsUpdate,
  MilestoneRow,
  MilestoneType,
  StickingPointRow,
  StickingPointInsert,
  StickingPointUpdate,
  DailyStats,
} from "@/src/db/trackingTypes"
import type { ConversationFieldValue } from "./types"
import { ALL_MILESTONES } from "@/src/tracking/data/milestones"
import { syncLinkedGoals } from "@/src/db/goalRepo"

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

export async function updateSession(
  sessionId: string,
  updates: SessionUpdate
): Promise<SessionRow> {
  return repoUpdateSession(sessionId, updates)
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

  await updateSessionStats(session.user_id, sessionId, {
    approachCount: totalApproaches,
    goalMet,
    durationMinutes,
    startHour: startedAt.getHours(),
    location: session.primary_location,
  })

  // Sync linked goals with updated tracking stats
  await syncLinkedGoals(session.user_id).catch((e) => console.error("syncLinkedGoals failed:", e))

  return updatedSession
}

/**
 * Abandon a session - used when user starts a new session while this one is still active.
 * Unlike endSession, this marks the session as 'abandoned' and does NOT update stats/milestones.
 */
export async function abandonSession(sessionId: string): Promise<SessionRow> {
  return repoAbandonSession(sessionId)
}

export async function reactivateSession(sessionId: string): Promise<SessionWithApproaches> {
  return repoReactivateSession(sessionId)
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  return repoDeleteSession(sessionId, userId)
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
  await incrementApproachStats(approach.user_id, approach.outcome ?? undefined, approach.session_id ?? undefined)
  return row
}

export async function updateApproach(
  approachId: string,
  updates: ApproachUpdate
): Promise<ApproachRow> {
  return repoUpdateApproach(approachId, updates)
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

  // Update field report count and check milestones (only for non-drafts)
  if (!report.is_draft) {
    const stats = await repoGetOrCreateUserTrackingStats(report.user_id)
    const currentWeek = getISOWeekString(new Date())
    const weekChanged = stats.current_week !== currentWeek
    const newCount = (stats.total_field_reports || 0) + 1
    const weeklyReports = weekChanged ? 1 : (stats.current_week_field_reports ?? 0) + 1
    const fieldReportUpdates: UserTrackingStatsUpdate = {
      total_field_reports: newCount,
      current_week: currentWeek,
      current_week_field_reports: weeklyReports,
    }
    // Reset ALL other weekly counters when week rolls over
    if (weekChanged) {
      fieldReportUpdates.current_week_sessions = 0
      fieldReportUpdates.current_week_approaches = 0
      fieldReportUpdates.current_week_numbers = 0
      fieldReportUpdates.current_week_instadates = 0
    }
    await repoUpdateUserTrackingStats(report.user_id, fieldReportUpdates)

    const potentialMilestones: Array<{ type: MilestoneType; value?: number }> = []
    if (newCount === 1) potentialMilestones.push({ type: "first_field_report" })
    if (newCount === 10) potentialMilestones.push({ type: "10_field_reports" })
    if (newCount === 25) potentialMilestones.push({ type: "25_field_reports" })
    if (newCount === 50) potentialMilestones.push({ type: "50_field_reports" })
    await repoCheckAndAwardMilestones(report.user_id, potentialMilestones, report.session_id)

    // Sync linked goals with updated tracking stats
    await syncLinkedGoals(report.user_id).catch((e) => console.error("syncLinkedGoals failed:", e))
  }

  return row
}

export async function updateFieldReport(
  reportId: string,
  updates: FieldReportUpdate
): Promise<FieldReportRow> {
  return repoUpdateFieldReport(reportId, updates)
}

export async function getFieldReport(reportId: string): Promise<FieldReportRow | null> {
  return repoGetFieldReport(reportId)
}

export async function deleteFieldReport(reportId: string, userId: string): Promise<void> {
  return repoDeleteFieldReport(reportId, userId)
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

  if (!review.is_draft) {
    if (review.review_type === "weekly") {
      await incrementWeeklyReviewCount(review.user_id)
      await repoCheckAndAwardMilestone(review.user_id, "first_weekly_review")
    } else if (review.review_type === "monthly") {
      await incrementMonthlyReviewCount(review.user_id)
    }
  }

  return row
}

export async function updateReview(
  reviewId: string,
  updates: ReviewUpdate
): Promise<ReviewRow> {
  return repoUpdateReview(reviewId, updates)
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
  return milestones.filter(m => m.milestone_type in ALL_MILESTONES)
}

// ============================================
// Pure Helpers (extracted from trackingRepo)
// ============================================

/**
 * Get the ISO week string for a date (e.g., "2026-W07").
 */
export function getISOWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Set to nearest Thursday: current date + 4 - current day number
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

/**
 * Check if two ISO week strings are consecutive (e.g., "2026-W06" and "2026-W07").
 */
export function areWeeksConsecutive(week1: string, week2: string): boolean {
  if (!week1 || !week2) return false
  const [year1, w1] = week1.split('-W').map(Number)
  const [year2, w2] = week2.split('-W').map(Number)

  // Same year, consecutive weeks
  if (year1 === year2 && w2 === w1 + 1) return true
  // Year boundary: last week of year1 to first week of year2
  if (year2 === year1 + 1 && w1 >= 52 && w2 === 1) return true

  return false
}

/**
 * A week is "active" if 2+ sessions OR 5+ approaches were logged.
 */
export function isWeekActive(sessions: number, approaches: number): boolean {
  return sessions >= 2 || approaches >= 5
}

// ============================================
// Business Logic (extracted from trackingRepo)
// ============================================

/**
 * Update session-related stats and check milestones after a session ends.
 */
async function updateSessionStats(
  userId: string,
  sessionId: string,
  sessionInfo: {
    approachCount: number
    goalMet: boolean
    durationMinutes: number
    startHour: number
    location: string | null
  }
): Promise<void> {
  const stats = await repoGetOrCreateUserTrackingStats(userId)
  const currentWeek = getISOWeekString(new Date())

  // Track weekly sessions
  const weekChanged = stats.current_week !== currentWeek
  let weeklySessions = weekChanged ? 1 : (stats.current_week_sessions || 0) + 1

  // Update unique locations
  let uniqueLocations = stats.unique_locations || []
  if (sessionInfo.location && !uniqueLocations.includes(sessionInfo.location)) {
    uniqueLocations = [...uniqueLocations, sessionInfo.location]
  }

  const newSessionCount = stats.total_sessions + 1

  const updates: UserTrackingStatsUpdate = {
    total_sessions: newSessionCount,
    current_week: currentWeek,
    current_week_sessions: weeklySessions,
    unique_locations: uniqueLocations,
  }

  // Reset ALL other weekly counters when week rolls over
  if (weekChanged) {
    updates.current_week_approaches = 0
    updates.current_week_numbers = 0
    updates.current_week_instadates = 0
    updates.current_week_field_reports = 0
  }

  await repoUpdateUserTrackingStats(userId, updates)

  await checkAndUpdateWeeklyStreak(userId, currentWeek)

  // Collect all potential milestones and check in batch
  const potentialMilestones: Array<{ type: MilestoneType; value?: number }> = []

  if (newSessionCount === 1) potentialMilestones.push({ type: "first_session" })
  if (newSessionCount === 3) potentialMilestones.push({ type: "3_sessions" })
  if (newSessionCount === 5) potentialMilestones.push({ type: "5_sessions" })
  if (newSessionCount === 10) potentialMilestones.push({ type: "10_sessions" })
  if (newSessionCount === 25) potentialMilestones.push({ type: "25_sessions" })
  if (newSessionCount === 50) potentialMilestones.push({ type: "50_sessions" })
  if (newSessionCount === 100) potentialMilestones.push({ type: "100_sessions" })

  if (sessionInfo.approachCount >= 5) potentialMilestones.push({ type: "first_5_approach_session" })
  if (sessionInfo.approachCount >= 10) potentialMilestones.push({ type: "first_10_approach_session" })
  if (sessionInfo.goalMet) potentialMilestones.push({ type: "first_goal_hit" })
  if (sessionInfo.durationMinutes >= 120) potentialMilestones.push({ type: "marathon" })

  const dayOfWeek = new Date().getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) potentialMilestones.push({ type: "weekend_warrior" })

  if (uniqueLocations.length >= 5) potentialMilestones.push({ type: "globetrotter" })

  await repoCheckAndAwardMilestones(userId, potentialMilestones, sessionId)
}

/**
 * Check if the current week qualifies as "active" and update the weekly streak.
 */
async function checkAndUpdateWeeklyStreak(
  userId: string,
  currentWeek: string
): Promise<void> {
  const stats = await repoGetUserTrackingStats(userId)
  if (!stats) return

  const weeklySessions = stats.current_week_sessions || 0
  const weeklyApproaches = stats.current_week_approaches || 0
  const lastActiveWeek = stats.last_active_week

  if (!isWeekActive(weeklySessions, weeklyApproaches)) {
    return
  }

  if (lastActiveWeek === currentWeek) {
    return
  }

  let newWeekStreak: number
  if (lastActiveWeek && areWeeksConsecutive(lastActiveWeek, currentWeek)) {
    newWeekStreak = (stats.current_week_streak || 0) + 1
  } else {
    newWeekStreak = 1
  }

  await repoUpdateUserTrackingStats(userId, {
    current_week_streak: newWeekStreak,
    longest_week_streak: Math.max(stats.longest_week_streak || 0, newWeekStreak),
    last_active_week: currentWeek,
  })

  const potentialMilestones: Array<{ type: MilestoneType; value?: number }> = []
  if (newWeekStreak === 2) potentialMilestones.push({ type: "2_week_streak" })
  if (newWeekStreak === 4) potentialMilestones.push({ type: "4_week_streak" })
  if (newWeekStreak === 8) potentialMilestones.push({ type: "8_week_streak" })
  if (newWeekStreak === 12) potentialMilestones.push({ type: "12_week_streak" })
  if (newWeekStreak === 26) potentialMilestones.push({ type: "26_week_streak" })
  if (newWeekStreak === 52) potentialMilestones.push({ type: "52_week_streak" })
  await repoCheckAndAwardMilestones(userId, potentialMilestones)
}

/**
 * Update approach-related stats, daily streak, and check milestones.
 */
async function incrementApproachStats(
  userId: string,
  outcome?: ApproachOutcome,
  sessionId?: string
): Promise<void> {
  const stats = await repoGetOrCreateUserTrackingStats(userId)

  const today = new Date().toISOString().split("T")[0]
  const currentWeek = getISOWeekString(new Date())
  const lastDate = stats.last_approach_date

  // Calculate daily streak (legacy, but still track it)
  let newStreak = stats.current_streak
  if (lastDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    if (lastDate === yesterdayStr) {
      newStreak = stats.current_streak + 1
    } else if (lastDate !== today) {
      newStreak = 1
    }
  }

  // Track weekly approaches
  const weekChanged = stats.current_week !== currentWeek
  const weeklyApproaches = weekChanged ? 1 : (stats.current_week_approaches || 0) + 1

  const updates: UserTrackingStatsUpdate = {
    total_approaches: stats.total_approaches + 1,
    last_approach_date: today,
    current_streak: newStreak,
    longest_streak: Math.max(stats.longest_streak, newStreak),
    current_week: currentWeek,
    current_week_approaches: weeklyApproaches,
  }

  // Reset ALL other weekly counters when week rolls over
  if (weekChanged) {
    updates.current_week_sessions = 0
    updates.current_week_numbers = 0
    updates.current_week_instadates = 0
    updates.current_week_field_reports = 0
  }

  let newNumbers = stats.total_numbers
  let newInstadates = stats.total_instadates

  if (outcome === "number") {
    newNumbers = stats.total_numbers + 1
    updates.total_numbers = newNumbers
    const weeklyNumbers = weekChanged ? 0 : (stats.current_week_numbers ?? 0)
    updates.current_week_numbers = weeklyNumbers + 1
  } else if (outcome === "instadate") {
    newInstadates = stats.total_instadates + 1
    updates.total_instadates = newInstadates
    const weeklyInstadates = weekChanged ? 0 : (stats.current_week_instadates ?? 0)
    updates.current_week_instadates = weeklyInstadates + 1
  }

  await repoUpdateUserTrackingStats(userId, updates)

  await checkAndUpdateWeeklyStreak(userId, currentWeek)

  // Collect all potential milestones and check in batch
  const potentialMilestones: Array<{ type: MilestoneType; value?: number }> = []
  const newTotal = stats.total_approaches + 1

  if (newTotal === 1) potentialMilestones.push({ type: "first_approach" })
  if (newTotal === 5) potentialMilestones.push({ type: "5_approaches" })
  if (newTotal === 10) potentialMilestones.push({ type: "10_approaches" })
  if (newTotal === 25) potentialMilestones.push({ type: "25_approaches" })
  if (newTotal === 50) potentialMilestones.push({ type: "50_approaches" })
  if (newTotal === 100) potentialMilestones.push({ type: "100_approaches" })
  if (newTotal === 250) potentialMilestones.push({ type: "250_approaches" })
  if (newTotal === 500) potentialMilestones.push({ type: "500_approaches" })
  if (newTotal === 1000) potentialMilestones.push({ type: "1000_approaches" })

  if (outcome === "number") {
    if (newNumbers === 1) potentialMilestones.push({ type: "first_number" })
    if (newNumbers === 2) potentialMilestones.push({ type: "2_numbers" })
    if (newNumbers === 5) potentialMilestones.push({ type: "5_numbers" })
    if (newNumbers === 10) potentialMilestones.push({ type: "10_numbers" })
    if (newNumbers === 25) potentialMilestones.push({ type: "25_numbers" })
    if (newNumbers === 50) potentialMilestones.push({ type: "50_numbers" })
    if (newNumbers === 100) potentialMilestones.push({ type: "100_numbers" })
  }

  if (outcome === "instadate") {
    if (newInstadates === 1) potentialMilestones.push({ type: "first_instadate" })
    if (newInstadates === 2) potentialMilestones.push({ type: "2_instadates" })
    if (newInstadates === 5) potentialMilestones.push({ type: "5_instadates" })
    if (newInstadates === 10) potentialMilestones.push({ type: "10_instadates" })
    if (newInstadates === 25) potentialMilestones.push({ type: "25_instadates" })
  }

  if (newStreak === 7) potentialMilestones.push({ type: "7_day_streak" })
  if (newStreak === 30) potentialMilestones.push({ type: "30_day_streak" })
  if (newStreak === 100) potentialMilestones.push({ type: "100_day_streak" })

  await repoCheckAndAwardMilestones(userId, potentialMilestones, sessionId)
}

/**
 * Increment weekly review count and check unlock for monthly reviews.
 */
async function incrementWeeklyReviewCount(userId: string): Promise<void> {
  const stats = await repoGetOrCreateUserTrackingStats(userId)

  const newCount = stats.weekly_reviews_completed + 1

  const updates: UserTrackingStatsUpdate = {
    weekly_reviews_completed: newCount,
    current_weekly_streak: stats.current_weekly_streak + 1,
  }

  if (newCount >= 4 && !stats.monthly_review_unlocked) {
    updates.monthly_review_unlocked = true
    await repoCheckAndAwardMilestone(userId, "monthly_unlocked")
  }

  await repoUpdateUserTrackingStats(userId, updates)
}

/**
 * Check if quarterly reviews should be unlocked after monthly review submission.
 */
async function incrementMonthlyReviewCount(userId: string): Promise<void> {
  const stats = await repoGetOrCreateUserTrackingStats(userId)

  if (!stats.quarterly_review_unlocked) {
    const count = await repoCountMonthlyReviews(userId)
    if (count >= 3) {
      await repoUpdateUserTrackingStats(userId, { quarterly_review_unlocked: true })
      await repoCheckAndAwardMilestone(userId, "quarterly_unlocked")
    }
  }
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
