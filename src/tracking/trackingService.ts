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
  endSession as repoEndSession,
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
  getUserFieldReports as repoGetUserFieldReports,
  getDraftFieldReports as repoGetDraftFieldReports,
  getFieldReportTemplates as repoGetFieldReportTemplates,
  getFieldReportTemplate as repoGetFieldReportTemplate,
  // Reviews
  createReview as repoCreateReview,
  updateReview as repoUpdateReview,
  getUserReviews as repoGetUserReviews,
  getReviewTemplates as repoGetReviewTemplates,
  getLatestCommitment as repoGetLatestCommitment,
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
} from "@/src/db/trackingTypes"

// ============================================
// Sessions
// ============================================

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
  return repoEndSession(sessionId)
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
  return repoCreateApproach(approach)
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
  return repoCreateFieldReport(report)
}

export async function updateFieldReport(
  reportId: string,
  updates: FieldReportUpdate
): Promise<FieldReportRow> {
  return repoUpdateFieldReport(reportId, updates)
}

export async function getUserFieldReports(
  userId: string,
  limit?: number,
  offset?: number
): Promise<FieldReportRow[]> {
  return repoGetUserFieldReports(userId, limit, offset)
}

export async function getDraftFieldReports(userId: string): Promise<FieldReportRow[]> {
  return repoGetDraftFieldReports(userId)
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

// ============================================
// Reviews
// ============================================

export async function createReview(review: ReviewInsert): Promise<ReviewRow> {
  return repoCreateReview(review)
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

export async function getUserMilestones(userId: string): Promise<MilestoneRow[]> {
  return repoGetUserMilestones(userId)
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
