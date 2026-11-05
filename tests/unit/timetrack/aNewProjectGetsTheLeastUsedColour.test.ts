/**
 * A NEW PROJECT GETS THE COLOUR FEWEST LIVE PROJECTS HAVE.
 *
 * The colour was the palette entry at `projects.length`, counting every
 * project ever made, so it could equal one already in use: a fresh agent
 * creating "Guitar" from the timer bar's picker got Gym's orange (Phase 6
 * findability, Plans/toggl-parity.md), and the two were one colour in every
 * list, block and chart. Now the colour used by the fewest live projects wins,
 * ties broken by palette order, for every way a project is made — the
 * pickers, the Projects page's form, templates and imports all reach
 * `createProject` or `nextProjectColor`.
 */

import { describe, expect, test } from "vitest"

import { PROJECT_COLORS } from "@/src/timetrack/config"
import { createProject, nextProjectColor } from "@/src/timetrack/timetrackService"
import type { Project, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

function withColours(colours: string[], extra: Partial<Project>[] = []): TimetrackState {
  const base = baseState()
  const make = (color: string, i: number, more: Partial<Project> = {}): Project => ({
    ...base.projects[0],
    id: `p${i}`,
    name: `Project ${i}`,
    color,
    active: true,
    template: false,
    ...more,
  })
  return baseState({ projects: [...colours.map((c, i) => make(c, i)), ...extra.map((more, i) => make(more.color ?? PROJECT_COLORS[0], 100 + i, more))] })
}

describe("a new project's colour", () => {
  test("is not one already in use while an unused one is left", () => {
    // three projects, the first of them in the palette's 4th colour (Gym's orange)
    const state = withColours([PROJECT_COLORS[3], PROJECT_COLORS[0], PROJECT_COLORS[1]])
    const made = createProject(state, { name: "Guitar" }, NOW_ISO)
    const guitar = made.state.projects.find((p) => p.id === made.id)!
    expect(state.projects.map((p) => p.color)).not.toContain(guitar.color)
    // the first unused colour, in palette order
    expect(guitar.color).toBe(PROJECT_COLORS[2])
  })

  test("with every colour in use, is one used by the fewest, first in palette order", () => {
    const all = [...PROJECT_COLORS]
    const state = withColours([...all, PROJECT_COLORS[0], PROJECT_COLORS[1]])
    expect(nextProjectColor(state)).toBe(PROJECT_COLORS[2])
  })

  test("does not count archived, template or deleted projects", () => {
    const state = withColours([PROJECT_COLORS[1]], [
      { color: PROJECT_COLORS[0], active: false },
      { color: PROJECT_COLORS[2], template: true },
    ])
    expect(nextProjectColor(state)).toBe(PROJECT_COLORS[0])
  })

  test("keeps a colour that was asked for", () => {
    const state = withColours([PROJECT_COLORS[0]])
    const made = createProject(state, { name: "Red", color: PROJECT_COLORS[0] }, NOW_ISO)
    expect(made.state.projects.find((p) => p.id === made.id)!.color).toBe(PROJECT_COLORS[0])
  })
})
