import { createServerSupabaseClient, createAdminSupabaseClient } from "./supabase"
import {
  getSystemTemplatesAsRows,
  systemTemplateToRow,
  isSystemTemplate,
  type SystemTemplateSlug,
  getSystemReviewTemplatesAsRows,
} from "@/src/tracking/data/templates"
import { getMilestoneInfo, type MilestoneTier } from "@/src/tracking/data/milestones"

import type {
  SessionRow,
  SessionInsert,
  SessionUpdate,
  SessionWithApproaches,
  SessionSummary,
  SessionAchievement,
  ApproachRow,
  ApproachInsert,
  ApproachUpdate,
  FieldReportTemplateRow,
  FieldReportTemplateInsert,
  FieldReportTemplateUpdate,
  FieldReportRow,
  FieldReportInsert,
  FieldReportUpdate,
  ReviewTemplateRow,
  ReviewRow,
  ReviewInsert,
  ReviewUpdate,
  ReviewType,
  UserTrackingStatsRow,
  UserTrackingStatsUpdate,
  MilestoneRow,
  MilestoneInsert,
  MilestoneType,
  StickingPointRow,
  StickingPointInsert,
  StickingPointUpdate,
  DailyStats,
} from "./trackingTypes"

// ============================================
// Approach Ownership
// ============================================

export async function getApproachOwner(approachId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .select("user_id")
    .eq("id", approachId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get approach: ${error.message}`)
  }

  return data?.user_id ?? null
}

// ============================================
// Sessions
// ============================================

export async function createSession(session: SessionInsert): Promise<SessionRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return data as SessionRow
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get session: ${error.message}`)
  }

  return data as SessionRow
}

export async function getActiveSession(userId: string): Promise<SessionRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get active session: ${error.message}`)
  }

  return data as SessionRow
}

export async function updateSession(
  sessionId: string,
  updates: SessionUpdate
): Promise<SessionRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`)
  }

  return data as SessionRow
}

/**
 * Abandon a session - used when user starts a new session while this one is still active.
 * Unlike endSession, this does NOT update stats or milestones since the session was not
 * properly completed.
 */
export async function abandonSession(sessionId: string): Promise<SessionRow> {
  const session = await getSessionWithApproaches(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }

  const endedAt = new Date()
  const startedAt = new Date(session.started_at)
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

  // Mark as abandoned - don't call updateSessionStats since this wasn't a proper completion
  return updateSession(sessionId, {
    ended_at: endedAt.toISOString(),
    is_active: false,
    duration_minutes: durationMinutes,
    total_approaches: session.approaches.length,
    end_reason: 'abandoned',
  })
}

export async function reactivateSession(sessionId: string): Promise<SessionWithApproaches> {
  const session = await getSessionWithApproaches(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }

  if (session.is_active) {
    throw new Error("Session is already active")
  }

  // Reactivate the session
  await updateSession(sessionId, {
    is_active: true,
    ended_at: null,
    // Keep the stats as they were - user can continue from where they left off
  })

  // Return the reactivated session with approaches
  const reactivated = await getSessionWithApproaches(sessionId)
  if (!reactivated) {
    throw new Error("Failed to reactivate session")
  }

  return reactivated
}

export async function getSessionWithApproaches(
  sessionId: string
): Promise<SessionWithApproaches | null> {
  const supabase = await createServerSupabaseClient()

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (sessionError) {
    if (sessionError.code === "PGRST116") return null
    throw new Error(`Failed to get session: ${sessionError.message}`)
  }

  const { data: approaches, error: approachError } = await supabase
    .from("approaches")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true })

  if (approachError) {
    throw new Error(`Failed to get approaches: ${approachError.message}`)
  }

  return {
    ...(session as SessionRow),
    approaches: approaches as ApproachRow[],
  }
}

export async function getUserSessions(
  userId: string,
  limit = 10,
  offset = 0
): Promise<SessionRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to get sessions: ${error.message}`)
  }

  return data as SessionRow[]
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // Verify the session belongs to this user
  const session = await getSession(sessionId)
  if (!session || session.user_id !== userId) {
    throw new Error("Session not found or access denied")
  }

  // Delete associated approaches first (cascade)
  const { error: approachError } = await supabase
    .from("approaches")
    .delete()
    .eq("session_id", sessionId)

  if (approachError) {
    throw new Error(`Failed to delete approaches: ${approachError.message}`)
  }

  // Delete the session
  const { error: sessionError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)

  if (sessionError) {
    throw new Error(`Failed to delete session: ${sessionError.message}`)
  }

  // Note: Stats are not decremented - this is intentional for data integrity
  // Total approaches/numbers/etc. remain as historical records
}

// Tier order for sorting achievements (rarest first)
const TIER_ORDER: Record<SessionAchievement['tier'], number> = {
  diamond: 0,
  platinum: 1,
  gold: 2,
  silver: 3,
  bronze: 4,
}

// Raw session data type from Supabase embedded relations query
export type RawSessionWithRelations = {
  id: string
  started_at: string
  ended_at: string | null
  is_active: boolean
  duration_minutes: number | null
  goal: number | null
  goal_met: boolean
  primary_location: string | null
  end_reason: string | null
  approaches: Array<{ outcome: string | null }> | null
  milestones: Array<{ milestone_type: string }> | null
}

/**
 * Transform raw session data into SessionSummary format.
 * Pure function extracted for unit testing.
 */
export function transformSessionToSummary(session: RawSessionWithRelations): SessionSummary {
  const approaches = session.approaches || []
  const milestones = session.milestones || []

  const outcomes = {
    blowout: 0,
    short: 0,
    good: 0,
    number: 0,
    instadate: 0,
  }

  for (const approach of approaches) {
    if (approach.outcome && approach.outcome in outcomes) {
      outcomes[approach.outcome as keyof typeof outcomes]++
    }
  }

  // Transform milestones to achievements with full info, sorted by tier (rarest first)
  const achievements: SessionAchievement[] = milestones
    .map((m) => {
      const info = getMilestoneInfo(m.milestone_type)
      return {
        milestone_type: m.milestone_type,
        emoji: info.emoji,
        label: info.label,
        tier: info.tier as SessionAchievement['tier'],
      }
    })
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])

  return {
    id: session.id,
    started_at: session.started_at,
    ended_at: session.ended_at,
    is_active: session.is_active,
    total_approaches: approaches.length,
    duration_minutes: session.duration_minutes,
    goal: session.goal,
    goal_met: session.goal_met,
    primary_location: session.primary_location,
    end_reason: session.end_reason as SessionSummary['end_reason'],
    outcomes,
    achievements,
  }
}

export async function getSessionSummaries(
  userId: string,
  limit = 10
): Promise<SessionSummary[]> {
  const supabase = await createServerSupabaseClient()

  // Single query with embedded relations - fixes N+1 problem
  // Previously: 1 query for sessions + 2 queries per session = 11+ queries for 5 sessions
  // Now: 1 query total (sessions + approaches + milestones)
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id,
      started_at,
      ended_at,
      is_active,
      duration_minutes,
      goal,
      goal_met,
      primary_location,
      end_reason,
      approaches (
        outcome
      ),
      milestones (
        milestone_type
      )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get session summaries: ${error.message}`)
  }

  // Transform using extracted helper function (unit tested)
  return (data || []).map(transformSessionToSummary)
}

// ============================================
// Approaches
// ============================================

export async function createApproach(approach: ApproachInsert): Promise<ApproachRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .insert(approach)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create approach: ${error.message}`)
  }

  // Update session total if part of a session
  if (approach.session_id) {
    const { count } = await supabase
      .from("approaches")
      .select("*", { count: "exact", head: true })
      .eq("session_id", approach.session_id)

    if (count !== null) {
      await updateSession(approach.session_id, { total_approaches: count })
    }
  }

  return data as ApproachRow
}

export async function updateApproach(
  approachId: string,
  updates: ApproachUpdate
): Promise<ApproachRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .update(updates)
    .eq("id", approachId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update approach: ${error.message}`)
  }

  return data as ApproachRow
}

export async function getSessionApproaches(sessionId: string): Promise<ApproachRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true })

  if (error) {
    throw new Error(`Failed to get approaches: ${error.message}`)
  }

  return data as ApproachRow[]
}

export async function getUserApproaches(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ApproachRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to get approaches: ${error.message}`)
  }

  return data as ApproachRow[]
}

// ============================================
// Field Report Templates
// ============================================

/**
 * Get all field report templates (system + user-created).
 * System templates are served from code, user templates from DB.
 */
export async function getFieldReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]> {
  const supabase = await createServerSupabaseClient()

  // Get system templates from code
  const systemTemplates = getSystemTemplatesAsRows()

  // Get user-created templates from DB (non-system only)
  const { data: userTemplates, error } = await supabase
    .from("field_report_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_system", false)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`Failed to get user templates: ${error.message}`)
  }

  // Combine: system templates first, then user templates
  return [...systemTemplates, ...(userTemplates as FieldReportTemplateRow[])]
}

/**
 * Get a single field report template by ID.
 * Handles both system templates (id starts with "system-") and DB templates.
 */
export async function getFieldReportTemplate(
  templateId: string
): Promise<FieldReportTemplateRow | null> {
  // Handle system templates (synthetic IDs like "system-quick-log")
  if (templateId.startsWith("system-")) {
    const slug = templateId.replace("system-", "")
    if (isSystemTemplate(slug)) {
      return systemTemplateToRow(slug as SystemTemplateSlug)
    }
    return null
  }

  // Handle DB templates
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .select("*")
    .eq("id", templateId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get template: ${error.message}`)
  }

  return data as FieldReportTemplateRow
}

// ============================================
// Custom Field Report Templates (User-created)
// ============================================

/**
 * Create a new custom field report template for a user.
 * Sets is_system to false to distinguish from system templates.
 */
export async function createCustomReportTemplate(
  template: FieldReportTemplateInsert
): Promise<FieldReportTemplateRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .insert({
      ...template,
      is_system: false, // Always false for user-created templates
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create custom report template: ${error.message}`)
  }

  return data as FieldReportTemplateRow
}

/**
 * Get all custom report templates for a specific user.
 * Only returns non-system templates owned by the user.
 */
export async function getUserCustomReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_system", false)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get custom report templates: ${error.message}`)
  }

  return data as FieldReportTemplateRow[]
}

/**
 * Get a single custom report template by ID.
 * Only returns if the template belongs to the user.
 */
export async function getCustomReportTemplate(
  templateId: string,
  userId: string
): Promise<FieldReportTemplateRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("is_system", false)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    throw new Error(`Failed to get custom report template: ${error.message}`)
  }

  return data as FieldReportTemplateRow
}

/**
 * Update a custom report template.
 * Only allows updating templates owned by the user.
 */
export async function updateCustomReportTemplate(
  templateId: string,
  userId: string,
  updates: FieldReportTemplateUpdate
): Promise<FieldReportTemplateRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("is_system", false)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Template not found or access denied")
    }
    throw new Error(`Failed to update custom report template: ${error.message}`)
  }

  return data as FieldReportTemplateRow
}

/**
 * Delete a custom report template.
 * Only allows deleting templates owned by the user.
 */
export async function deleteCustomReportTemplate(
  templateId: string,
  userId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error, count } = await supabase
    .from("field_report_templates")
    .delete({ count: "exact" })
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("is_system", false)

  if (error) {
    throw new Error(`Failed to delete custom report template: ${error.message}`)
  }

  if (count === 0) {
    throw new Error("Template not found or access denied")
  }
}

// ============================================
// Field Reports
// ============================================

export async function createFieldReport(report: FieldReportInsert): Promise<FieldReportRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .insert(report)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create field report: ${error.message}`)
  }

  return data as FieldReportRow
}

export async function updateFieldReport(
  reportId: string,
  updates: FieldReportUpdate
): Promise<FieldReportRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .update(updates)
    .eq("id", reportId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update field report: ${error.message}`)
  }

  return data as FieldReportRow
}

export async function getUserFieldReports(
  userId: string,
  limit = 20,
  offset = 0
): Promise<FieldReportRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", false)
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to get field reports: ${error.message}`)
  }

  return data as FieldReportRow[]
}

export async function getDraftFieldReports(userId: string, limit?: number): Promise<FieldReportRow[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("field_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", true)
    .order("updated_at", { ascending: false })

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get draft reports: ${error.message}`)
  }

  return data as FieldReportRow[]
}

export async function getFieldReport(reportId: string): Promise<FieldReportRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .select("*")
    .eq("id", reportId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get field report: ${error.message}`)
  }

  return data as FieldReportRow
}

export async function deleteFieldReport(reportId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error, count } = await supabase
    .from("field_reports")
    .delete({ count: "exact" })
    .eq("id", reportId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete field report: ${error.message}`)
  }

  if (count === 0) {
    throw new Error("Report not found or access denied")
  }
}

export async function getMostRecentlyUsedTemplateId(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .select("template_id")
    .eq("user_id", userId)
    .eq("is_draft", false)
    .not("template_id", "is", null)
    .order("reported_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No reports found is not an error
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get recently used template: ${error.message}`)
  }

  return data?.template_id || null
}

export async function getFavoriteTemplateIds(userId: string): Promise<string[]> {
  const stats = await getOrCreateUserTrackingStats(userId)
  return stats.favorite_template_ids || []
}

export async function addFavoriteTemplate(userId: string, templateId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const stats = await getOrCreateUserTrackingStats(userId)
  const currentFavorites = stats.favorite_template_ids || []

  // Check if already at max (3)
  if (currentFavorites.length >= 3) {
    throw new Error("Maximum of 3 favorite templates allowed")
  }

  // Check if already favorited
  if (currentFavorites.includes(templateId)) {
    return currentFavorites
  }

  const newFavorites = [...currentFavorites, templateId]

  const { error } = await supabase
    .from("user_tracking_stats")
    .update({ favorite_template_ids: newFavorites, updated_at: new Date().toISOString() })
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to add favorite template: ${error.message}`)
  }

  return newFavorites
}

export async function removeFavoriteTemplate(userId: string, templateId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const stats = await getOrCreateUserTrackingStats(userId)
  const currentFavorites = stats.favorite_template_ids || []

  const newFavorites = currentFavorites.filter(id => id !== templateId)

  const { error } = await supabase
    .from("user_tracking_stats")
    .update({ favorite_template_ids: newFavorites, updated_at: new Date().toISOString() })
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to remove favorite template: ${error.message}`)
  }

  return newFavorites
}

// ============================================
// Review Templates
// ============================================

export async function getReviewTemplates(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string,
  reviewType?: ReviewType
): Promise<ReviewTemplateRow[]> {
  // System review templates are served from code (same pattern as field report templates)
  const systemTemplates = getSystemReviewTemplatesAsRows(reviewType)

  // TODO: When user-created review templates are supported, fetch from DB here
  // For now, just return system templates
  return systemTemplates
}

// ============================================
// Reviews
// ============================================

export async function createReview(review: ReviewInsert): Promise<ReviewRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("reviews")
    .insert(review)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`)
  }

  return data as ReviewRow
}

export async function updateReview(
  reviewId: string,
  updates: ReviewUpdate
): Promise<ReviewRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", reviewId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update review: ${error.message}`)
  }

  return data as ReviewRow
}

export async function getUserReviews(
  userId: string,
  reviewType?: ReviewType,
  limit = 20
): Promise<ReviewRow[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", false)

  if (reviewType) {
    query = query.eq("review_type", reviewType)
  }

  const { data, error } = await query
    .order("period_end", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get reviews: ${error.message}`)
  }

  return data as ReviewRow[]
}

export async function getLatestCommitment(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("reviews")
    .select("new_commitment")
    .eq("user_id", userId)
    .eq("is_draft", false)
    .not("new_commitment", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get commitment: ${error.message}`)
  }

  return data?.new_commitment ?? null
}

// ============================================
// User Tracking Stats
// ============================================

export async function getUserTrackingStats(
  userId: string
): Promise<UserTrackingStatsRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_tracking_stats")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get tracking stats: ${error.message}`)
  }

  return data as UserTrackingStatsRow
}

export async function getOrCreateUserTrackingStats(
  userId: string
): Promise<UserTrackingStatsRow> {
  let stats = await getUserTrackingStats(userId)

  if (!stats) {
    // Use admin client - user_tracking_stats is system-only (no user INSERT policy)
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from("user_tracking_stats")
      .insert({ user_id: userId })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create tracking stats: ${error.message}`)
    }

    stats = data as UserTrackingStatsRow
  }

  return stats
}

export async function updateUserTrackingStats(
  userId: string,
  updates: UserTrackingStatsUpdate
): Promise<UserTrackingStatsRow> {
  // Use admin client - user_tracking_stats is system-only (no user UPDATE policy)
  const supabase = createAdminSupabaseClient()

  // Ensure stats record exists
  await getOrCreateUserTrackingStats(userId)

  const { data, error } = await supabase
    .from("user_tracking_stats")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tracking stats: ${error.message}`)
  }

  return data as UserTrackingStatsRow
}

/**
 * Count the number of submitted monthly reviews for a user (CRUD query).
 */
export async function countMonthlyReviews(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("review_type", "monthly")
    .eq("is_draft", false)

  return count ?? 0
}

/**
 * Get the average approach quality for a user in the current week.
 * Returns rounded integer (1-10) or 0 if no rated approaches.
 */
export async function getWeeklyApproachQualityAvg(
  userId: string,
  weekStart: string
): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("approaches")
    .select("quality")
    .eq("user_id", userId)
    .not("quality", "is", null)
    .gte("timestamp", weekStart)

  if (error) {
    throw new Error(`Failed to get approach quality avg: ${error.message}`)
  }

  if (!data || data.length === 0) return 0

  const sum = data.reduce((acc, row) => acc + (row.quality as number), 0)
  return Math.round(sum / data.length)
}

// ============================================
// Milestones
// ============================================

export async function checkAndAwardMilestone(
  userId: string,
  milestoneType: MilestoneType,
  value?: number
): Promise<MilestoneRow | null> {
  // Use admin client - milestones is system-only (no user INSERT policy)
  const supabase = createAdminSupabaseClient()

  // Check if already achieved
  const { data: existing } = await supabase
    .from("milestones")
    .select("id")
    .eq("user_id", userId)
    .eq("milestone_type", milestoneType)
    .single()

  if (existing) return null

  // Award milestone
  const insert: MilestoneInsert = {
    user_id: userId,
    milestone_type: milestoneType,
    value,
  }

  const { data, error } = await supabase
    .from("milestones")
    .insert(insert)
    .select()
    .single()

  if (error) {
    // Unique constraint violation is fine (race condition)
    if (error.code === "23505") return null
    throw new Error(`Failed to award milestone: ${error.message}`)
  }

  return data as MilestoneRow
}

/**
 * Batch check and award multiple milestones in 2 queries instead of 2*N queries.
 * 1. Single SELECT to get all existing milestones for user
 * 2. Single bulk INSERT for any new milestones
 */
export async function checkAndAwardMilestones(
  userId: string,
  milestones: Array<{ type: MilestoneType; value?: number }>,
  sessionId?: string
): Promise<MilestoneRow[]> {
  if (milestones.length === 0) return []

  const supabase = createAdminSupabaseClient()

  // Single query to get all existing milestone types for this user
  const { data: existing, error: selectError } = await supabase
    .from("milestones")
    .select("milestone_type")
    .eq("user_id", userId)
    .in("milestone_type", milestones.map(m => m.type))

  if (selectError) {
    throw new Error(`Failed to check milestones: ${selectError.message}`)
  }

  const existingTypes = new Set((existing || []).map(m => m.milestone_type))

  // Filter out already-achieved milestones
  const toAward = milestones.filter(m => !existingTypes.has(m.type))

  if (toAward.length === 0) return []

  // Single bulk insert for new milestones
  const inserts: MilestoneInsert[] = toAward.map(m => ({
    user_id: userId,
    milestone_type: m.type,
    value: m.value,
    session_id: sessionId,
  }))

  const { data, error: insertError } = await supabase
    .from("milestones")
    .insert(inserts)
    .select()

  if (insertError) {
    // Unique constraint violations are fine (race condition)
    if (insertError.code === "23505") return []
    throw new Error(`Failed to award milestones: ${insertError.message}`)
  }

  return (data || []) as MilestoneRow[]
}

export async function getUserMilestones(userId: string, limit?: number): Promise<MilestoneRow[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("milestones")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false })

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get milestones: ${error.message}`)
  }

  return data as MilestoneRow[]
}

// ============================================
// Sticking Points
// ============================================

export async function createStickingPoint(
  point: StickingPointInsert
): Promise<StickingPointRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sticking_points")
    .insert(point)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create sticking point: ${error.message}`)
  }

  return data as StickingPointRow
}

export async function updateStickingPoint(
  pointId: string,
  updates: StickingPointUpdate
): Promise<StickingPointRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("sticking_points")
    .update(updates)
    .eq("id", pointId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update sticking point: ${error.message}`)
  }

  return data as StickingPointRow
}

export async function getUserStickingPoints(
  userId: string,
  status?: StickingPointRow["status"]
): Promise<StickingPointRow[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase.from("sticking_points").select("*").eq("user_id", userId)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get sticking points: ${error.message}`)
  }

  return data as StickingPointRow[]
}

// ============================================
// Analytics / Stats
// ============================================

export async function getDailyStats(
  userId: string,
  days = 30
): Promise<DailyStats[]> {
  const supabase = await createServerSupabaseClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from("approaches")
    .select("timestamp, outcome")
    .eq("user_id", userId)
    .gte("timestamp", startDate.toISOString())
    .order("timestamp", { ascending: true })

  if (error) {
    throw new Error(`Failed to get daily stats: ${error.message}`)
  }

  // Group by date
  const byDate: Record<string, DailyStats> = {}

  for (const approach of data) {
    const date = approach.timestamp.split("T")[0]
    if (!byDate[date]) {
      byDate[date] = {
        date,
        approaches: 0,
        sessions: 0,
        numbers: 0,
        instadates: 0,
      }
    }
    byDate[date].approaches++
    if (approach.outcome === "number") byDate[date].numbers++
    if (approach.outcome === "instadate") byDate[date].instadates++
  }

  // Fill in missing days
  const result: DailyStats[] = []
  const current = new Date(startDate)
  const today = new Date()

  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0]
    result.push(
      byDate[dateStr] || {
        date: dateStr,
        approaches: 0,
        sessions: 0,
        numbers: 0,
        instadates: 0,
      }
    )
    current.setDate(current.getDate() + 1)
  }

  return result
}

export interface SessionIntentionSuggestions {
  sessionFocus: string[]
  techniqueFocus: string[]
  locations: string[]
}

export async function getSessionIntentionSuggestions(
  userId: string
): Promise<SessionIntentionSuggestions> {
  const supabase = await createServerSupabaseClient()

  // Get all completed sessions with intentions
  const { data, error } = await supabase
    .from("sessions")
    .select("session_focus, technique_focus, primary_location")
    .eq("user_id", userId)
    .eq("is_active", false)
    .order("started_at", { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to get session intentions: ${error.message}`)
  }

  // Extract unique non-empty values, most recent first
  const sessionFocusSet = new Set<string>()
  const techniqueFocusSet = new Set<string>()
  const locationsSet = new Set<string>()

  for (const session of data || []) {
    if (session.session_focus) sessionFocusSet.add(session.session_focus)
    if (session.technique_focus) techniqueFocusSet.add(session.technique_focus)
    if (session.primary_location) locationsSet.add(session.primary_location)
  }

  return {
    sessionFocus: Array.from(sessionFocusSet).slice(0, 10),
    techniqueFocus: Array.from(techniqueFocusSet).slice(0, 10),
    locations: Array.from(locationsSet).slice(0, 10),
  }
}

export async function getApproachesPerHour(
  userId: string,
  sessionId?: string
): Promise<number> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("approaches")
    .select("timestamp")
    .eq("user_id", userId)

  if (sessionId) {
    query = query.eq("session_id", sessionId)
  }

  const { data, error } = await query.order("timestamp", { ascending: true })

  if (error || !data || data.length < 2) {
    return 0
  }

  const first = new Date(data[0].timestamp)
  const last = new Date(data[data.length - 1].timestamp)
  const hours = (last.getTime() - first.getTime()) / (1000 * 60 * 60)

  if (hours < 0.1) return data.length // Less than 6 minutes, just return count

  return Math.round((data.length / hours) * 10) / 10
}
