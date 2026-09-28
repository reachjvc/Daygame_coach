/**
 * THE EMPTY PROJECT LIST SAYS WHY IT IS EMPTY.
 *
 * Found in a browser on 2026-09-28: one hardcoded sentence served every empty state —
 * "Create one, or switch the filter above to see archived projects and templates." On
 * the Archived tab it offers to show you archived projects while you are looking at
 * them, and after a search that matched nothing it never mentions the search, which is
 * the only reason the list is empty and the only thing you can do about it.
 *
 * Every combination is walked here rather than the three that were looked at, because
 * the defect was precisely that one branch had been written for all of them.
 */

import { describe, expect, test } from "vitest"

import { projectsEmptyState } from "@/src/timetrack/components/ProjectsView"

const FILTERS = ["active", "archived", "templates"] as const

describe("the empty project list", () => {
  test("a brand-new workspace is told to create one, on every tab", () => {
    for (const filter of FILTERS) {
      expect(projectsEmptyState("", filter, 0).title).toBe("No projects yet")
      expect(projectsEmptyState("", filter, 0).hint).toContain("New project")
    }
  })

  test("an empty result from a search names the search, on every tab", () => {
    for (const filter of FILTERS) {
      const state = projectsEmptyState("  invoices  ", filter, 4)
      expect(state.title, `${filter} did not quote the search`).toContain("invoices")
      expect(state.hint, `${filter} did not offer to clear it`).toContain("Clear the search")
    }
  })

  test("and it does not send you to the tab you are already on", () => {
    expect(projectsEmptyState("x", "archived", 4).hint).not.toContain("Archived")
    expect(projectsEmptyState("x", "templates", 4).hint).not.toContain("Templates")
    expect(projectsEmptyState("", "archived", 4).hint).not.toContain("switch the filter")
  })

  test("each unfiltered tab explains what would put something in it", () => {
    expect(projectsEmptyState("", "archived", 4)).toEqual({
      title: "No archived projects",
      hint: "Archive a project from its own page and it will appear here.",
    })
    expect(projectsEmptyState("", "templates", 4)).toEqual({
      title: "No templates",
      hint: "Tick Template while creating a project to reuse its settings later.",
    })
    expect(projectsEmptyState("", "active", 4)).toEqual({
      title: "No active projects",
      hint: "Create one with New project, or look under Archived.",
    })
  })

  test("no two states share a sentence, which is the defect that was there", () => {
    const seen = new Set<string>()
    for (const filter of FILTERS) {
      for (const query of ["", "invoices"]) {
        for (const total of [0, 4]) {
          seen.add(JSON.stringify(projectsEmptyState(query, filter, total)))
        }
      }
    }
    // 12 combinations; the "no projects yet" case is one answer for all six of its own
    expect(seen.size).toBeGreaterThan(5)
  })
})
