/**
 * EVERY WRITE IN THE TRACKING REPO AND SERVICE, AGAINST THE REAL TRACKING TABLES.
 *
 * Plans/tests-catch-what-matters.md, Phase 4, group A. For each function that
 * writes tracking data, three questions, each answered from the database rows
 * and never from what the function returned:
 *
 *   1. The row as written: every field the function sets is there, with the value it was given.
 *   2. Somebody else's rows, created first, are byte-identical afterwards (compared as
 *      whole rows, every column, before and after).
 *   3. Delete, archive, reset: only the target rows change.
 *
 * Where the app calls the service (`trackingService`), the test goes through the
 * service, so what the user ends up with, counters and badges included, is what is checked.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import {
  abandonSession as repoAbandonSession,
  addFavoriteTemplate as repoAddFavoriteTemplate,
  createApproach as repoCreateApproach,
  createCustomReportTemplate as repoCreateCustomReportTemplate,
  createCustomReviewTemplate as repoCreateCustomReviewTemplate,
  createFieldReport as repoCreateFieldReport,
  createReview as repoCreateReview,
  createSession as repoCreateSession,
  createStickingPoint as repoCreateStickingPoint,
  deleteCustomReportTemplate as repoDeleteCustomReportTemplate,
  deleteCustomReviewTemplate as repoDeleteCustomReviewTemplate,
  deleteFieldReport as repoDeleteFieldReport,
  deleteSession as repoDeleteSession,
  getFavoriteTemplateIds as repoGetFavoriteTemplateIds,
  getOrCreateUserTrackingStats as repoGetOrCreateUserTrackingStats,
  insertMilestones,
  reactivateSession as repoReactivateSession,
  removeFavoriteTemplate as repoRemoveFavoriteTemplate,
  replaceUserTrackingStats,
  rollTrackingCounters,
  updateApproach as repoUpdateApproach,
  updateCustomReportTemplate as repoUpdateCustomReportTemplate,
  updateFieldReport as repoUpdateFieldReport,
  updateReview as repoUpdateReview,
  updateSession as repoUpdateSession,
  updateStickingPoint as repoUpdateStickingPoint,
  updateUserTrackingStats,
} from "@/src/db/trackingRepo"
import {
  abandonSession,
  addFavoriteTemplate,
  createApproach,
  createFieldReport,
  createReview,
  createSession,
  createStickingPoint,
  deleteCustomReportTemplate,
  deleteCustomReviewTemplate,
  deleteFieldReport,
  deleteSession,
  endSession,
  getFavoriteTemplateIds,
  getOrCreateUserTrackingStats,
  getTrackingStatsForDisplay,
  reactivateSession,
  removeFavoriteTemplate,
  saveCustomReportTemplate,
  saveCustomReviewTemplate,
  updateApproach,
  updateCustomReportTemplate,
  updateFieldReport,
  updateReview,
  updateSession,
  updateStickingPoint,
} from "@/src/tracking/trackingService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const iso = (value: unknown) => new Date(value as string).toISOString()

const OWNED_TABLES = [
  "sessions",
  "approaches",
  "field_reports",
  "field_report_templates",
  "review_templates",
  "reviews",
  "sticking_points",
  "milestones",
  "user_tracking_stats",
] as const

/** One row, every column, exactly as stored (numbers as numbers, timestamps as text). */
async function dbRow(table: string, id: string, key = "id"): Promise<Record<string, unknown>> {
  const rows = await asOwner((q) => q(`select to_jsonb(t) as r from public.${table} t where ${key} = $1`, [id]))
  expect(rows, `${table} ${id}`).toHaveLength(1)
  return rows[0].r as Record<string, unknown>
}

async function countWhere(table: string, userId: string): Promise<number> {
  const rows = await asOwner((q) => q(`select count(*)::int as n from public.${table} where user_id = $1`, [userId]))
  return rows[0].n as number
}

/** Every tracking row a user owns, every column, as one string. */
async function snapshot(userId: string): Promise<string> {
  const all: Record<string, unknown> = {}
  for (const table of OWNED_TABLES) {
    all[table] = (
      await asOwner((q) =>
        q(
          `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), '[]'::jsonb) as rows
             from public.${table} t where user_id = $1`,
          [userId]
        )
      )
    )[0].rows
  }
  return JSON.stringify(all)
}

interface Bystander {
  user: TestUser
  sessionId: string
  approachId: string
  reportId: string
  reportTemplateId: string
  reviewTemplateId: string
  reviewId: string
  pointId: string
  /** The bystander's rows, as they were before the test acted. */
  before: string
  /** Fails if a single column of a single row of theirs changed. */
  stillUntouched: () => Promise<void>
}

/**
 * ANOTHER PERSON, WITH A ROW IN EVERY TRACKING TABLE, MADE FIRST.
 * `stillUntouched()` is the claim every test ends on.
 */
async function bystander(): Promise<Bystander> {
  const user = await newUser("bystander")
  actAs(user)
  const session = await createSession({ user_id: user.id, started_at: minutesAgo(300), goal: 2, primary_location: "Elsewhere" })
  const approach = await createApproach({ user_id: user.id, session_id: session.id, outcome: "good", note: "theirs" })
  await endSession(session.id)
  const report = await createFieldReport({ user_id: user.id, title: "Theirs", fields: { went_well: "theirs" } })
  const reportTemplate = await repoCreateCustomReportTemplate({
    user_id: user.id,
    name: "Theirs",
    slug: "theirs",
    static_fields: [],
    dynamic_fields: [],
  })
  const reviewTemplate = await repoCreateCustomReviewTemplate({
    user_id: user.id,
    name: "Their review",
    slug: "their-review",
    review_type: "weekly",
    static_fields: [],
    dynamic_fields: [],
  })
  const review = await createReview({
    user_id: user.id,
    review_type: "weekly",
    fields: { a: "theirs" },
    period_start: "2026-03-02",
    period_end: "2026-03-08",
  })
  const point = await createStickingPoint({ user_id: user.id, name: "Their point" })
  await addFavoriteTemplate(user.id, "their-favourite")
  const before = await snapshot(user.id)
  return {
    user,
    sessionId: session.id,
    approachId: approach.id,
    reportId: report.id,
    reportTemplateId: reportTemplate.id,
    reviewTemplateId: reviewTemplate.id,
    reviewId: review.id,
    pointId: point.id,
    before,
    stillUntouched: async () => {
      expect(await snapshot(user.id)).toBe(before)
    },
  }
}

/** A signed-in person who has not been given anything yet. */
async function person(label: string): Promise<TestUser> {
  const user = await newUser(label)
  actAs(user)
  return user
}

describe("a session", () => {
  it("createSession (repo + service) stores every field it is given, for the person it names", async () => {
    const other = await bystander()
    const me = await person("session-create")

    const made = await createSession({
      user_id: me.id,
      started_at: "2026-02-03T18:00:00.000Z",
      goal: 5,
      primary_location: "Soho",
      location_data: { city: "London" },
      session_focus: "openers",
      technique_focus: "direct",
      if_then_plan: "if I hesitate then I count to three",
      custom_intention: "stay present",
      pre_session_mood: 4,
      with_wingman: true,
      wingman_name: "Sam",
    })
    const viaRepo = await repoCreateSession({ user_id: me.id, goal: 1 })

    const row = await dbRow("sessions", made.id)
    expect(row).toMatchObject({
      user_id: me.id,
      goal: 5,
      primary_location: "Soho",
      location_data: { city: "London" },
      session_focus: "openers",
      technique_focus: "direct",
      if_then_plan: "if I hesitate then I count to three",
      custom_intention: "stay present",
      pre_session_mood: 4,
      with_wingman: true,
      wingman_name: "Sam",
      is_active: true,
      goal_met: false,
      total_approaches: 0,
      ended_at: null,
      end_reason: null,
    })
    expect(iso(row.started_at)).toBe("2026-02-03T18:00:00.000Z")
    expect(await dbRow("sessions", viaRepo.id)).toMatchObject({ user_id: me.id, goal: 1 })
    await other.stillUntouched()
  })

  it("updateSession (repo + service) changes the fields named, leaves the rest, and recounts what the session earned", async () => {
    const other = await bystander()
    const me = await person("session-update")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(90), goal: 3, primary_location: "Soho" })
    await createApproach({ user_id: me.id, session_id: session.id, outcome: "number" })
    const ended = await endSession(session.id)
    const untouchedBefore = await dbRow("sessions", session.id)

    await updateSession(session.id, { primary_location: "Camden", goal: 1, session_focus: "eye contact", pre_session_mood: 2 })

    const row = await dbRow("sessions", session.id)
    expect(row).toMatchObject({ primary_location: "Camden", goal: 1, session_focus: "eye contact", pre_session_mood: 2 })
    expect(row).toMatchObject({
      is_active: false,
      end_reason: "completed",
      total_approaches: 1,
      duration_minutes: ended.duration_minutes,
      goal_met: untouchedBefore.goal_met,
      user_id: me.id,
    })
    expect(iso(row.started_at)).toBe(iso(untouchedBefore.started_at))
    // the service recounted: the corrected location is now the one counted
    const stats = await dbRow("user_tracking_stats", me.id, "user_id")
    expect(stats.unique_locations).toEqual(["Camden"])

    await repoUpdateSession(session.id, { with_wingman: true, wingman_name: "Alex" })
    expect(await dbRow("sessions", session.id)).toMatchObject({ with_wingman: true, wingman_name: "Alex", primary_location: "Camden" })

    // somebody else's session cannot be changed by id
    actAs(me)
    await expect(updateSession(other.sessionId, { primary_location: "Hijacked" })).rejects.toThrow(/Failed to update session/)
    await expect(repoUpdateSession(other.sessionId, { goal: 99 })).rejects.toThrow(/Failed to update session/)
    await other.stillUntouched()
  })

  it("endSession (service) writes the ending of that session only, and the counters and badges that follow", async () => {
    const other = await bystander()
    const me = await person("session-end")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(30), goal: 2 })
    const spare = await createSession({ user_id: me.id, started_at: minutesAgo(1000) })
    await createApproach({ user_id: me.id, session_id: session.id, outcome: "number" })
    await createApproach({ user_id: me.id, session_id: session.id, outcome: "good" })
    const spareBefore = await dbRow("sessions", spare.id)

    await endSession(session.id)

    const row = await dbRow("sessions", session.id)
    expect(row).toMatchObject({ is_active: false, end_reason: "completed", goal_met: true, total_approaches: 2 })
    expect(row.ended_at).not.toBeNull()
    expect(row.duration_minutes).toBeGreaterThanOrEqual(29)
    expect(row.duration_minutes).toBeLessThanOrEqual(31)
    expect(await dbRow("sessions", spare.id)).toEqual(spareBefore)
    const stats = await dbRow("user_tracking_stats", me.id, "user_id")
    expect(stats).toMatchObject({ total_sessions: 1, total_approaches: 2, total_numbers: 1 })
    const badges = await asOwner((q) => q("select milestone_type from public.milestones where user_id = $1", [me.id]))
    expect(badges.map((b) => b.milestone_type)).toEqual(expect.arrayContaining(["first_session", "first_number"]))
    await other.stillUntouched()
  })

  it("abandonSession (repo + service) closes that session as abandoned and leaves counters, badges and other sessions alone", async () => {
    const other = await bystander()
    const me = await person("session-abandon")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(20), goal: 1 })
    await createApproach({ user_id: me.id, session_id: session.id, outcome: "good" })
    const sibling = await createSession({ user_id: me.id, started_at: minutesAgo(500) })
    const siblingBefore = await dbRow("sessions", sibling.id)
    const statsBefore = await snapshotOne("user_tracking_stats", me.id)
    const badgesBefore = await countWhere("milestones", me.id)

    await abandonSession(session.id)

    const row = await dbRow("sessions", session.id)
    expect(row).toMatchObject({ is_active: false, end_reason: "abandoned", total_approaches: 1, goal_met: false })
    expect(row.ended_at).not.toBeNull()
    expect(row.duration_minutes).toBeGreaterThanOrEqual(19)
    expect(row.duration_minutes).toBeLessThanOrEqual(21)
    expect(await dbRow("sessions", sibling.id)).toEqual(siblingBefore)
    expect(await snapshotOne("user_tracking_stats", me.id)).toBe(statsBefore)
    expect(await countWhere("milestones", me.id)).toBe(badgesBefore)

    const second = await createSession({ user_id: me.id, started_at: minutesAgo(10) })
    await repoAbandonSession(second.id)
    expect(await dbRow("sessions", second.id)).toMatchObject({ is_active: false, end_reason: "abandoned" })

    await expect(abandonSession(other.sessionId)).rejects.toThrow("Session not found")
    await other.stillUntouched()
  })

  it("reactivateSession (repo + service) opens that session again, clears how it ended, and keeps its counts", async () => {
    const other = await bystander()
    const me = await person("session-reactivate")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(60), goal: 1 })
    await createApproach({ user_id: me.id, session_id: session.id, outcome: "number" })
    await endSession(session.id)
    const sibling = await createSession({ user_id: me.id, started_at: minutesAgo(900) })
    await endSession(sibling.id)
    const siblingBefore = await dbRow("sessions", sibling.id)
    const finished = await dbRow("sessions", session.id)

    await reactivateSession(session.id)

    const row = await dbRow("sessions", session.id)
    expect(row).toMatchObject({
      is_active: true,
      ended_at: null,
      end_reason: null,
      total_approaches: 1,
      goal_met: true,
      duration_minutes: finished.duration_minutes,
    })
    expect(await dbRow("sessions", sibling.id)).toEqual(siblingBefore)
    // the counters follow: the reopened session no longer counts as finished
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_sessions: 1 })

    await endSession(session.id)
    await repoReactivateSession(session.id)
    expect(await dbRow("sessions", session.id)).toMatchObject({ is_active: true, end_reason: null, ended_at: null })

    await expect(reactivateSession(other.sessionId)).rejects.toThrow("Session not found")
    await other.stillUntouched()
  })

  it("deleteSession (repo + service) removes that session and its approaches only, and the counters go down", async () => {
    const other = await bystander()
    const me = await person("session-delete")
    const doomed = await createSession({ user_id: me.id, started_at: minutesAgo(200) })
    const kept = await createSession({ user_id: me.id, started_at: minutesAgo(100) })
    const doomedApproach = await createApproach({ user_id: me.id, session_id: doomed.id, outcome: "number" })
    const keptApproach = await createApproach({ user_id: me.id, session_id: kept.id, outcome: "good" })
    const looseApproach = await createApproach({ user_id: me.id, outcome: "short" })
    await endSession(doomed.id)
    await endSession(kept.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_sessions: 2, total_approaches: 3 })
    const keptBefore = await dbRow("sessions", kept.id)
    const keptApproachBefore = await dbRow("approaches", keptApproach.id)
    const looseBefore = await dbRow("approaches", looseApproach.id)

    await deleteSession(doomed.id, me.id)

    expect(await asOwner((q) => q("select id from public.sessions where id = $1", [doomed.id]))).toEqual([])
    expect(await asOwner((q) => q("select id from public.approaches where id = $1", [doomedApproach.id]))).toEqual([])
    expect(await dbRow("sessions", kept.id)).toEqual(keptBefore)
    expect(await dbRow("approaches", keptApproach.id)).toEqual(keptApproachBefore)
    expect(await dbRow("approaches", looseApproach.id)).toEqual(looseBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_sessions: 1, total_approaches: 2, total_numbers: 0 })

    const viaRepo = await createSession({ user_id: me.id })
    await repoDeleteSession(viaRepo.id, me.id)
    expect(await asOwner((q) => q("select id from public.sessions where id = $1", [viaRepo.id]))).toEqual([])

    await expect(deleteSession(other.sessionId, me.id)).rejects.toThrow("Session not found or access denied")
    await expect(deleteSession(other.sessionId, other.user.id)).rejects.toThrow("Session not found or access denied")
    await expect(repoDeleteSession(other.sessionId, me.id)).rejects.toThrow("Session not found or access denied")
    await other.stillUntouched()
  })
})

async function snapshotOne(table: string, userId: string): Promise<string> {
  const rows = await asOwner((q) =>
    q(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), '[]'::jsonb) as rows from public.${table} t where user_id = $1`, [userId])
  )
  return JSON.stringify(rows[0].rows)
}

describe("an approach", () => {
  it("createApproach (repo + service) stores every field, counts it on its session, and counts it in the totals", async () => {
    const other = await bystander()
    const me = await person("approach-create")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(40) })
    const otherSession = await createSession({ user_id: me.id, started_at: minutesAgo(900) })
    const otherSessionBefore = await dbRow("sessions", otherSession.id)

    const made = await createApproach({
      user_id: me.id,
      session_id: session.id,
      timestamp: "2026-04-01T20:15:00.000Z",
      outcome: "number",
      tags: ["cafe", "direct"],
      mood: 4,
      latitude: 51.5136,
      longitude: -0.1365,
      note: "She laughed",
      voice_note_url: "https://example.test/voice.m4a",
      set_type: "solo",
      quality: 8,
    })
    await repoCreateApproach({ user_id: me.id, session_id: session.id, outcome: "blowout" })

    const row = await dbRow("approaches", made.id)
    expect(row).toMatchObject({
      user_id: me.id,
      session_id: session.id,
      outcome: "number",
      tags: ["cafe", "direct"],
      mood: 4,
      latitude: 51.5136,
      longitude: -0.1365,
      note: "She laughed",
      voice_note_url: "https://example.test/voice.m4a",
      set_type: "solo",
      quality: 8,
    })
    expect(iso(row.timestamp)).toBe("2026-04-01T20:15:00.000Z")
    expect(await dbRow("sessions", session.id)).toMatchObject({ total_approaches: 2 })
    expect(await dbRow("sessions", otherSession.id)).toEqual(otherSessionBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_approaches: 2, total_numbers: 1 })

    // for somebody else's session: refused, and nothing of theirs moves
    await expect(createApproach({ user_id: me.id, session_id: other.sessionId, outcome: "good" })).rejects.toThrow()
    await expect(createApproach({ user_id: other.user.id, outcome: "good" })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("updateApproach (repo + service) changes the fields named on that approach only, and the numbers total catches up", async () => {
    const other = await bystander()
    const me = await person("approach-update")
    const session = await createSession({ user_id: me.id, started_at: minutesAgo(40) })
    const target = await createApproach({ user_id: me.id, session_id: session.id, outcome: "good", note: "first", quality: 5 })
    const sibling = await createApproach({ user_id: me.id, session_id: session.id, outcome: "short", note: "sibling" })
    const siblingBefore = await dbRow("approaches", sibling.id)
    const before = await dbRow("approaches", target.id)

    await updateApproach(target.id, { outcome: "number", note: "she gave it", tags: ["late"], mood: 5, quality: 9 })

    const row = await dbRow("approaches", target.id)
    expect(row).toMatchObject({ outcome: "number", note: "she gave it", tags: ["late"], mood: 5, quality: 9 })
    expect(row).toMatchObject({ user_id: me.id, session_id: session.id })
    expect(iso(row.timestamp)).toBe(iso(before.timestamp))
    expect(await dbRow("approaches", sibling.id)).toEqual(siblingBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_numbers: 1 })

    await repoUpdateApproach(target.id, { set_type: "group" })
    expect(await dbRow("approaches", target.id)).toMatchObject({ set_type: "group", outcome: "number" })

    await expect(updateApproach(other.approachId, { note: "Hijacked" })).rejects.toThrow(/Failed to update approach/)
    await expect(repoUpdateApproach(other.approachId, { outcome: "instadate" })).rejects.toThrow(/Failed to update approach/)
    await other.stillUntouched()
  })
})

describe("a field report", () => {
  it("createFieldReport (repo + service) stores every field and counts the report", async () => {
    const other = await bystander()
    const me = await person("report-create")
    const session = await createSession({ user_id: me.id })

    const made = await createFieldReport({
      user_id: me.id,
      session_id: session.id,
      system_template_slug: "quick-log",
      fields: { went_well: "Opened fast.", improve: "Slow down" },
      approach_count: 6,
      location: "Camden",
      tags: ["evening"],
      is_draft: false,
      reported_at: "2026-05-04T21:00:00.000Z",
      title: "Tuesday night",
    })
    const draft = await repoCreateFieldReport({ user_id: me.id, fields: { went_well: "half" }, is_draft: true })

    expect(await dbRow("field_reports", made.id)).toMatchObject({
      user_id: me.id,
      session_id: session.id,
      template_id: null,
      system_template_slug: "quick-log",
      fields: { went_well: "Opened fast.", improve: "Slow down" },
      approach_count: 6,
      location: "Camden",
      tags: ["evening"],
      is_draft: false,
      title: "Tuesday night",
    })
    expect(iso((await dbRow("field_reports", made.id)).reported_at)).toBe("2026-05-04T21:00:00.000Z")
    expect(await dbRow("field_reports", draft.id)).toMatchObject({ is_draft: true, fields: { went_well: "half" } })
    // the draft does not count, the submitted report does
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_field_reports: 1 })

    await expect(createFieldReport({ user_id: other.user.id, fields: {} })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("updateFieldReport (repo + service) changes the fields named on that report only, and a draft submitted counts", async () => {
    const other = await bystander()
    const me = await person("report-update")
    const draft = await createFieldReport({ user_id: me.id, title: "Draft", fields: { went_well: "a" }, is_draft: true, location: "Soho" })
    const sibling = await createFieldReport({ user_id: me.id, title: "Sibling", fields: { went_well: "s" } })
    const siblingBefore = await dbRow("field_reports", sibling.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_field_reports: 1 })

    await updateFieldReport(draft.id, { title: "Final", fields: { went_well: "b" }, is_draft: false, tags: ["x"], approach_count: 3 })

    const row = await dbRow("field_reports", draft.id)
    expect(row).toMatchObject({ title: "Final", fields: { went_well: "b" }, is_draft: false, tags: ["x"], approach_count: 3, location: "Soho", user_id: me.id })
    expect(await dbRow("field_reports", sibling.id)).toEqual(siblingBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_field_reports: 2 })

    await repoUpdateFieldReport(draft.id, { location: "Camden" })
    expect(await dbRow("field_reports", draft.id)).toMatchObject({ location: "Camden", title: "Final" })

    await expect(updateFieldReport(other.reportId, { title: "Hijacked" })).rejects.toThrow(/Failed to update field report/)
    await other.stillUntouched()
  })

  it("deleteFieldReport (repo + service) removes that report only, and the count goes down", async () => {
    const other = await bystander()
    const me = await person("report-delete")
    const doomed = await createFieldReport({ user_id: me.id, title: "Doomed", fields: {} })
    const kept = await createFieldReport({ user_id: me.id, title: "Kept", fields: { a: "b" } })
    const keptBefore = await dbRow("field_reports", kept.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_field_reports: 2 })

    await deleteFieldReport(doomed.id, me.id)

    expect(await asOwner((q) => q("select id from public.field_reports where id = $1", [doomed.id]))).toEqual([])
    expect(await dbRow("field_reports", kept.id)).toEqual(keptBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ total_field_reports: 1 })

    const viaRepo = await createFieldReport({ user_id: me.id, fields: {} })
    await repoDeleteFieldReport(viaRepo.id, me.id)
    expect(await asOwner((q) => q("select id from public.field_reports where id = $1", [viaRepo.id]))).toEqual([])

    await expect(deleteFieldReport(other.reportId, me.id)).rejects.toThrow("Report not found or access denied")
    await expect(repoDeleteFieldReport(other.reportId, other.user.id)).rejects.toThrow("Report not found or access denied")
    await other.stillUntouched()
  })
})

describe("a custom report template", () => {
  it("saveCustomReportTemplate and createCustomReportTemplate store the name, fields and owner, and never make a system template", async () => {
    const other = await bystander()
    const me = await person("rtemplate-create")
    const fields = [
      { id: "went_well", label: "What went well", type: "textarea" },
      { id: "rating", label: "Rating", type: "scale" },
    ] as never

    const saved = await saveCustomReportTemplate(me.id, { name: "  My debrief ", description: " After a session ", fields })
    const raw = await repoCreateCustomReportTemplate({
      user_id: me.id,
      name: "Raw",
      slug: "raw",
      description: "d",
      icon: "star",
      estimated_minutes: 7,
      is_system: true,
      static_fields: [],
      dynamic_fields: [],
      active_dynamic_fields: ["x"],
    })

    const row = await dbRow("field_report_templates", saved.id)
    expect(row).toMatchObject({
      user_id: me.id,
      name: "My debrief",
      description: "After a session",
      estimated_minutes: 4,
      is_system: false,
      static_fields: fields,
      dynamic_fields: [],
      active_dynamic_fields: [],
    })
    expect(row.slug).toMatch(/^my-debrief-/)
    expect(await dbRow("field_report_templates", raw.id)).toMatchObject({
      user_id: me.id,
      name: "Raw",
      slug: "raw",
      description: "d",
      icon: "star",
      estimated_minutes: 7,
      is_system: false,
      active_dynamic_fields: ["x"],
    })
    await expect(saveCustomReportTemplate(me.id, { name: " ", fields })).rejects.toThrow("Template name is required")
    await expect(saveCustomReportTemplate(me.id, { name: "x", fields: [] })).rejects.toThrow("At least one field is required")
    expect(await countWhere("field_report_templates", me.id)).toBe(2)
    await expect(repoCreateCustomReportTemplate({ user_id: other.user.id, name: "x", slug: "x", static_fields: [], dynamic_fields: [] })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("updateCustomReportTemplate (repo + service) changes that template only, and re-estimates its time when the fields change", async () => {
    const other = await bystander()
    const me = await person("rtemplate-update")
    const target = await saveCustomReportTemplate(me.id, { name: "Target", description: "keep", fields: [{ id: "a", label: "A", type: "text" }] as never })
    const sibling = await saveCustomReportTemplate(me.id, { name: "Sibling", fields: [{ id: "a", label: "A", type: "text" }] as never })
    const siblingBefore = await dbRow("field_report_templates", sibling.id)
    const before = await dbRow("field_report_templates", target.id)
    const newFields = [
      { id: "a", label: "A", type: "textarea" },
      { id: "b", label: "B", type: "textarea" },
    ] as never

    await updateCustomReportTemplate(me.id, target.id, { name: " Renamed ", fields: newFields })

    const row = await dbRow("field_report_templates", target.id)
    expect(row).toMatchObject({ name: "Renamed", static_fields: newFields, estimated_minutes: 6, description: "keep", slug: before.slug, user_id: me.id, is_system: false })
    expect(await dbRow("field_report_templates", sibling.id)).toEqual(siblingBefore)

    await updateCustomReportTemplate(me.id, target.id, { description: " Changed " })
    expect(await dbRow("field_report_templates", target.id)).toMatchObject({ description: "Changed", name: "Renamed", estimated_minutes: 6 })

    await repoUpdateCustomReportTemplate(target.id, me.id, { icon: "bolt" })
    expect(await dbRow("field_report_templates", target.id)).toMatchObject({ icon: "bolt", name: "Renamed" })

    await expect(updateCustomReportTemplate(me.id, target.id, { name: "  " })).rejects.toThrow("Template name cannot be empty")
    await expect(updateCustomReportTemplate(me.id, target.id, { fields: [] })).rejects.toThrow("At least one field is required")
    await expect(updateCustomReportTemplate(me.id, other.reportTemplateId, { name: "Hijacked" })).rejects.toThrow("Template not found or access denied")
    await expect(updateCustomReportTemplate(other.user.id, other.reportTemplateId, { name: "Hijacked" })).rejects.toThrow("Template not found or access denied")
    await other.stillUntouched()
  })

  it("deleteCustomReportTemplate (repo + service) removes that template only", async () => {
    const other = await bystander()
    const me = await person("rtemplate-delete")
    const doomed = await saveCustomReportTemplate(me.id, { name: "Doomed", fields: [{ id: "a", label: "A", type: "text" }] as never })
    const kept = await saveCustomReportTemplate(me.id, { name: "Kept", fields: [{ id: "a", label: "A", type: "text" }] as never })
    const keptBefore = await dbRow("field_report_templates", kept.id)

    await deleteCustomReportTemplate(me.id, doomed.id)

    expect(await asOwner((q) => q("select id from public.field_report_templates where id = $1", [doomed.id]))).toEqual([])
    expect(await dbRow("field_report_templates", kept.id)).toEqual(keptBefore)

    const viaRepo = await repoCreateCustomReportTemplate({ user_id: me.id, name: "R", slug: "r", static_fields: [], dynamic_fields: [] })
    await repoDeleteCustomReportTemplate(viaRepo.id, me.id)
    expect(await asOwner((q) => q("select id from public.field_report_templates where id = $1", [viaRepo.id]))).toEqual([])

    await expect(deleteCustomReportTemplate(me.id, other.reportTemplateId)).rejects.toThrow("Template not found or access denied")
    await expect(repoDeleteCustomReportTemplate(other.reportTemplateId, other.user.id)).rejects.toThrow("Template not found or access denied")
    await other.stillUntouched()
  })
})

describe("a custom review template", () => {
  it("saveCustomReviewTemplate and createCustomReviewTemplate store the name, type, fields and owner, and never make a system template", async () => {
    const other = await bystander()
    const me = await person("vtemplate-create")
    const fields = [{ id: "win", label: "A win", type: "textarea" }] as never

    const saved = await saveCustomReviewTemplate(me.id, { name: " Sunday ", description: " Weekly ", reviewType: "weekly", fields })
    const raw = await repoCreateCustomReviewTemplate({
      user_id: me.id,
      name: "Raw",
      slug: "raw",
      review_type: "monthly",
      is_system: true,
      estimated_minutes: 9,
      static_fields: [],
      dynamic_fields: [],
    })

    const row = await dbRow("review_templates", saved.id)
    expect(row).toMatchObject({
      user_id: me.id,
      name: "Sunday",
      description: "Weekly",
      review_type: "weekly",
      estimated_minutes: 3,
      is_system: false,
      static_fields: fields,
      dynamic_fields: [],
    })
    expect(row.slug).toMatch(/^sunday-/)
    expect(await dbRow("review_templates", raw.id)).toMatchObject({ user_id: me.id, review_type: "monthly", is_system: false, estimated_minutes: 9, slug: "raw" })
    await expect(saveCustomReviewTemplate(me.id, { name: "", reviewType: "daily", fields })).rejects.toThrow("Template name is required")
    await expect(saveCustomReviewTemplate(me.id, { name: "x", reviewType: "daily", fields: [] })).rejects.toThrow("At least one field is required")
    expect(await countWhere("review_templates", me.id)).toBe(2)
    await expect(repoCreateCustomReviewTemplate({ user_id: other.user.id, name: "x", slug: "x", review_type: "weekly", static_fields: [], dynamic_fields: [] })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("deleteCustomReviewTemplate (repo + service) removes that template only", async () => {
    const other = await bystander()
    const me = await person("vtemplate-delete")
    const fields = [{ id: "win", label: "A win", type: "text" }] as never
    const doomed = await saveCustomReviewTemplate(me.id, { name: "Doomed", reviewType: "weekly", fields })
    const kept = await saveCustomReviewTemplate(me.id, { name: "Kept", reviewType: "weekly", fields })
    const keptBefore = await dbRow("review_templates", kept.id)

    await deleteCustomReviewTemplate(me.id, doomed.id)

    expect(await asOwner((q) => q("select id from public.review_templates where id = $1", [doomed.id]))).toEqual([])
    expect(await dbRow("review_templates", kept.id)).toEqual(keptBefore)

    const viaRepo = await repoCreateCustomReviewTemplate({ user_id: me.id, name: "R", slug: "r", review_type: "weekly", static_fields: [], dynamic_fields: [] })
    await repoDeleteCustomReviewTemplate(viaRepo.id, me.id)
    expect(await asOwner((q) => q("select id from public.review_templates where id = $1", [viaRepo.id]))).toEqual([])

    await expect(deleteCustomReviewTemplate(me.id, other.reviewTemplateId)).rejects.toThrow("Template not found or access denied")
    await expect(repoDeleteCustomReviewTemplate(other.reviewTemplateId, other.user.id)).rejects.toThrow("Template not found or access denied")
    await other.stillUntouched()
  })
})

describe("a review", () => {
  it("createReview (repo + service) stores every field and counts it", async () => {
    const other = await bystander()
    const me = await person("review-create")

    const made = await createReview({
      user_id: me.id,
      review_type: "weekly",
      fields: { win: "Opened 10 sets", lesson: "Slow down" },
      period_start: "2026-06-01",
      period_end: "2026-06-07",
      previous_commitment: "Talk to 5 women",
      commitment_fulfilled: true,
      new_commitment: "Talk to 8 women",
      is_draft: false,
    })
    const viaRepo = await repoCreateReview({ user_id: me.id, review_type: "daily", fields: {}, period_start: "2026-06-02", period_end: "2026-06-02", is_draft: true })

    expect(await dbRow("reviews", made.id)).toMatchObject({
      user_id: me.id,
      review_type: "weekly",
      template_id: null,
      fields: { win: "Opened 10 sets", lesson: "Slow down" },
      period_start: "2026-06-01",
      period_end: "2026-06-07",
      previous_commitment: "Talk to 5 women",
      commitment_fulfilled: true,
      new_commitment: "Talk to 8 women",
      is_draft: false,
    })
    expect(await dbRow("reviews", viaRepo.id)).toMatchObject({ review_type: "daily", is_draft: true })
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ weekly_reviews_completed: 1 })

    await expect(createReview({ user_id: other.user.id, review_type: "weekly", fields: {}, period_start: "2026-06-01", period_end: "2026-06-07" })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("updateReview (repo + service) changes the fields named on that review only, and a draft submitted counts", async () => {
    const other = await bystander()
    const me = await person("review-update")
    const draft = await createReview({ user_id: me.id, review_type: "weekly", fields: { win: "a" }, period_start: "2026-06-08", period_end: "2026-06-14", is_draft: true, new_commitment: "old" })
    const sibling = await createReview({ user_id: me.id, review_type: "weekly", fields: { win: "s" }, period_start: "2026-06-01", period_end: "2026-06-07" })
    const siblingBefore = await dbRow("reviews", sibling.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ weekly_reviews_completed: 1 })

    await updateReview(draft.id, { fields: { win: "b" }, is_draft: false, commitment_fulfilled: false, new_commitment: "new", previous_commitment: "prev" })

    expect(await dbRow("reviews", draft.id)).toMatchObject({
      fields: { win: "b" },
      is_draft: false,
      commitment_fulfilled: false,
      new_commitment: "new",
      previous_commitment: "prev",
      period_start: "2026-06-08",
      user_id: me.id,
    })
    expect(await dbRow("reviews", sibling.id)).toEqual(siblingBefore)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ weekly_reviews_completed: 2 })

    await repoUpdateReview(draft.id, { period_end: "2026-06-13" })
    expect(await dbRow("reviews", draft.id)).toMatchObject({ period_end: "2026-06-13", new_commitment: "new" })

    await expect(updateReview(other.reviewId, { new_commitment: "Hijacked" })).rejects.toThrow(/Failed to update review/)
    await other.stillUntouched()
  })
})

describe("a sticking point", () => {
  it("createStickingPoint (repo + service) stores every field for the person it names", async () => {
    const other = await bystander()
    const me = await person("point-create")

    const made = await createStickingPoint({
      user_id: me.id,
      name: "Hesitating",
      description: "I freeze before opening",
      status: "active",
      occurrence_count: 3,
    })
    const viaRepo = await repoCreateStickingPoint({ user_id: me.id, name: "Second" })

    expect(await dbRow("sticking_points", made.id)).toMatchObject({
      user_id: me.id,
      name: "Hesitating",
      description: "I freeze before opening",
      status: "active",
      occurrence_count: 3,
      resolved_at: null,
      resolution_notes: null,
    })
    expect(await dbRow("sticking_points", viaRepo.id)).toMatchObject({ name: "Second", status: "active", occurrence_count: 0 })
    await expect(createStickingPoint({ user_id: other.user.id, name: "x" })).rejects.toThrow(/row-level security/)
    await other.stillUntouched()
  })

  it("updateStickingPoint (repo + service) changes the fields named on that point only", async () => {
    const other = await bystander()
    const me = await person("point-update")
    const target = await createStickingPoint({ user_id: me.id, name: "Target", description: "keep", occurrence_count: 1 })
    const sibling = await createStickingPoint({ user_id: me.id, name: "Sibling" })
    const siblingBefore = await dbRow("sticking_points", sibling.id)

    await updateStickingPoint(target.id, { status: "resolved", resolved_at: "2026-07-01T10:00:00.000Z", resolution_notes: "Counted to three", occurrence_count: 4, name: "Target v2" })

    const row = await dbRow("sticking_points", target.id)
    expect(row).toMatchObject({ status: "resolved", resolution_notes: "Counted to three", occurrence_count: 4, name: "Target v2", description: "keep", user_id: me.id })
    expect(iso(row.resolved_at)).toBe("2026-07-01T10:00:00.000Z")
    expect(await dbRow("sticking_points", sibling.id)).toEqual(siblingBefore)

    await repoUpdateStickingPoint(target.id, { description: "changed" })
    expect(await dbRow("sticking_points", target.id)).toMatchObject({ description: "changed", name: "Target v2" })

    await expect(updateStickingPoint(other.pointId, { name: "Hijacked" })).rejects.toThrow(/Failed to update sticking point/)
    await other.stillUntouched()
  })
})

describe("favourite templates and the tracking counters", () => {
  it("getOrCreateUserTrackingStats (repo + service) makes a zeroed row for that person once, and reads the same row back", async () => {
    const other = await bystander()
    const me = await person("stats-create")
    expect(await countWhere("user_tracking_stats", me.id)).toBe(0)

    const first = await getOrCreateUserTrackingStats(me.id)
    const second = await repoGetOrCreateUserTrackingStats(me.id)

    expect(await countWhere("user_tracking_stats", me.id)).toBe(1)
    expect(first.user_id).toBe(me.id)
    expect(second.user_id).toBe(me.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({
      total_approaches: 0,
      total_sessions: 0,
      total_numbers: 0,
      total_instadates: 0,
      total_field_reports: 0,
      current_streak: 0,
      longest_streak: 0,
      current_week_sessions: 0,
      current_week_approaches: 0,
      favorite_template_ids: [],
      unique_locations: [],
      week_start_date: null,
    })
    await other.stillUntouched()
  })

  it("addFavoriteTemplate, removeFavoriteTemplate and getFavoriteTemplateIds keep that person's list, newest first, at most three", async () => {
    const other = await bystander()
    const me = await person("favourites")

    expect(await getFavoriteTemplateIds(me.id)).toEqual([])
    expect(await addFavoriteTemplate(me.id, "a")).toEqual(["a"])
    expect(await addFavoriteTemplate(me.id, "b")).toEqual(["b", "a"])
    expect(await addFavoriteTemplate(me.id, "b")).toEqual(["b", "a"])
    expect(await repoAddFavoriteTemplate(me.id, "c")).toEqual(["c", "b", "a"])
    expect((await dbRow("user_tracking_stats", me.id, "user_id")).favorite_template_ids).toEqual(["c", "b", "a"])
    await expect(addFavoriteTemplate(me.id, "d")).rejects.toThrow("Maximum of 3 favorite templates allowed")
    expect((await dbRow("user_tracking_stats", me.id, "user_id")).favorite_template_ids).toEqual(["c", "b", "a"])

    expect(await removeFavoriteTemplate(me.id, "b")).toEqual(["c", "a"])
    expect(await repoRemoveFavoriteTemplate(me.id, "zzz")).toEqual(["c", "a"])
    expect((await dbRow("user_tracking_stats", me.id, "user_id")).favorite_template_ids).toEqual(["c", "a"])
    expect(await repoGetFavoriteTemplateIds(me.id)).toEqual(["c", "a"])

    // the bystander's own list is theirs: unchanged by all of the above
    expect(await getFavoriteTemplateIds(other.user.id)).toEqual(["their-favourite"])
    await removeFavoriteTemplate(me.id, "c")
    await other.stillUntouched()
  })

  it("updateUserTrackingStats writes the fields named into that person's row only", async () => {
    const other = await bystander()
    const me = await person("stats-update")
    await updateUserTrackingStats(me.id, { total_approaches: 12, total_numbers: 3, current_streak: 2, longest_streak: 5, unique_locations: ["Soho", "Camden"], last_approach_date: "2026-08-01" })

    const after = await updateUserTrackingStats(me.id, { total_sessions: 4 })

    expect(after.user_id).toBe(me.id)
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({
      total_approaches: 12,
      total_numbers: 3,
      current_streak: 2,
      longest_streak: 5,
      unique_locations: ["Soho", "Camden"],
      last_approach_date: "2026-08-01",
      total_sessions: 4,
    })
    await other.stillUntouched()
  })

  it("replaceUserTrackingStats overwrites the counters it is given, keeps the favourites, and creates the row when there is none", async () => {
    const other = await bystander()
    const me = await person("stats-replace")
    await addFavoriteTemplate(me.id, "keep-me")
    await updateUserTrackingStats(me.id, { total_approaches: 99, current_week_numbers: 7 })

    await replaceUserTrackingStats(me.id, { total_approaches: 5, total_sessions: 2, unique_locations: ["Soho"], week_start_date: "2026-08-03" })

    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({
      total_approaches: 5,
      total_sessions: 2,
      unique_locations: ["Soho"],
      week_start_date: "2026-08-03",
      current_week_numbers: 7,
      favorite_template_ids: ["keep-me"],
    })

    const fresh = await person("stats-replace-fresh")
    expect(await countWhere("user_tracking_stats", fresh.id)).toBe(0)
    await replaceUserTrackingStats(fresh.id, { total_numbers: 3 })
    expect(await dbRow("user_tracking_stats", fresh.id, "user_id")).toMatchObject({ user_id: fresh.id, total_numbers: 3 })
    await other.stillUntouched()
  })

  it("rollTrackingCounters zeroes that person's week counters for a new week, keeps the totals and streaks, and refuses to roll backwards", async () => {
    const other = await bystander()
    const me = await person("stats-roll")
    await updateUserTrackingStats(me.id, {
      week_start_date: "2020-01-06",
      current_week_sessions: 3,
      current_week_approaches: 15,
      current_week_numbers: 2,
      current_week_instadates: 1,
      current_week_field_reports: 1,
      total_approaches: 40,
      total_sessions: 9,
      current_week_streak: 4,
      longest_week_streak: 6,
    })
    const bystanderStatsBefore = await snapshotOne("user_tracking_stats", other.user.id)

    expect(await rollTrackingCounters(me.id, "UTC")).toBe(true)

    const row = await dbRow("user_tracking_stats", me.id, "user_id")
    expect(row).toMatchObject({
      current_week_sessions: 0,
      current_week_approaches: 0,
      current_week_numbers: 0,
      current_week_instadates: 0,
      current_week_field_reports: 0,
      total_approaches: 40,
      total_sessions: 9,
      current_week_streak: 4,
      longest_week_streak: 6,
    })
    expect(row.week_start_date).not.toBe("2020-01-06")
    expect(await rollTrackingCounters(me.id, "UTC")).toBe(false)

    // a stored week in the future is left alone
    await updateUserTrackingStats(me.id, { week_start_date: "2099-01-05", current_week_approaches: 8 })
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await rollTrackingCounters(me.id, "UTC")).toBe(false)
    errors.mockRestore()
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ week_start_date: "2099-01-05", current_week_approaches: 8 })
    expect(await snapshotOne("user_tracking_stats", other.user.id)).toBe(bystanderStatsBefore)
    await other.stillUntouched()
  })

  it("getTrackingStatsForDisplay rolls an expired week before it shows it", async () => {
    const other = await bystander()
    const me = await person("stats-display")
    await updateUserTrackingStats(me.id, { week_start_date: "2020-01-06", current_week_approaches: 15, current_week_sessions: 2, total_approaches: 30 })

    const shown = await getTrackingStatsForDisplay(me.id)

    expect(shown).toMatchObject({ user_id: me.id, current_week_approaches: 0, current_week_sessions: 0, total_approaches: 30 })
    expect(await dbRow("user_tracking_stats", me.id, "user_id")).toMatchObject({ current_week_approaches: 0, current_week_sessions: 0, total_approaches: 30 })
    await other.stillUntouched()
  })
})

describe("a badge", () => {
  it("insertMilestones writes the type, moment and session for that person, and nothing for anyone else", async () => {
    const other = await bystander()
    const me = await person("badge-insert")
    const session = await createSession({ user_id: me.id })
    const moment = "2026-09-09T19:00:00.000Z"

    const awarded = await insertMilestones(me.id, [
      { milestone_type: "first_session", achieved_at: moment, session_id: session.id },
      { milestone_type: "first_number", achieved_at: moment, session_id: null },
    ])

    expect(awarded.map((m) => m.milestone_type).sort()).toEqual(["first_number", "first_session"])
    const rows = await asOwner((q) => q("select user_id, milestone_type, achieved_at, session_id from public.milestones where user_id = $1 and milestone_type in ('first_session','first_number') order by milestone_type", [me.id]))
    expect(rows.map((r) => [r.user_id, r.milestone_type, iso(r.achieved_at), r.session_id])).toEqual([
      [me.id, "first_number", moment, null],
      [me.id, "first_session", moment, session.id],
    ])
    expect(await insertMilestones(me.id, [])).toEqual([])
    await other.stillUntouched()
  })
})
