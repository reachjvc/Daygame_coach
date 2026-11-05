/**
 * WHAT @ AND # LIST IN THE PHONE'S NAME FIELD (Plans/toggl-parity.md Phase 3
 * item 2, D-PICKERS).
 *
 * Toggl's Android app lists the choices inline as you type [V1 0:32, 1:46]:
 * "No Project" first, the projects grouped by client, and a row that creates
 * the project you typed; # does the same for tags. The grouping and the
 * words are the PC pickers' (`projectGroups`: projects with no client first,
 * then each client A to Z; "Create “x”"), so the two sizes say the same thing.
 */

import { projectGroups } from "./pickerService"
import { searchProjects } from "./timetrackService"
import type { Id, TimetrackState } from "./types"

export type InlineChoice =
  | { kind: "header"; key: string; label: string }
  | { kind: "no-project"; key: string; label: string }
  | { kind: "project"; key: string; label: string; id: Id; color: string }
  | { kind: "create-project"; key: string; label: string; name: string }
  | { kind: "tag"; key: string; label: string; id: Id }
  | { kind: "create-tag"; key: string; label: string; name: string }

export const NO_PROJECT = "No Project"
export const createProjectLabel = (name: string) => (name ? `Create “${name}”` : "Create a new project")
export const createTagLabel = (name: string) => `Create “${name}”`

/** The rows for `@query` or `#query`, in order; headers are not choices */
export function inlineChoices(state: TimetrackState, token: { kind: "project" | "tag"; query: string }, limit = 12): InlineChoice[] {
  const query = token.query.trim()
  if (token.kind === "tag") {
    const tags = state.tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit)
    const rows: InlineChoice[] = tags.map((tag) => ({ kind: "tag", key: `tag:${tag.id}`, label: tag.name, id: tag.id }))
    if (query && !state.tags.some((tag) => tag.name.toLowerCase() === query.toLowerCase())) {
      rows.push({ kind: "create-tag", key: "create-tag", label: createTagLabel(query), name: query })
    }
    return rows
  }

  const rows: InlineChoice[] = [{ kind: "no-project", key: "no-project", label: NO_PROJECT }]
  for (const group of projectGroups(state, searchProjects(state, query, limit))) {
    if (group.client) rows.push({ kind: "header", key: `client:${group.client.id}`, label: group.client.name })
    for (const project of group.projects) rows.push({ kind: "project", key: `project:${project.id}`, label: project.name, id: project.id, color: project.color })
  }
  // with only @ typed it is still there, and asks for the name (`DescriptionField`'s caller)
  if (!state.projects.some((project) => project.active && project.name.toLowerCase() === query.toLowerCase())) {
    rows.push({ kind: "create-project", key: "create-project", label: createProjectLabel(query), name: query })
  }
  return rows
}
