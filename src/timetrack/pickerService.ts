/**
 * HOW THE PROJECT PICKER GROUPS WHAT IT OFFERS (D-PICKERS, Phase 6 of
 * Plans/toggl-parity.md).
 *
 * Toggl Track lists "No Project", then each client as a heading over its
 * projects [W25 11:07]. Here a project with no client comes first and needs no
 * heading — a workspace where no project has a client stays one plain list,
 * which is why the picker went flat before (a "No client" heading over every
 * row spent a line of a phone screen saying nothing). Clients go A to Z; inside
 * each group the projects keep `searchProjects`' order, most recently used
 * first, so the picker and the description field's autocomplete still agree.
 */

import { clientById } from "./timetrackService"
import type { Client, Project, TimetrackState } from "./types"

export interface ProjectGroup {
  /** null: the projects with no client, shown without a heading */
  client: Client | null
  projects: Project[]
}

export function projectGroups(state: TimetrackState, projects: Project[]): ProjectGroup[] {
  const loose: Project[] = []
  const byClient = new Map<string, { client: Client; projects: Project[] }>()
  for (const project of projects) {
    const client = clientById(state, project.clientId)
    if (!client) {
      loose.push(project)
      continue
    }
    const group = byClient.get(client.id) ?? { client, projects: [] }
    group.projects.push(project)
    byClient.set(client.id, group)
  }
  const clients = [...byClient.values()].sort((a, b) => a.client.name.localeCompare(b.client.name))
  return [...(loose.length > 0 ? [{ client: null, projects: loose }] : []), ...clients]
}
