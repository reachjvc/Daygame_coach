/**
 * DELETING A CLIENT, PROJECT, TASK, TAG OR MEMBER LEAVES NO ENTRY, FAVOURITE OR
 * RULE POINTING AT IT, AND NO ENTRY IS LOST. Asserted on the workspace that
 * remains. Also what a new project may be called and cost, and which
 * webhook addresses and invitations are refused (the account refuses them too,
 * and a refused row blocks every save behind it).
 */
import { describe, expect, test } from "vitest"

import {
  addAutotracker,
  addWebhook,
  createProject,
  createTag,
  createTask,
  deleteAutotracker,
  deleteClient,
  deleteGroup,
  deleteMember,
  deleteProject,
  deleteTag,
  deleteTask,
  deleteWebhook,
  draftFromStartLink,
  inviteRefusal,
  startLinkFor,
  tagUsageCount,
  toggleFavorite,
  updateProject,
  validateProject,
} from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = "2026-08-12T12:00:00.000Z"
const rich = (): TimetrackState => {
  let s = baseState()
  s = {
    ...s,
    entries: [
      entry("a", "2026-08-10", "09:00", "10:00", { projectId: "30", taskId: "40", tagIds: ["50", "51"] }),
      entry("b", "2026-08-10", "10:00", "11:00", { projectId: "31", taskId: null, tagIds: ["50"] }),
      entry("c", "2026-08-10", "11:00", "12:00", { projectId: "30", taskId: "41", tagIds: [], serverDeletedAt: NOW }),
    ],
    alerts: [{ id: "al1", projectId: "30", basis: "estimate", threshold: 50, at: NOW, periodStart: "2026-08-01", read: false }, { id: "al2", projectId: "31", basis: "estimate", threshold: 50, at: NOW, periodStart: "2026-08-01", read: false }],
    members: s.members.map((m) => (m.id === "11" ? { ...m, groupIds: ["g1", "g2"] } : m)),
    groups: [{ id: "g1", workspaceId: "1", name: "A", at: NOW }, { id: "g2", workspaceId: "1", name: "B", at: NOW }],
  }
  s = addAutotracker(s, { keyword: "gym", projectId: "30", taskId: "40", tagIds: ["50", "51"], enabled: true })
  s = addAutotracker(s, { keyword: "read", projectId: "31", taskId: null, tagIds: [], enabled: true })
  s = toggleFavorite(s, { description: "x", projectId: "30", taskId: "40", tagIds: ["50"], billable: true }, NOW)
  return s
}

describe("deleting leaves nothing pointing at it", () => {
  test("deleting a client, project, task, tag, member or group leaves nothing pointing at it and no entry lost", () => {
    { // a client's projects stay, a project's tasks go and its entries stay unlinked, a task's entries stay without it
      const s = rich()
      const noClient = deleteClient(s, "20")
      expect(noClient.clients).toEqual([])
      expect(noClient.projects.map((p) => p.clientId)).toEqual([null, ...s.projects.slice(1).map((p) => (p.clientId === "20" ? null : p.clientId))])

      const noProject = deleteProject(s, "30")
      expect(noProject.projects.map((p) => p.id)).toEqual(["31"])
      expect(noProject.tasks).toEqual([])
      expect(noProject.entries.map((e) => [e.id, e.projectId, e.taskId])).toEqual([["a", null, null], ["b", "31", null], ["c", null, null]])
      expect(noProject.alerts.map((a) => a.id)).toEqual(["al2"])
      expect(noProject.autotrackers.map((r) => [r.projectId, r.taskId])).toEqual([[null, null], ["31", null]])
      expect(noProject.favorites[0].draft).toMatchObject({ projectId: null, taskId: null })

      const noTask = deleteTask(s, "40")
      expect(noTask.tasks.map((t) => t.id)).toEqual(["41"])
      expect(noTask.entries.map((e) => e.taskId)).toEqual([null, null, "41"])
      expect(noTask.entries.map((e) => e.projectId)).toEqual(["30", "31", "30"])
      expect(noTask.autotrackers.map((r) => r.taskId)).toEqual([null, null])
      expect(noTask.favorites[0].draft).toMatchObject({ projectId: "30", taskId: null })
      expect(deleteTask(s, "41").autotrackers[0].taskId).toBe("40")
    }
    { // a tag leaves entries, rules and favourites that carried it, and counts only live entries
      const s = rich()
      expect(tagUsageCount(s, "50")).toBe(2)
      expect(tagUsageCount(s, "51")).toBe(1)
      expect(tagUsageCount(s, "ghost")).toBe(0)
      const gone = deleteTag(s, "50")
      expect(gone.tags.map((t) => t.id)).toEqual(["51"])
      expect(gone.entries.map((e) => e.tagIds)).toEqual([["51"], [], []])
      expect(gone.autotrackers.map((r) => r.tagIds)).toEqual([["51"], []])
      expect(gone.favorites[0].draft.tagIds).toEqual([])
      expect(deleteTag(s, "51").favorites[0].draft.tagIds).toEqual(["50"])
      expect(createTag(s, "  DEEP ", NOW)).toEqual({ state: s, id: "50" })
      const made = createTag(s, "  Fresh ", NOW)
      expect(made.state.tags.at(-1)).toMatchObject({ name: "Fresh", at: NOW, id: made.id })
      expect(createTag(made.state, "fresh", NOW)).toEqual({ state: made.state, id: made.id })
    }
    { // a member goes unless it is you, a group is dropped from its members, rules and webhooks go by id
      const s = rich()
      expect(deleteMember(s, "11").members.map((m) => m.id)).toEqual(["10"])
      expect(deleteMember(s, "10")).toBe(s)
      expect(deleteMember(s, "ghost")).toBe(s)
      const noGroup = deleteGroup(s, "g1")
      expect(noGroup.groups.map((g) => g.id)).toEqual(["g2"])
      expect(noGroup.members.find((m) => m.id === "11")!.groupIds).toEqual(["g2"])
      expect(noGroup.members.find((m) => m.id === "10")).toBe(s.members.find((m) => m.id === "10"))
      expect(deleteAutotracker(s, s.autotrackers[0].id).autotrackers.map((r) => r.keyword)).toEqual(["read"])
      const hooked = addWebhook(s, " https://example.com/hook ", ["time_entry.created"]).state
      expect(hooked.webhooks.map((h) => h.url)).toEqual(["https://example.com/hook"])
      expect(deleteWebhook(hooked, hooked.webhooks[0].id).webhooks).toEqual([])
    }
  })


})

describe("what a new project, a webhook and an invitation may be", () => {
  test("what a new project, a webhook, an invitation and a start link may be", () => {
    { // a project needs a name, dates in order, no negative amounts, and a period and first date when recurring
      const fields = (i: Parameters<typeof validateProject>[0]) => validateProject(i).map((v) => v.field)
      expect(fields({ name: "Ok" })).toEqual([])
      expect(fields({})).toEqual(["description"])
      expect(fields({ name: "   " })).toEqual(["description"])
      expect(fields({ name: "x", startDate: "2026-08-02", endDate: "2026-08-01" })).toEqual(["date"])
      expect(fields({ name: "x", startDate: "2026-08-01", endDate: "2026-08-01" })).toEqual([])
      expect(fields({ name: "x", startDate: null, endDate: "2026-08-01" })).toEqual([])
      for (const key of ["rate", "fixedFee", "estimatedAmount", "estimatedSeconds"] as const) {
        expect(fields({ name: "x", [key]: -1 }), key).toEqual(["project"])
        expect(fields({ name: "x", [key]: 0 }), key).toEqual([])
        expect(fields({ name: "x", [key]: null }), key).toEqual([])
      }
      expect(fields({ name: "x", recurring: true })).toEqual(["project", "date"])
      expect(fields({ name: "x", recurring: true, recurringPeriod: "weekly" })).toEqual(["date"])
      expect(fields({ name: "x", recurring: true, recurringPeriod: "weekly", recurringStart: "2026-08-03" })).toEqual([])
      expect(fields({ name: "x", recurring: false })).toEqual([])
    }
    { // a new project takes the workspace's defaults, a rate starts its history today, and a changed rate adds to it
      const s = baseState()
      const made = createProject(s, { name: "  New  ", rate: 120 }, NOW)
      const p = made.state.projects.find((x) => x.id === made.id)!
      expect(p).toMatchObject({ name: "New", active: true, isPrivate: true, billable: s.workspace.projectsBillableByDefault, currency: "EUR", rate: 120, rateHistory: [{ validFrom: "2026-08-12", rate: 120 }], estimateType: "hours", memberIds: ["10"], template: false, recurring: false, autoEstimates: false })
      const bare = createProject(s, { name: "Bare" }, NOW)
      expect(bare.state.projects.find((x) => x.id === bare.id)).toMatchObject({ rate: null, rateHistory: [], startDate: null, endDate: null, fixedFee: null, estimatedSeconds: null, estimatedAmount: null })
      const set = createProject(s, { name: "Set", active: false, isPrivate: false, billable: false, currency: "USD", estimateType: "monetary", memberIds: ["11"], template: true }, NOW)
      expect(set.state.projects.find((x) => x.id === set.id)).toMatchObject({ active: false, isPrivate: false, billable: false, currency: "USD", estimateType: "monetary", memberIds: ["11"], template: true })

      const up = updateProject(s, "30", { rate: 130 }, NOW)
      expect(up.projects[0].rateHistory).toEqual([...s.projects[0].rateHistory, { validFrom: "2026-08-12", rate: 130 }])
      const twice = updateProject(up, "30", { rate: 140 }, NOW)
      expect(twice.projects[0].rateHistory.filter((r) => r.validFrom === "2026-08-12")).toEqual([{ validFrom: "2026-08-12", rate: 140 }])
      expect(updateProject(s, "30", { rate: 100 }, NOW).projects[0].rateHistory).toEqual(s.projects[0].rateHistory)
      expect(updateProject(s, "30", { rate: null }, NOW).projects[0].rateHistory).toEqual(s.projects[0].rateHistory)
      expect(updateProject(s, "30", { name: "Renamed" }, NOW).projects[0]).toMatchObject({ name: "Renamed", at: NOW })
      expect(updateProject(s, "30", { startDate: "", endDate: "", recurringStart: "" }, NOW).projects[0]).toMatchObject({ startDate: null, endDate: null, recurringStart: null })
      expect(updateProject(s, "ghost", { name: "x" }, NOW)).toBe(s)
      expect(createTask(s, { projectId: "30", name: "  T " }, NOW).state.tasks.at(-1)).toMatchObject({ name: "T", estimatedSeconds: null, assigneeId: null, rate: null, active: true })
    }
    { // a webhook must be https, an invitation needs a name and a plain address not yet a member, and a start link carries only what exists
      const s = baseState()
      expect(addWebhook(s, "http://example.com/x", []).violations[0].message).toMatch(/http:\/\//)
      expect(addWebhook(s, "HTTP://example.com/x", []).violations[0].message).toMatch(/has to start with https:\/\/ — an http/)
      for (const bad of ["example.com/x", "https://", "https://a b", "ftp://x.y", ""]) {
        const out = addWebhook(s, bad, [])
        expect(out.violations[0].message, bad).toMatch(/not a webhook address/)
        expect(out.state).toBe(s)
      }
      expect(addWebhook(s, "HTTPS://Example.com/x", []).violations).toEqual([])

      expect(inviteRefusal(s, { name: "A", email: "a@b.co" })).toBeNull()
      expect(inviteRefusal(s, { name: " ", email: "a@b.co" })).toBe("Name and email are required")
      expect(inviteRefusal(s, { name: "A", email: " " })).toBe("Name and email are required")
      for (const bad of ["a", "a@b", "a b@c.de", "@b.co", "a@.co", "a@b.c@d.e"]) expect(inviteRefusal(s, { name: "A", email: bad }), bad).toMatch(/is not an email/)
      expect(inviteRefusal(s, { name: "A", email: " SAM@example.com " })).toBe("SAM@example.com is already a member of this workspace")

      const e = entry("1", "2026-08-10", "09:00", "10:00", { description: "Deep work", projectId: "30", taskId: "40", tagIds: ["50", "51"], billable: true })
      const link = startLinkFor(e, "https://x.test")
      const params = new URL(link).searchParams
      expect(link.startsWith("https://x.test/")).toBe(true)
      expect(params.get("start")).toBe("1")
      expect(draftFromStartLink(s, params)).toEqual({ description: "Deep work", projectId: "30", taskId: "40", tagIds: ["50", "51"], billable: true })
      const bare = new URL(startLinkFor(entry("2", "2026-08-10", "09:00", "10:00", { description: "", projectId: null, taskId: null, tagIds: [], billable: false }), "https://x.test")).searchParams
      expect([...bare.keys()]).toEqual(["start"])
      expect(draftFromStartLink(s, new URLSearchParams("project=nope&task=nope&tags=50,ghost,,51&description=x"))).toEqual({ description: "x", projectId: null, taskId: null, tagIds: ["50", "51"], billable: false })
      expect(draftFromStartLink(s, new URLSearchParams(""))).toEqual({ description: "", projectId: null, taskId: null, tagIds: [], billable: false })
    }
  })


})
