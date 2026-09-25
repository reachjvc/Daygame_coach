/**
 * Finding your own project, which used to be harder than it looks.
 *
 * Three things were wrong at once. The picker matched the project's name and
 * nothing else, so "the Acme one" and "the one with the review task" found
 * nothing. It ordered by client name and then alphabetically, so the project
 * you use every day could be anywhere. And in the description box, plain text
 * matched nothing at all — `@` was the only way in, and at phone width nothing
 * on the screen said so, because the only place that grammar was written down
 * is a shortcut overlay that is `hidden sm:inline-flex`.
 */

import { describe, expect, test } from "vitest"

import {
  projectsForDescription,
  projectLastUsed,
  projectMatches,
  searchProjects,
} from "@/src/timetrack/timetrackService"
import type { Project, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

/** baseState has "Alpha" (client Acme, tasks Build/Review) and "Beta" */
const names = (projects: Project[]) => projects.map((p) => p.name)

function withProject(state: TimetrackState, id: string, name: string): TimetrackState {
  return {
    ...state,
    projects: [...state.projects, { ...state.projects[1], id, name, clientId: null, at: NOW_ISO }],
  }
}

describe("what a search matches", () => {
  test("the project's own name, as a fragment", () => {
    expect(names(searchProjects(baseState(), "lph"))).toEqual(["Alpha"])
  })

  test("the name of a task under it — 'the one with the review task'", () => {
    expect(names(searchProjects(baseState(), "review"))).toEqual(["Alpha"])
  })

  test("the client it belongs to — 'the Acme one'", () => {
    expect(names(searchProjects(baseState(), "acme"))).toEqual(["Alpha"])
  })

  test("an archived project is never offered", () => {
    const state = baseState()
    const archived = { ...state, projects: state.projects.map((p) => ({ ...p, active: false })) }
    expect(searchProjects(archived, "")).toEqual([])
  })

  test("projectMatches with no query accepts everything, so an empty box lists all", () => {
    const state = baseState()
    expect(projectMatches(state, state.projects[0], "   ")).toBe(true)
  })
})

describe("what order they come in", () => {
  test("most recently tracked against comes first, not the alphabet", () => {
    const state = baseState({
      entries: [
        entry(1, "2026-08-01", "09:00", "10:00", { projectId: "30" }),
        entry(2, "2026-08-09", "09:00", "10:00", { projectId: "31" }),
      ],
    })
    // alphabetically this is Alpha then Beta; by use it is Beta then Alpha
    expect(names(searchProjects(state, ""))).toEqual(["Beta", "Alpha"])
  })

  test("a project never used sits behind every project that has been", () => {
    const state = withProject(baseState({ entries: [entry(1, "2026-08-01", "09:00", "10:00", { projectId: "31" })] }), "32", "Aardvark")
    expect(names(searchProjects(state, ""))).toEqual(["Beta", "Aardvark", "Alpha"])
  })

  test("a deleted entry does not count as having used its project", () => {
    const state = baseState({
      entries: [entry(1, "2026-08-09", "09:00", "10:00", { projectId: "31", serverDeletedAt: NOW_ISO })],
    })
    expect(projectLastUsed(state).has("31")).toBe(false)
  })
})

describe("a plain description, with no @ typed", () => {
  test("text you are reaching the name with offers the project", () => {
    expect(names(projectsForDescription(baseState(), "alp"))).toEqual(["Alpha"])
  })

  test("a name already inside the sentence offers the project", () => {
    expect(names(projectsForDescription(baseState(), "alpha rewrite, second pass"))).toEqual(["Alpha"])
  })

  test("one character is not a question", () => {
    expect(projectsForDescription(baseState(), "a")).toEqual([])
  })

  test("a name buried inside a longer word is NOT a match", () => {
    // "Art" inside "start" is the false positive that would make this panel
    // appear over the entry list for no reason
    const state = withProject(baseState(), "32", "Art")
    expect(names(projectsForDescription(state, "start the day"))).toEqual([])
  })

  test("a two-letter project is held to the reaching rule alone", () => {
    const state = withProject(baseState(), "32", "QA")
    expect(names(projectsForDescription(state, "qa"))).toEqual(["QA"])
    expect(names(projectsForDescription(state, "wrote the qa notes"))).toEqual([])
  })

  test("a name with regex punctuation in it is looked for, not compiled", () => {
    const state = withProject(baseState(), "32", "C++ (v2)")
    expect(names(projectsForDescription(state, "shipping c++ (v2) today"))).toEqual(["C++ (v2)"])
  })

  test("it offers at most a handful, because it covers the entry list", () => {
    let state = baseState()
    for (let i = 0; i < 8; i++) state = withProject(state, `9${i}`, `Writing ${i}`)
    expect(projectsForDescription(state, "writing").length).toBeLessThanOrEqual(4)
  })
})
