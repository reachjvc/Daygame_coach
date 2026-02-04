// Tracking module exports

// ─────────────────────────────────────────────────────────────────────────────
// Service (main orchestration)
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Sessions
  createSession,
  getSession,
  getActiveSession,
  updateSession,
  endSession,
  abandonSession,
  deleteSession,
  getSessionWithApproaches,
  getUserSessions,
  getSessionSummaries,
  getSessionApproaches,
  // Approaches
  createApproach,
  updateApproach,
  getUserApproaches,
  // Field Reports
  createFieldReport,
  updateFieldReport,
  getUserFieldReports,
  getDraftFieldReports,
  getFieldReportTemplates,
  getFieldReportTemplate,
  // Reviews
  createReview,
  updateReview,
  getUserReviews,
  getReviewTemplates,
  getLatestCommitment,
  // Stats
  getUserTrackingStats,
  getOrCreateUserTrackingStats,
  getDailyStats,
  getApproachesPerHour,
  // Milestones
  getUserMilestones,
  // Sticking Points
  createStickingPoint,
  updateStickingPoint,
  getUserStickingPoints,
} from "./trackingService"

// Re-export types from service
export type {
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
} from "./trackingService"

// ─────────────────────────────────────────────────────────────────────────────
// Components (UI)
// ─────────────────────────────────────────────────────────────────────────────

export { SessionTrackerPage } from "./components/SessionTrackerPage"
export { FieldReportPage } from "./components/FieldReportPage"
export { ProgressDashboard } from "./components/ProgressDashboard"
export { WeeklyReviewPage } from "./components/WeeklyReviewPage"
export { QuickAddModal } from "./components/QuickAddModal"

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export { useSession } from "./hooks/useSession"
export { useTrackingStats, invalidateTrackingStatsCache } from "./hooks/useTrackingStats"

// ─────────────────────────────────────────────────────────────────────────────
// Types (slice-specific)
// ─────────────────────────────────────────────────────────────────────────────

export type * from "./types"
