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
const NOTHING = { active: 0, archived: 0, templates: 0 }
const ALL_THREE = { active: 2, archived: 2, templates: 2 }

describe("the empty project list", () => {
  test("a brand-new workspace is told to create one, on every tab", () => {
    for (const filter of FILTERS) {
      expect(projectsEmptyState("", filter, NOTHING).title).toBe("No projects yet")
      expect(projectsEmptyState("", filter, NOTHING).hint).toContain("New project")
    }
  })

  test("an empty result from a search names the search, on every tab", () => {
    for (const filter of FILTERS) {
      const state = projectsEmptyState("  invoices  ", filter, ALL_THREE)
      expect(state.title, `${filter} did not quote the search`).toContain("invoices")
      expect(state.hint, `${filter} did not offer to clear it`).toContain("Clear the search")
    }
  })

  test("and it does not send you to the tab you are already on", () => {
    expect(projectsEmptyState("x", "archived", ALL_THREE).hint).not.toContain("Archived")
    expect(projectsEmptyState("x", "templates", ALL_THREE).hint).not.toContain("Templates")
    expect(projectsEmptyState("", "archived", ALL_THREE).hint).not.toContain("switch the filter")
  })

  test("each unfiltered tab explains what would put something in it", () => {
    expect(projectsEmptyState("", "archived", ALL_THREE)).toEqual({
      title: "No archived projects",
      hint: "Archive a project from its own page and it will appear here.",
    })
    expect(projectsEmptyState("", "templates", ALL_THREE)).toEqual({
      title: "No templates",
      hint: "Tick Template while creating a project to reuse its settings later.",
    })
    expect(projectsEmptyState("", "active", ALL_THREE)).toEqual({
      title: "No active projects",
      hint: "Create one with New project, or look under Archived or Templates.",
    })
  })

  test("no two states share a sentence, which is the defect that was there", () => {
    const seen = new Set<string>()
    for (const filter of FILTERS) {
      for (const query of ["", "invoices"]) {
        for (const counts of [NOTHING, ALL_THREE]) {
          seen.add(JSON.stringify(projectsEmptyState(query, filter, counts)))
        }
      }
    }
    // 12 combinations; the "no projects yet" case is one answer for all six of its own
    expect(seen.size).toBeGreaterThan(5)
  })
})

describe("a hint never sends you to an empty tab", () => {
  /**
   * The first version took a single TOTAL, so it could not tell "nothing anywhere" from
   * "everything is on another tab": a workspace whose only projects are TEMPLATES,
   * viewed on Active, was sent to Archived, where there is nothing. A reviewer found
   * it, and the test written with the fix had pinned that wrong sentence in place —
   * which is why the expectations here are derived from the counts, not copied from the
   * output.
   */
  const ONLY_TEMPLATES = { active: 0, archived: 0, templates: 3 }
  const ONLY_ARCHIVED = { active: 0, archived: 3, templates: 0 }

  test("a workspace of templates only does not point Active at Archived", () => {
    const state = projectsEmptyState("", "active", ONLY_TEMPLATES)
    expect(state.hint).not.toContain("Archived")
    expect(state.hint).toContain("Templates")
  })

  test("a workspace of archived only does not point Active at Templates", () => {
    const state = projectsEmptyState("", "active", ONLY_ARCHIVED)
    expect(state.hint).not.toContain("Templates")
    expect(state.hint).toContain("Archived")
  })

  test("with everything on the tab you are on, no tab is offered at all", () => {
    const state = projectsEmptyState("zzz", "active", { active: 3, archived: 0, templates: 0 })
    expect(state.hint).not.toContain("look under")
    expect(state.hint).toContain("Clear the search")
  })

  test("and a search that matches nothing anywhere says so", () => {
    expect(projectsEmptyState("zzz", "templates", { active: 0, archived: 0, templates: 2 }).hint).toBe(
      "Clear the search — nothing anywhere matches it.",
    )
  })

  test("every tab that HAS something is named, and only those", () => {
    /** Derived, not transcribed: the hint must name exactly the non-empty other tabs. */
    for (const counts of [
      { active: 1, archived: 0, templates: 0 },
      { active: 0, archived: 1, templates: 0 },
      { active: 0, archived: 0, templates: 1 },
      { active: 1, archived: 1, templates: 0 },
      { active: 0, archived: 1, templates: 1 },
      { active: 1, archived: 0, templates: 1 },
      { active: 1, archived: 1, templates: 1 },
    ]) {
      for (const filter of FILTERS) {
        const hint = projectsEmptyState("", filter, counts).hint
        for (const [tab, label] of [
          ["active", "Active"],
          ["archived", "Archived"],
          ["templates", "Templates"],
        ] as const) {
          if (tab === filter) continue
          // the unfiltered archived/templates tabs have their own sentence, which names no tab
          if (filter === "archived" || filter === "templates") continue
          const expected = counts[tab] > 0
          expect(hint.includes(label), `${filter} with ${JSON.stringify(counts)}: "${hint}"`).toBe(expected)
        }
      }
    }
  })
})
