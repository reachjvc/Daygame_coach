/**
 * A workspace saved before ids became text must survive, with every link
 * between its entries, projects, tasks and tags still pointing at the right
 * thing. The loader used to react to a version change by starting fresh, which
 * would have quietly deleted whatever the user had tracked.
 */

import { describe, expect, test } from "vitest"

import { migrateStateToV3 } from "@/src/timetrack/stateMigrationService"

/** A cut-down v2 workspace, shaped exactly like the real saved one */
const v2 = {
  version: 2,
  nextId: 107,
  workspace: { id: 1, name: "My Workspace" },
  members: [{ id: 10, workspaceId: 1, name: "You", groupIds: [4, 5], isSelf: true }],
  clients: [{ id: 100, workspaceId: 1, name: "Northwind" }],
  projects: [{ id: 101, workspaceId: 1, clientId: 100, name: "Coach App", memberIds: [10] }],
  tasks: [{ id: 102, projectId: 101, name: "Frontend", assigneeId: 10 }],
  tags: [{ id: 103, workspaceId: 1, name: "deep work" }],
  entries: [
    {
      id: 104,
      workspaceId: 1,
      userId: 10,
      description: "real work",
      projectId: 101,
      taskId: 102,
      tagIds: [103],
      sharedWith: [10],
      duration: 3600,
      start: "2026-08-10T09:00:00.000Z",
      stop: "2026-08-10T10:00:00.000Z",
      billable: true,
    },
    { id: 105, workspaceId: 1, userId: 10, description: "no project", projectId: null, taskId: null, tagIds: [], sharedWith: [], duration: 900 },
  ],
  favorites: [{ id: 106, workspaceId: 1, projectId: 101, tagIds: [103] }],
  user: { name: "You", weekStart: 1 },
}

describe("bringing a v2 workspace forward", () => {
  const migrated = migrateStateToV3(structuredClone(v2)) as typeof v2 & { version: number; nextId?: number }

  test("nothing is lost", () => {
    expect(migrated.entries).toHaveLength(2)
    expect(migrated.projects).toHaveLength(1)
    expect(migrated.tags).toHaveLength(1)
    expect(migrated.version).toBe(3)
  })

  test("every id is now text", () => {
    expect(migrated.workspace.id).toBe("1")
    expect(migrated.entries[0].id).toBe("104")
    expect(migrated.projects[0].id).toBe("101")
  })

  test("the links still point at the right things", () => {
    const entry = migrated.entries[0]
    expect(entry.projectId).toBe(migrated.projects[0].id)
    expect(entry.taskId).toBe(migrated.tasks[0].id)
    expect(entry.tagIds).toEqual([migrated.tags[0].id])
    expect(migrated.projects[0].clientId).toBe(migrated.clients[0].id)
    expect(migrated.tasks[0].assigneeId).toBe(migrated.members[0].id)
  })

  test("lists of ids convert too, not just single ones", () => {
    expect(migrated.members[0].groupIds).toEqual(["4", "5"])
    expect(migrated.projects[0].memberIds).toEqual(["10"])
    expect(migrated.entries[0].sharedWith).toEqual(["10"])
    expect(migrated.favorites[0].tagIds).toEqual(["103"])
  })

  test("an entry with no project keeps its nulls, rather than gaining a '0'", () => {
    expect(migrated.entries[1].projectId).toBeNull()
    expect(migrated.entries[1].taskId).toBeNull()
    expect(migrated.entries[1].tagIds).toEqual([])
  })

  test("things that are not ids are left alone", () => {
    expect(migrated.entries[0].duration).toBe(3600)
    expect(migrated.entries[0].billable).toBe(true)
    expect(migrated.entries[0].start).toBe("2026-08-10T09:00:00.000Z")
    expect(migrated.user.weekStart).toBe(1)
  })

  test("the old counter is gone", () => {
    expect(migrated.nextId).toBeUndefined()
  })

  test("running it twice changes nothing", () => {
    expect(migrateStateToV3(structuredClone(migrated))).toEqual(migrated)
  })
})
