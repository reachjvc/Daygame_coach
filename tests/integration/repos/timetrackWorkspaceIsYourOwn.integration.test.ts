/**
 * A FIRST UPLOAD GETS A WORKSPACE OF ITS OWN, WHATEVER WORKSPACE ID THE BROWSER OFFERS.
 *
 * A browser can hold another person's workspace — a shared computer, a session
 * that ended without Log Out. Its id went up with the next person's first
 * upload, and `resolveWorkspaceId` upserted that id as given: an upsert onto a
 * row that is somebody else's. Row security refused it, every push from the new
 * account failed with a 500, and it never saved anything (a privacy audit,
 * 2026-11-04). Row security held; the server still must not take the id on the
 * client's word.
 *
 * Through the app's own repo function, against the real schema and real row
 * security (tests/db/harness.ts), with two real accounts.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { pushTimetrackRows } from "@/src/db/timetrackRepo"
import type { TimetrackRows } from "@/src/db/timetrackTypes"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

function upload(workspaceId: string, entryId: string, userId: string, description: string): Partial<TimetrackRows> {
  const at = new Date().toISOString()
  return {
    timetrack_workspaces: [
      { id: workspaceId, user_id: userId, name: "Test WS", currency: "EUR", config: {}, updated_at: at, deleted_at: null },
    ],
    timetrack_entries: [
      {
        id: entryId,
        user_id: userId,
        workspace_id: workspaceId,
        description,
        started_at: "2026-11-04T09:00:00.000Z",
        stopped_at: "2026-11-04T10:00:00.000Z",
        duration_seconds: 3600,
        updated_at: at,
        deleted_at: null,
      },
    ],
  } as unknown as Partial<TimetrackRows>
}

async function workspacesOf(userId: string): Promise<string[]> {
  const rows = await asOwner((q) => q("select id from public.timetrack_workspaces where user_id = $1", [userId]))
  return rows.map((row) => String(row.id))
}

describe("a first upload offering a workspace id", () => {
  it("that is another account's saves into a workspace of the uploader's own, and leaves the other alone", async () => {
    const a = await newUser("tt-ws-a")
    const b = await newUser("tt-ws-b")
    const shared = `ws-${randomUUID()}`

    actAs(a)
    await pushTimetrackRows(a.id, upload(shared, `e-${randomUUID()}`, a.id, "A private therapy session"))
    expect(await workspacesOf(a.id)).toEqual([shared])

    // B's browser still holds A's workspace, and B's first upload offers its id
    actAs(b)
    const bEntry = `e-${randomUUID()}`
    await pushTimetrackRows(b.id, upload(shared, bEntry, b.id, "B own work"))

    const bWorkspaces = await workspacesOf(b.id)
    expect(bWorkspaces).toHaveLength(1)
    expect(bWorkspaces[0], "B was given A's workspace id").not.toBe(shared)
    const [stored] = await asOwner((q) =>
      q("select user_id, workspace_id from public.timetrack_entries where id = $1", [bEntry]),
    )
    expect(stored, "B's own work never reached B's account").toBeTruthy()
    expect(String(stored.user_id)).toBe(b.id)
    expect(String(stored.workspace_id)).toBe(bWorkspaces[0])
    expect(await workspacesOf(a.id), "A's workspace changed").toEqual([shared])
  })

  it("that is free is used as given, so the browser's ids still match", async () => {
    const c = await newUser("tt-ws-c")
    const offered = `ws-${randomUUID()}`
    actAs(c)
    await pushTimetrackRows(c.id, upload(offered, `e-${randomUUID()}`, c.id, "first upload"))
    expect(await workspacesOf(c.id)).toEqual([offered])
  })
})
