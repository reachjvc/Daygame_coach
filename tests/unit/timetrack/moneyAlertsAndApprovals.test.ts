/**
 * WHAT AN ENTRY IS WORTH, WHEN A PROJECT SAYS IT IS RUNNING OUT, AND WHO SIGNED
 * A WEEK OFF: the rate chain, the alerts and the approvals, asserted on the
 * numbers and records a person reads. Each case sits where the answer changes.
 */
import { describe, expect, test } from "vitest"

import {
  entryCost,
  entryRevenue,
  evaluateAlerts,
  findFavorite,
  markAlertsRead,
  matchAutotracker,
  projectRateAt,
  resolveBillableRate,
  resolveCostRate,
  setApprovalStatus,
  toggleFavorite,
} from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = "2026-08-12T12:00:00.000Z"
const e = (extra = {}) => entry("1", "2026-08-10", "09:00", "10:00", extra)
const patchProject = (s: TimetrackState, patch: object): TimetrackState => ({ ...s, projects: s.projects.map((p) => (p.id === "30" ? { ...p, ...patch } : p)) })

describe("what an entry is worth", () => {
  test("an entry's rate follows task, project on that day, member, workspace; cost and revenue are rate times hours", () => {
    { // the rate comes from the task, else the project on that day, else the member, else the workspace; unbilled is zero
      const s = baseState()
      expect(resolveBillableRate(s, e({ taskId: "40" }))).toBe(150)
      expect(resolveBillableRate(s, e({ taskId: "41" }))).toBe(100)
      expect(resolveBillableRate(s, e({ billable: false, taskId: "40" }))).toBe(0)
      expect(resolveBillableRate(s, e({ projectId: null, userId: "10" }))).toBe(80)
      expect(resolveBillableRate(s, e({ projectId: null, userId: "ghost" }))).toBe(50)
      expect(resolveBillableRate({ ...s, workspace: { ...s.workspace, defaultHourlyRate: null } }, e({ projectId: null, userId: "ghost" }))).toBe(0)
      const noRate = patchProject(s, { rate: null, rateHistory: [] })
      expect(resolveBillableRate(noRate, e({ taskId: null }))).toBe(80)
      const zeroTask = { ...s, tasks: s.tasks.map((t) => (t.id === "40" ? { ...t, rate: 0 } : t)) }
      expect(resolveBillableRate(zeroTask, e({ taskId: "40" }))).toBe(0)

      const project = s.projects[0]
      expect(projectRateAt(project, "2026-07-31T10:00:00.000Z")).toBe(90)
      expect(projectRateAt(project, "2026-08-01T00:00:00.000Z")).toBe(100)
      expect(projectRateAt(project, "2025-12-31T10:00:00.000Z")).toBe(project.rate)
      expect(projectRateAt({ ...project, rateHistory: [], rate: 70 }, NOW)).toBe(70)
      expect(projectRateAt({ ...project, rateHistory: [...project.rateHistory].reverse() }, "2026-08-10T10:00:00.000Z")).toBe(100)
    }
    { // cost is the member's labour cost, else the workspace's; revenue and cost are rate times hours
      const s = baseState()
      expect(resolveCostRate(s, e())).toBe(30)
      expect(resolveCostRate(s, e({ userId: "ghost" }))).toBe(20)
      expect(resolveCostRate({ ...s, workspace: { ...s.workspace, defaultLabourCost: null } }, e({ userId: "ghost" }))).toBe(0)
      const free = { ...s, members: s.members.map((m) => (m.id === "10" ? { ...m, labourCost: 0 } : m)) }
      expect(resolveCostRate(free, e())).toBe(0)
      expect(entryRevenue(s, e(), 5400)).toBe(150)
      expect(entryCost(s, e(), 5400)).toBe(45)
    }
  })

})

describe("alerts and approvals", () => {
  test("a project alert is raised once per period when its threshold is reached, and read marks all as read", () => {
    const s = baseState()
    const today = "2026-08-12"
    const worked = (hours: number) => ({ ...s, entries: [entry("w", "2026-08-10", "08:00", `${8 + hours}:00`.padStart(5, "0"))] })
    expect(evaluateAlerts(worked(4), today, NOW).alerts).toEqual([])
    const raised = evaluateAlerts(worked(5), today, NOW)
    expect(raised.alerts).toHaveLength(1)
    expect(raised.alerts[0]).toMatchObject({ projectId: "30", basis: "estimate", threshold: 50, periodStart: "2026-08-01", read: false, at: NOW })
    expect(evaluateAlerts(raised, today, NOW).alerts).toHaveLength(1)
    const nextPeriod = evaluateAlerts({ ...raised, projects: raised.projects.map((p) => (p.id === "30" ? { ...p, startDate: "2026-07-01", endDate: "2026-08-31" } : p)) }, today, NOW)
    expect(nextPeriod.alerts).toHaveLength(2)

    const off = patchProject(worked(8), { alerts: [{ id: "300", basis: "estimate", threshold: 50, enabled: false }] })
    expect(evaluateAlerts(off, today, NOW).alerts).toEqual([])
    const inactive = patchProject(worked(8), { active: false })
    expect(evaluateAlerts(inactive, today, NOW).alerts).toEqual([])
    const fee = patchProject(worked(2), { alerts: [{ id: "301", basis: "fixed_fee", threshold: 50, enabled: true }], fixedFee: 100 })
    expect(evaluateAlerts(fee, today, NOW).alerts[0]).toMatchObject({ basis: "fixed_fee" })
    expect(evaluateAlerts({ ...fee, projects: fee.projects.map((p) => (p.id === "30" ? { ...p, fixedFee: 1000 } : p)) }, today, NOW).alerts).toEqual([])
    const money = patchProject(worked(1), { estimateType: "monetary", estimatedAmount: 150, alerts: [{ id: "302", basis: "estimate", threshold: 50, enabled: true }] })
    expect(evaluateAlerts(money, today, NOW).alerts).toHaveLength(1)
    expect(evaluateAlerts(patchProject(money, { estimatedAmount: 0 }), today, NOW).alerts).toEqual([])

    const read = markAlertsRead({ ...raised, alerts: [...raised.alerts, { ...raised.alerts[0], id: "z", read: true }] })
    expect(read.alerts.every((a) => a.read)).toBe(true)
  })

  test("a week's approval moves through submitted, approved and rejected, and a favourite or autotracker rule is found as typed", () => {
    { // a week's approval is made once and then moves through submitted, approved and rejected with the right moments
      const s = baseState()
      const sub = setApprovalStatus(s, "10", "2026-08-10", "submitted", "2026-08-14T09:00:00.000Z", "please")
      expect(sub.approvals).toEqual([expect.objectContaining({ memberId: "10", weekStart: "2026-08-10", status: "submitted", note: "please", submittedAt: "2026-08-14T09:00:00.000Z", decidedAt: null })])
      const ok = setApprovalStatus(sub, "10", "2026-08-10", "approved", "2026-08-15T09:00:00.000Z")
      expect(ok.approvals).toHaveLength(1)
      expect(ok.approvals[0]).toMatchObject({ status: "approved", note: "", submittedAt: "2026-08-14T09:00:00.000Z", decidedAt: "2026-08-15T09:00:00.000Z" })
      const no = setApprovalStatus(ok, "10", "2026-08-10", "rejected", "2026-08-16T09:00:00.000Z", "again")
      expect(no.approvals[0]).toMatchObject({ status: "rejected", note: "again", decidedAt: "2026-08-16T09:00:00.000Z" })
      const again = setApprovalStatus(no, "10", "2026-08-10", "submitted", "2026-08-17T09:00:00.000Z")
      expect(again.approvals[0]).toMatchObject({ submittedAt: "2026-08-17T09:00:00.000Z", decidedAt: null })
      const other = setApprovalStatus(again, "11", "2026-08-10", "approved", "2026-08-18T09:00:00.000Z")
      expect(other.approvals).toHaveLength(2)
      expect(other.approvals[1]).toMatchObject({ memberId: "11", submittedAt: null, decidedAt: "2026-08-18T09:00:00.000Z" })
      expect(setApprovalStatus(s, "10", "2026-08-10", "rejected", NOW).approvals[0]).toMatchObject({ submittedAt: null, decidedAt: NOW })
    }
    { // a favourite is the same one however its words are cased or its tags ordered; the autotracker takes the first enabled rule that matches
      const s = baseState()
      const draft = { description: "  Deep Work ", projectId: "30", taskId: null, tagIds: ["51", "50"], billable: true }
      const added = toggleFavorite(s, draft, NOW)
      expect(added.favorites).toHaveLength(1)
      expect(findFavorite(added, { ...draft, description: "deep work", tagIds: ["50", "51"] })).not.toBeNull()
      for (const different of [{ projectId: "31" }, { taskId: "40" }, { billable: false }, { tagIds: ["50"] }, { description: "other" }]) {
        expect(findFavorite(added, { ...draft, ...different }), JSON.stringify(different)).toBeNull()
      }
      expect(toggleFavorite(added, { ...draft, description: "DEEP WORK" }, NOW).favorites).toEqual([])
      expect(toggleFavorite(added, { ...draft, projectId: "31" }, NOW).favorites).toHaveLength(2)
      expect(added.favorites[0].at).toBe(NOW)

      const rules = [
        { id: "1", keyword: "  ", projectId: "30", taskId: null, tagIds: [], enabled: true },
        { id: "2", keyword: "gym", projectId: "30", taskId: null, tagIds: [], enabled: false },
        { id: "3", keyword: "Gym", projectId: "31", taskId: null, tagIds: [], enabled: true },
        { id: "4", keyword: "gym", projectId: "30", taskId: null, tagIds: [], enabled: true },
      ]
      const withRules = { ...s, autotrackers: rules }
      expect(matchAutotracker(withRules, "Morning GYM session")?.id).toBe("3")
      expect(matchAutotracker(withRules, "   ")).toBeNull()
      expect(matchAutotracker(withRules, "")).toBeNull()
      expect(matchAutotracker(withRules, "reading")).toBeNull()
      expect(matchAutotracker({ ...s, autotrackers: [rules[1]] }, "gym")).toBeNull()
    }
  })

})
