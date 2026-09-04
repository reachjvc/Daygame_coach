import { describe, expect, test } from "vitest"

import { CREATED_WITH, SEED_CREATED_WITH } from "@/src/timetrack/config"
import { isDemoEntry, removeDemoData } from "@/src/timetrack/demoDataService"

import { NOW_ISO, baseState, entry } from "./helpers"

const demo = { createdWith: SEED_CREATED_WITH }
const mine = { createdWith: CREATED_WITH }

describe("legacy sample-data tagging", () => {
  test("only the old seeded rows count as sample data", () => {
    expect(isDemoEntry(entry(1, "2026-08-10", "09:00", "10:00", demo))).toBe(true)
    expect(isDemoEntry(entry(2, "2026-08-10", "09:00", "10:00", mine))).toBe(false)
  })
})

describe("removeDemoData", () => {
  test("removes demo entries and leaves your own untouched", () => {
    const state = baseState({
      entries: [
        entry(1, "2026-08-10", "09:00", "10:00", demo),
        entry(2, "2026-08-10", "10:00", "11:00", { ...mine, description: "book writing" }),
      ],
    })
    const result = removeDemoData(state)
    expect(result.removedEntries).toBe(1)
    expect(result.state.entries).toHaveLength(1)
    expect(result.state.entries[0].description).toBe("book writing")
  })

  test("removes a project only the demo used", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { ...demo, projectId: "30" })] })
    const result = removeDemoData(state)
    expect(result.state.projects.some((p) => p.id === "30")).toBe(false)
  })

  test("keeps a sample project you tracked your own time against", () => {
    const state = baseState({
      entries: [
        entry(1, "2026-08-10", "09:00", "10:00", { ...demo, projectId: "30" }),
        entry(2, "2026-08-10", "11:00", "12:00", { ...mine, projectId: "30" }),
      ],
    })
    const result = removeDemoData(state)
    expect(result.state.projects.some((p) => p.id === "30")).toBe(true)
    expect(result.state.entries).toHaveLength(1)
  })

  test("keeps tags you used and drops tags only the demo used", () => {
    const state = baseState({
      entries: [
        entry(1, "2026-08-10", "09:00", "10:00", { ...demo, tagIds: ["50"] }),
        entry(2, "2026-08-10", "11:00", "12:00", { ...mine, tagIds: ["51"] }),
      ],
    })
    const result = removeDemoData(state)
    expect(result.state.tags.map((t) => t.id)).toEqual(["51"])
  })

  test("never removes you from the member list", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { ...demo, userId: "11" })] })
    const result = removeDemoData(state)
    expect(result.state.members.some((m) => m.isSelf)).toBe(true)
  })

  test("drops favorites and alerts pointing at removed projects", () => {
    const state = baseState({
      entries: [entry(1, "2026-08-10", "09:00", "10:00", { ...demo, projectId: "30" })],
      favorites: [
        { id: "900", draft: { description: "x", projectId: "30", taskId: null, tagIds: [], billable: false }, at: NOW_ISO },
      ],
      alerts: [
        { id: "901", projectId: "30", basis: "estimate", threshold: 50, at: NOW_ISO, periodStart: "2026-08-01", read: false },
      ],
    })
    const result = removeDemoData(state)
    expect(result.state.favorites).toHaveLength(0)
    expect(result.state.alerts).toHaveLength(0)
  })

  test("does nothing when there is no demo data", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", mine)] })
    const result = removeDemoData(state)
    expect(result.removedEntries).toBe(0)
    expect(result.state).toBe(state)
  })
})
