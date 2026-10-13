/**
 * trackingRepo against production's real tracking tables: sessions, approaches,
 * badges (`milestones`), field reports and custom report templates.
 *
 * Tracking is what somebody uses on the street, so the facts that matter are
 * the ones a person reads back: the session list with its outcomes and badges,
 * a badge that keeps the day it was first earned, reports that stay theirs.
 * Ending a session is tested through `trackingService.endSession`, because the
 * repo alone never finishes one — the service ends it and then recounts.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import {
  createApproach,
  createCustomReportTemplate,
  createFieldReport,
  createSession,
  deleteCustomReportTemplate,
  deleteFieldReport,
  getCustomReportTemplate,
  getDraftFieldReports,
  getFieldReport,
  getFieldReportTemplate,
  getFieldReportTemplates,
  getSessionSummaries,
  getUserCustomReportTemplates,
  getUserFieldReports,
  getUserMilestones,
  insertMilestones,
  updateCustomReportTemplate,
  updateFieldReport,
} from "@/src/db/trackingRepo"
import { endSession } from "@/src/tracking/trackingService"
import type { FieldReportTemplateInsert } from "@/src/db/trackingTypes"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const iso = (value: unknown) => new Date(value as string).toISOString()

describe("the session list", () => {
  it("shows each session newest first, with its outcomes counted and its badges attached", async () => {
    const user = await newUser("sessions")
    actAs(user)
    const older = await createSession({ user_id: user.id, started_at: minutesAgo(600), primary_location: "Soho" })
    await createApproach({ user_id: user.id, session_id: older.id, outcome: "blowout" })
    const newer = await createSession({ user_id: user.id, started_at: minutesAgo(60), goal: 3 })
    await createApproach({ user_id: user.id, session_id: newer.id, outcome: "number" })
    await createApproach({ user_id: user.id, session_id: newer.id, outcome: "good" })
    await createApproach({ user_id: user.id, session_id: newer.id, outcome: "number" })
    await insertMilestones(user.id, [
      { milestone_type: "first_number", achieved_at: minutesAgo(30), session_id: newer.id },
    ])

    const summaries = await getSessionSummaries(user.id)

    expect(summaries.map((s) => s.id)).toEqual([newer.id, older.id])
    expect(summaries[0]).toMatchObject({
      total_approaches: 3,
      goal: 3,
      outcomes: { blowout: 0, short: 0, good: 1, number: 2, instadate: 0 },
      achievements: [expect.objectContaining({ milestone_type: "first_number" })],
    })
    expect(summaries[1]).toMatchObject({
      total_approaches: 1,
      primary_location: "Soho",
      outcomes: { blowout: 1, short: 0, good: 0, number: 0, instadate: 0 },
      achievements: [],
    })
    expect((await getSessionSummaries(user.id, 1)).map((s) => s.id)).toEqual([newer.id])
  })

  it("shows nobody else's sessions, whatever id the caller passes", async () => {
    const owner = await newUser("sessions-owner")
    const intruder = await newUser("sessions-intruder")
    actAs(owner)
    const session = await createSession({ user_id: owner.id })
    await createApproach({ user_id: owner.id, session_id: session.id, outcome: "number" })

    actAs(intruder)
    expect(await getSessionSummaries(owner.id)).toEqual([])
    await expect(createSession({ user_id: owner.id })).rejects.toThrow(/row-level security/)

    const rows = await asOwner((q) => q("select id from public.sessions where user_id = $1", [owner.id]))
    expect(rows).toEqual([{ id: session.id }])
  })
})

describe("ending a session", () => {
  it("closes it, marks the goal, and recounts the person's totals and badges", async () => {
    const user = await newUser("end-session")
    actAs(user)
    const session = await createSession({ user_id: user.id, started_at: minutesAgo(45), goal: 2 })
    await createApproach({ user_id: user.id, session_id: session.id, outcome: "number" })
    await createApproach({ user_id: user.id, session_id: session.id, outcome: "good" })

    const ended = await endSession(session.id)

    expect(ended).toMatchObject({
      id: session.id,
      is_active: false,
      end_reason: "completed",
      goal_met: true,
      total_approaches: 2,
    })
    expect(ended.duration_minutes).toBeGreaterThanOrEqual(44)
    expect(ended.duration_minutes).toBeLessThanOrEqual(46)

    const [stats] = await asOwner((q) =>
      q(
        "select total_sessions, total_approaches, total_numbers from public.user_tracking_stats where user_id = $1",
        [user.id]
      )
    )
    expect(stats).toEqual({ total_sessions: 1, total_approaches: 2, total_numbers: 1 })

    const badges = await getUserMilestones(user.id)
    const byType = new Map(badges.map((b) => [b.milestone_type, b]))
    expect(byType.get("first_session")?.session_id).toBe(session.id)
    expect(byType.get("first_number")?.session_id).toBe(session.id)
    expect(byType.get("first_goal_hit")?.session_id).toBe(session.id)
  })

  it("cannot be done to somebody else's session", async () => {
    const owner = await newUser("end-session-owner")
    const intruder = await newUser("end-session-intruder")
    actAs(owner)
    const session = await createSession({ user_id: owner.id })

    actAs(intruder)
    await expect(endSession(session.id)).rejects.toThrow("Session not found")

    const [row] = await asOwner((q) =>
      q("select is_active, ended_at, end_reason from public.sessions where id = $1", [session.id])
    )
    expect(row).toEqual({ is_active: true, ended_at: null, end_reason: null })
  })
})

describe("a badge", () => {
  it("is awarded once and keeps the moment it was first earned, however often it is awarded again", async () => {
    const user = await newUser("badges")
    const firstEarned = "2026-01-05T19:30:00.000Z"

    const awarded = await insertMilestones(user.id, [
      { milestone_type: "first_session", achieved_at: firstEarned, session_id: null },
    ])
    const again = await insertMilestones(user.id, [
      { milestone_type: "first_session", achieved_at: "2026-10-01T10:00:00.000Z", session_id: null },
      { milestone_type: "first_approach", achieved_at: "2026-10-01T10:00:00.000Z", session_id: null },
    ])

    expect(awarded.map((m) => m.milestone_type)).toEqual(["first_session"])
    expect(again.map((m) => m.milestone_type)).toEqual(["first_approach"])
    const rows = await asOwner((q) =>
      q("select milestone_type, achieved_at from public.milestones where user_id = $1 order by milestone_type", [
        user.id,
      ])
    )
    expect(rows.map((r) => [r.milestone_type, iso(r.achieved_at)])).toEqual([
      ["first_approach", "2026-10-01T10:00:00.000Z"],
      ["first_session", firstEarned],
    ])
  })

  it("is seen only by the person who earned it", async () => {
    const owner = await newUser("badges-owner")
    const intruder = await newUser("badges-intruder")
    await insertMilestones(owner.id, [
      { milestone_type: "first_session", achieved_at: minutesAgo(5), session_id: null },
    ])

    actAs(owner)
    expect((await getUserMilestones(owner.id)).map((m) => m.milestone_type)).toEqual(["first_session"])
    actAs(intruder)
    expect(await getUserMilestones(owner.id)).toEqual([])
  })
})

describe("field reports", () => {
  it("lists submitted reports newest first and keeps drafts in their own list", async () => {
    const user = await newUser("reports")
    actAs(user)
    const older = await createFieldReport({
      user_id: user.id,
      system_template_slug: "quick-log",
      fields: { went_well: "Opened fast." },
      reported_at: minutesAgo(120),
    })
    const newer = await createFieldReport({
      user_id: user.id,
      system_template_slug: "quick-log",
      fields: { went_well: "Held eye contact." },
      reported_at: minutesAgo(10),
    })
    const draft = await createFieldReport({ user_id: user.id, fields: { went_well: "half-written" }, is_draft: true })

    expect((await getUserFieldReports(user.id)).map((r) => r.id)).toEqual([newer.id, older.id])
    expect((await getDraftFieldReports(user.id)).map((r) => r.id)).toEqual([draft.id])

    await updateFieldReport(draft.id, { is_draft: false })
    expect(await getDraftFieldReports(user.id)).toEqual([])
    expect(await getUserFieldReports(user.id)).toHaveLength(3)
  })

  it("cannot be read, changed, deleted or filed for somebody else, whatever ids the caller passes", async () => {
    const owner = await newUser("reports-owner")
    const intruder = await newUser("reports-intruder")
    actAs(owner)
    const report = await createFieldReport({ user_id: owner.id, title: "Mine", fields: { went_well: "private" } })

    actAs(intruder)
    expect(await getFieldReport(report.id)).toBeNull()
    expect(await getUserFieldReports(owner.id)).toEqual([])
    await expect(updateFieldReport(report.id, { title: "Changed" })).rejects.toThrow(/Failed to update field report: Cannot coerce the result to a single JSON object/)
    await expect(deleteFieldReport(report.id, owner.id)).rejects.toThrow("Report not found or access denied")
    await expect(deleteFieldReport(report.id, intruder.id)).rejects.toThrow("Report not found or access denied")
    await expect(createFieldReport({ user_id: owner.id, fields: {} })).rejects.toThrow(/row-level security/)

    const rows = await asOwner((q) => q("select id, title from public.field_reports where user_id = $1", [owner.id]))
    expect(rows).toEqual([{ id: report.id, title: "Mine" }])
  })
})

describe("a custom report template", () => {
  const template = (userId: string): FieldReportTemplateInsert => ({
    user_id: userId,
    name: "My debrief",
    slug: "my-debrief",
    static_fields: [],
    dynamic_fields: [],
  })

  it("belongs to the person who made it, after the system templates, and can never be made a system one", async () => {
    const user = await newUser("templates")
    actAs(user)

    const made = await createCustomReportTemplate({ ...template(user.id), is_system: true })

    expect(made.is_system).toBe(false)
    expect((await getUserCustomReportTemplates(user.id)).map((t) => t.id)).toEqual([made.id])
    const all = await getFieldReportTemplates(user.id)
    expect(all.at(-1)?.id).toBe(made.id)
    expect(all.slice(0, -1).every((t) => t.is_system)).toBe(true)
    expect(await getCustomReportTemplate(made.id, user.id)).toMatchObject({ id: made.id, name: "My debrief" })
  })

  it("cannot be read, listed, changed or deleted by somebody else, whatever ids they pass", async () => {
    const owner = await newUser("templates-owner")
    const intruder = await newUser("templates-intruder")
    actAs(owner)
    const made = await createCustomReportTemplate(template(owner.id))

    actAs(intruder)
    expect(await getFieldReportTemplate(made.id)).toBeNull()
    expect(await getCustomReportTemplate(made.id, owner.id)).toBeNull()
    expect(await getCustomReportTemplate(made.id, intruder.id)).toBeNull()
    expect((await getFieldReportTemplates(intruder.id)).map((t) => t.id)).not.toContain(made.id)
    expect(await getUserCustomReportTemplates(owner.id)).toEqual([])
    await expect(updateCustomReportTemplate(made.id, owner.id, { name: "Hijacked" })).rejects.toThrow(
      "Template not found or access denied"
    )
    await expect(deleteCustomReportTemplate(made.id, owner.id)).rejects.toThrow("Template not found or access denied")
    await expect(createCustomReportTemplate(template(owner.id))).rejects.toThrow(/row-level security/)

    const rows = await asOwner((q) =>
      q("select id, name from public.field_report_templates where user_id = $1", [owner.id])
    )
    expect(rows).toEqual([{ id: made.id, name: "My debrief" }])
  })
})
