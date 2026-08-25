/**
 * One-time cleanup of the sample data this page used to seed.
 *
 * New workspaces start empty (see data/emptyWorkspace.ts). This module only
 * exists so a browser that already stored the old demo history gets it removed
 * on load — without touching the entries you created yourself.
 */

import { SEED_CREATED_WITH } from "./config"
import type { Id, TimeEntry, TimetrackState } from "./types"

export function isDemoEntry(entry: TimeEntry): boolean {
  return entry.createdWith === SEED_CREATED_WITH
}

/**
 * Remove the seeded sample data, keeping everything you made yourself.
 *
 * Entries are identified by their SEED_CREATED_WITH tag. A project, client, tag
 * or member is only removed when *every* entry referencing it was demo data —
 * so if you tracked your own time against a sample project, it stays.
 */
export function removeDemoData(state: TimetrackState): {
  state: TimetrackState
  removedEntries: number
  removedProjects: number
} {
  const demoEntries = state.entries.filter(isDemoEntry)
  if (demoEntries.length === 0) return { state, removedEntries: 0, removedProjects: 0 }

  const kept = state.entries.filter((entry) => !isDemoEntry(entry))

  /** Ids still referenced by an entry you created */
  const keptProjects = new Set(kept.map((e) => e.projectId).filter((id): id is Id => id !== null))
  const keptTasks = new Set(kept.map((e) => e.taskId).filter((id): id is Id => id !== null))
  const keptTags = new Set(kept.flatMap((e) => e.tagIds))
  const keptMembers = new Set(kept.map((e) => e.userId))

  /** Ids that appeared on demo entries */
  const demoProjects = new Set(demoEntries.map((e) => e.projectId).filter((id): id is Id => id !== null))
  const demoTasks = new Set(demoEntries.map((e) => e.taskId).filter((id): id is Id => id !== null))
  const demoTags = new Set(demoEntries.flatMap((e) => e.tagIds))
  const demoMembers = new Set(demoEntries.map((e) => e.userId))

  const dropProject = (id: Id) => demoProjects.has(id) && !keptProjects.has(id)
  const dropTask = (id: Id) => demoTasks.has(id) && !keptTasks.has(id)
  const dropTag = (id: Id) => demoTags.has(id) && !keptTags.has(id)

  const projects = state.projects.filter((project) => !dropProject(project.id))
  const remainingProjectIds = new Set(projects.map((p) => p.id))
  const tasks = state.tasks.filter((task) => !dropTask(task.id) && remainingProjectIds.has(task.projectId))
  const tags = state.tags.filter((tag) => !dropTag(tag.id))
  const remainingTagIds = new Set(tags.map((t) => t.id))

  // A client goes only when none of its projects survived
  const clientsInUse = new Set(projects.map((p) => p.clientId).filter((id): id is Id => id !== null))
  const clients = state.clients.filter((client) => clientsInUse.has(client.id))

  const members = state.members.filter(
    (member) => member.isSelf || keptMembers.has(member.id) || !demoMembers.has(member.id),
  )
  const remainingMemberIds = new Set(members.map((m) => m.id))

  return {
    state: {
      ...state,
      entries: kept,
      projects,
      tasks,
      tags,
      clients,
      members,
      // drop anything that pointed at what we just removed
      favorites: state.favorites.filter(
        (favorite) =>
          (favorite.draft.projectId === null || remainingProjectIds.has(favorite.draft.projectId)) &&
          favorite.draft.tagIds.every((id) => remainingTagIds.has(id)),
      ),
      autotrackers: state.autotrackers.filter(
        (rule) => rule.projectId === null || remainingProjectIds.has(rule.projectId),
      ),
      alerts: state.alerts.filter((alert) => remainingProjectIds.has(alert.projectId)),
      approvals: state.approvals.filter((approval) => remainingMemberIds.has(approval.memberId)),
      groups: state.groups,
    },
    removedEntries: demoEntries.length,
    removedProjects: state.projects.length - projects.length,
  }
}
