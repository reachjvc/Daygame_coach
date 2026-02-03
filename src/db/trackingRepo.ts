import { createServerSupabaseClient } from "./supabase"

// Helper to get ISO week string (e.g., "2026-W04")
export function getISOWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Set to nearest Thursday: current date + 4 - current day number
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

// Helper to check if two ISO weeks are consecutive
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

// Helper to check if a week qualifies as "active" (2+ sessions OR 5+ approaches)
export function isWeekActive(sessions: number, approaches: number): boolean {
  return sessions >= 2 || approaches >= 5
}

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

export async function endSession(sessionId: string): Promise<SessionRow> {
  // Get session with approaches to calculate summary
  const session = await getSessionWithApproaches(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }

  const endedAt = new Date()
  const startedAt = new Date(session.started_at)
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

  const totalApproaches = session.approaches.length
  const goalMet = session.goal ? totalApproaches >= session.goal : false

  const updatedSession = await updateSession(sessionId, {
    ended_at: endedAt.toISOString(),
    is_active: false,
    duration_minutes: durationMinutes,
    total_approaches: totalApproaches,
    goal_met: goalMet,
  })

  // Update session-related stats and milestones
  await updateSessionStats(session.user_id, {
    approachCount: totalApproaches,
    goalMet,
    durationMinutes,
    startHour: startedAt.getHours(),
    location: session.primary_location,
  })

  return updatedSession
}

// Called when a session ends to update stats and check milestones
async function updateSessionStats(
  userId: string,
  sessionInfo: {
    approachCount: number
    goalMet: boolean
    durationMinutes: number
    startHour: number
    location: string | null
  }
): Promise<void> {
  const stats = await getOrCreateUserTrackingStats(userId)
  const currentWeek = getISOWeekString(new Date())

  // Track weekly sessions
  let weeklySessions = stats.current_week_sessions || 0
  if (stats.current_week === currentWeek) {
    weeklySessions++
  } else {
    // New week started, reset counter
    weeklySessions = 1
  }

  // Update unique locations
  let uniqueLocations = stats.unique_locations || []
  if (sessionInfo.location && !uniqueLocations.includes(sessionInfo.location)) {
    uniqueLocations = [...uniqueLocations, sessionInfo.location]
  }

  const newSessionCount = stats.total_sessions + 1

  await updateUserTrackingStats(userId, {
    total_sessions: newSessionCount,
    current_week: currentWeek,
    current_week_sessions: weeklySessions,
    unique_locations: uniqueLocations,
  })

  // Check and update weekly streak based on new criteria
  await checkAndUpdateWeeklyStreak(userId, currentWeek)

  // Check session milestones
  if (newSessionCount === 1) await checkAndAwardMilestone(userId, "first_session")
  if (newSessionCount === 3) await checkAndAwardMilestone(userId, "3_sessions")
  if (newSessionCount === 5) await checkAndAwardMilestone(userId, "5_sessions")
  if (newSessionCount === 10) await checkAndAwardMilestone(userId, "10_sessions")
  if (newSessionCount === 25) await checkAndAwardMilestone(userId, "25_sessions")
  if (newSessionCount === 50) await checkAndAwardMilestone(userId, "50_sessions")
  if (newSessionCount === 100) await checkAndAwardMilestone(userId, "100_sessions")

  // First 5+ approach session
  if (sessionInfo.approachCount >= 5) {
    await checkAndAwardMilestone(userId, "first_5_approach_session")
  }

  // First 10+ approach session
  if (sessionInfo.approachCount >= 10) {
    await checkAndAwardMilestone(userId, "first_10_approach_session")
  }

  // First goal hit
  if (sessionInfo.goalMet) {
    await checkAndAwardMilestone(userId, "first_goal_hit")
  }

  // Marathon (2+ hour session)
  if (sessionInfo.durationMinutes >= 120) {
    await checkAndAwardMilestone(userId, "marathon")
  }

  // Night owl (session started after 9pm)
  if (sessionInfo.startHour >= 21) {
    await checkAndAwardMilestone(userId, "night_owl")
  }

  // Early bird (session started before 10am)
  if (sessionInfo.startHour < 10) {
    await checkAndAwardMilestone(userId, "early_bird")
  }

  // Weekend warrior (session on Sat/Sun)
  const dayOfWeek = new Date().getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    await checkAndAwardMilestone(userId, "weekend_warrior")
  }

  // Globetrotter (5 different locations)
  if (uniqueLocations.length >= 5) {
    await checkAndAwardMilestone(userId, "globetrotter")
  }
}

// Check if current week is "active" and update weekly streak accordingly
// A week is active if: 2+ sessions OR 5+ approaches
async function checkAndUpdateWeeklyStreak(
  userId: string,
  currentWeek: string
): Promise<void> {
  const stats = await getUserTrackingStats(userId)
  if (!stats) return

  const weeklySessions = stats.current_week_sessions || 0
  const weeklyApproaches = stats.current_week_approaches || 0
  const lastActiveWeek = stats.last_active_week

  // Check if this week qualifies as active
  if (!isWeekActive(weeklySessions, weeklyApproaches)) {
    return // Week not yet active, no streak update
  }

  // Week is active - check if we already counted it
  if (lastActiveWeek === currentWeek) {
    return // Already counted this week
  }

  // Calculate new streak
  let newWeekStreak: number
  if (lastActiveWeek && areWeeksConsecutive(lastActiveWeek, currentWeek)) {
    // Consecutive active week
    newWeekStreak = (stats.current_week_streak || 0) + 1
  } else {
    // First active week or gap in streak
    newWeekStreak = 1
  }

  await updateUserTrackingStats(userId, {
    current_week_streak: newWeekStreak,
    longest_week_streak: Math.max(stats.longest_week_streak || 0, newWeekStreak),
    last_active_week: currentWeek,
  })

  // Check weekly streak milestones
  if (newWeekStreak === 2) await checkAndAwardMilestone(userId, "2_week_streak")
  if (newWeekStreak === 4) await checkAndAwardMilestone(userId, "4_week_streak")
  if (newWeekStreak === 8) await checkAndAwardMilestone(userId, "8_week_streak")
  if (newWeekStreak === 12) await checkAndAwardMilestone(userId, "12_week_streak")
  if (newWeekStreak === 26) await checkAndAwardMilestone(userId, "26_week_streak")
  if (newWeekStreak === 52) await checkAndAwardMilestone(userId, "52_week_streak")
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

export async function getSessionSummaries(
  userId: string,
  limit = 10
): Promise<SessionSummary[]> {
  const supabase = await createServerSupabaseClient()

  // Single query with embedded relation - fixes N+1 problem
  // Previously: 1 query for sessions + 2 queries per session = 11+ queries for 5 sessions
  // Now: 1 query total
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id,
      started_at,
      ended_at,
      duration_minutes,
      goal,
      goal_met,
      primary_location,
      approaches (
        outcome
      )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get session summaries: ${error.message}`)
  }

  // Transform the joined data into SessionSummary format
  return (data || []).map((session) => {
    const approaches = session.approaches || []

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

    return {
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      total_approaches: approaches.length,
      duration_minutes: session.duration_minutes,
      goal: session.goal,
      goal_met: session.goal_met,
      primary_location: session.primary_location,
      outcomes,
    }
  })
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

  // Update user stats
  await incrementApproachStats(approach.user_id, approach.outcome)

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

export async function getFieldReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_report_templates")
    .select("*")
    .or(`is_system.eq.true,user_id.eq.${userId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`Failed to get templates: ${error.message}`)
  }

  return data as FieldReportTemplateRow[]
}

export async function getFieldReportTemplate(
  templateId: string
): Promise<FieldReportTemplateRow | null> {
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

  // Update field report count and check milestones
  if (!report.is_draft) {
    const stats = await getOrCreateUserTrackingStats(report.user_id)
    const newCount = (stats.total_field_reports || 0) + 1
    await updateUserTrackingStats(report.user_id, { total_field_reports: newCount })

    if (newCount === 1) await checkAndAwardMilestone(report.user_id, "first_field_report")
    if (newCount === 10) await checkAndAwardMilestone(report.user_id, "10_field_reports")
    if (newCount === 25) await checkAndAwardMilestone(report.user_id, "25_field_reports")
    if (newCount === 50) await checkAndAwardMilestone(report.user_id, "50_field_reports")
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

export async function getDraftFieldReports(userId: string): Promise<FieldReportRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("field_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("is_draft", true)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get draft reports: ${error.message}`)
  }

  return data as FieldReportRow[]
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
  userId: string,
  reviewType?: ReviewType
): Promise<ReviewTemplateRow[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("review_templates")
    .select("*")
    .or(`is_system.eq.true,user_id.eq.${userId}`)

  if (reviewType) {
    query = query.eq("review_type", reviewType)
  }

  const { data, error } = await query
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`Failed to get review templates: ${error.message}`)
  }

  return data as ReviewTemplateRow[]
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

  // Update stats and check unlocks
  if (review.review_type === "weekly" && !review.is_draft) {
    await incrementWeeklyReviewCount(review.user_id)
    await checkAndAwardMilestone(review.user_id, "first_weekly_review")
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
    const supabase = await createServerSupabaseClient()

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
  const supabase = await createServerSupabaseClient()

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

async function incrementApproachStats(
  userId: string,
  outcome?: ApproachOutcome
): Promise<void> {
  const stats = await getOrCreateUserTrackingStats(userId)

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
  let weeklyApproaches = stats.current_week_approaches || 0
  if (stats.current_week === currentWeek) {
    weeklyApproaches++
  } else {
    // New week started, reset counter
    weeklyApproaches = 1
  }

  const updates: UserTrackingStatsUpdate = {
    total_approaches: stats.total_approaches + 1,
    last_approach_date: today,
    current_streak: newStreak,
    longest_streak: Math.max(stats.longest_streak, newStreak),
    current_week: currentWeek,
    current_week_approaches: weeklyApproaches,
  }

  let newNumbers = stats.total_numbers
  let newInstadates = stats.total_instadates

  if (outcome === "number") {
    newNumbers = stats.total_numbers + 1
    updates.total_numbers = newNumbers
  } else if (outcome === "instadate") {
    newInstadates = stats.total_instadates + 1
    updates.total_instadates = newInstadates
  }

  await updateUserTrackingStats(userId, updates)

  // Check if this approach makes the week "active" (5+ approaches)
  // and update weekly streak if needed
  await checkAndUpdateWeeklyStreak(userId, currentWeek)

  // Check approach milestones
  const newTotal = stats.total_approaches + 1
  if (newTotal === 1) await checkAndAwardMilestone(userId, "first_approach")
  if (newTotal === 5) await checkAndAwardMilestone(userId, "5_approaches")
  if (newTotal === 10) await checkAndAwardMilestone(userId, "10_approaches")
  if (newTotal === 25) await checkAndAwardMilestone(userId, "25_approaches")
  if (newTotal === 50) await checkAndAwardMilestone(userId, "50_approaches")
  if (newTotal === 100) await checkAndAwardMilestone(userId, "100_approaches")
  if (newTotal === 250) await checkAndAwardMilestone(userId, "250_approaches")
  if (newTotal === 500) await checkAndAwardMilestone(userId, "500_approaches")
  if (newTotal === 1000) await checkAndAwardMilestone(userId, "1000_approaches")

  // Number milestones
  if (outcome === "number") {
    if (newNumbers === 1) await checkAndAwardMilestone(userId, "first_number")
    if (newNumbers === 2) await checkAndAwardMilestone(userId, "2_numbers")
    if (newNumbers === 5) await checkAndAwardMilestone(userId, "5_numbers")
    if (newNumbers === 10) await checkAndAwardMilestone(userId, "10_numbers")
    if (newNumbers === 25) await checkAndAwardMilestone(userId, "25_numbers")
    if (newNumbers === 50) await checkAndAwardMilestone(userId, "50_numbers")
    if (newNumbers === 100) await checkAndAwardMilestone(userId, "100_numbers")
  }

  // Instadate milestones
  if (outcome === "instadate") {
    if (newInstadates === 1) await checkAndAwardMilestone(userId, "first_instadate")
    if (newInstadates === 2) await checkAndAwardMilestone(userId, "2_instadates")
    if (newInstadates === 5) await checkAndAwardMilestone(userId, "5_instadates")
    if (newInstadates === 10) await checkAndAwardMilestone(userId, "10_instadates")
    if (newInstadates === 25) await checkAndAwardMilestone(userId, "25_instadates")
  }

  // Legacy daily streak milestones (still award them)
  if (newStreak === 7) await checkAndAwardMilestone(userId, "7_day_streak")
  if (newStreak === 30) await checkAndAwardMilestone(userId, "30_day_streak")
  if (newStreak === 100) await checkAndAwardMilestone(userId, "100_day_streak")
}

async function incrementWeeklyReviewCount(userId: string): Promise<void> {
  const stats = await getOrCreateUserTrackingStats(userId)

  const newCount = stats.weekly_reviews_completed + 1

  const updates: UserTrackingStatsUpdate = {
    weekly_reviews_completed: newCount,
    current_weekly_streak: stats.current_weekly_streak + 1,
  }

  // Unlock monthly after 4 weekly reviews
  if (newCount >= 4 && !stats.monthly_review_unlocked) {
    updates.monthly_review_unlocked = true
    await checkAndAwardMilestone(userId, "monthly_unlocked")
  }

  await updateUserTrackingStats(userId, updates)
}

export async function incrementMonthlyReviewCount(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // Count monthly reviews
  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("review_type", "monthly")
    .eq("is_draft", false)

  // Unlock quarterly after 3 monthly reviews
  if (count !== null && count >= 3) {
    const stats = await getOrCreateUserTrackingStats(userId)
    if (!stats.quarterly_review_unlocked) {
      await updateUserTrackingStats(userId, { quarterly_review_unlocked: true })
      await checkAndAwardMilestone(userId, "quarterly_unlocked")
    }
  }
}

// ============================================
// Milestones
// ============================================

export async function checkAndAwardMilestone(
  userId: string,
  milestoneType: MilestoneType,
  value?: number
): Promise<MilestoneRow | null> {
  const supabase = await createServerSupabaseClient()

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

export async function getUserMilestones(userId: string): Promise<MilestoneRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false })

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
