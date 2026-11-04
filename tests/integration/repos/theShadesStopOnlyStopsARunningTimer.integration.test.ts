/**
 * THE SHADE'S STOP, AGAINST THE REAL SCHEMA (Plans/time-tracker-like-toggl.md,
 * Phase 7, Q4 scenario 7).
 *
 * `stopRunningTimer` reads the entry with the signed-in person's own client, so
 * row security decides what "yours" means, and writes the stop through
 * `timetrack_push` with the version it read as its base — the same versioned
 * write (D1) every device's sync goes through. That is what these check:
 *
 *   - a running entry of yours is stopped at the tap time, with its length;
 *   - a phone's later sync, carrying the copy it had while the timer ran,
 *     cannot start it again: its write is refused as stale;
 *   - an entry already stopped is left alone and the answer says when;
 *   - somebody else's entry is "not found", and stays running;
 *   - a stop before the entry's start, or of a deleted entry, changes nothing.
 *
 * And the route answers in words the notification can show.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import { call } from "@/tests/integration/routes/call"
import { stopRunningTimer } from "@/src/timetrack/runningTimerService"
import { pushTimetrackRows, readTimerEntry, writeTimerStop } from "@/src/db/timetrackRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import * as stopRoute from "@/app/api/timetrack/stop/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)
// The push that follows a stop is tested in theRunningTimerReachesOnlyDevicesThatAskedForIt.
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))

const START = "2026-11-04T16:05:00.000Z"
const TAP = "2026-11-04T17:17:00.000Z"

/** A person with one workspace and one entry, running unless `stoppedAt` is given. Arranged as the owner. */
async function personWithTimer(label: string, over: { stoppedAt?: string; deletedAt?: string; startedAt?: string } = {}) {
  const user = await newUser(label)
  const workspace = randomUUID()
  const entry = randomUUID()
  const start = over.startedAt ?? START
  await asOwner(async (q) => {
    await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'Mine')", [workspace, user.id])
    await q(
      `insert into timetrack_entries (id, user_id, workspace_id, description, started_at, stopped_at, duration_seconds, deleted_at, running_device_id)
       values ($1, $2, $3, 'Gym', $4, $5, $6, $7, $8)`,
      [
        entry,
        user.id,
        workspace,
        start,
        over.stoppedAt ?? null,
        over.stoppedAt ? Math.floor((Date.parse(over.stoppedAt) - Date.parse(start)) / 1000) : null,
        over.deletedAt ?? null,
        over.stoppedAt ? null : "phone-1",
      ],
    )
  })
  return { user, workspace, entry }
}

const stored = (entry: string) =>
  asOwner(async (q) =>
    (await q("select stopped_at, duration_seconds, running_device_id, deleted_at, updated_at, description from timetrack_entries where id = $1", [entry]))[0]!,
  )

async function as(user: TestUser) {
  actAs(user)
  return user
}

describe("stopping from the notification", () => {
  it("stops a running entry of yours at the tap time, with its length, through the versioned write", async () => {
    const { user, entry } = await personWithTimer("stop-running")
    const before = await stored(entry)
    await as(user)

    const answer = await stopRunningTimer(user.id, entry, TAP)

    expect(answer.outcome).toBe("stopped")
    const after = await stored(entry)
    expect(new Date(after.stopped_at as string).toISOString()).toBe(TAP)
    expect(after.duration_seconds).toBe(72 * 60)
    expect(after.running_device_id).toBeNull()
    expect(new Date(after.updated_at as string).getTime()).toBeGreaterThan(new Date(before.updated_at as string).getTime())
  })

  it("a phone's later sync with the copy it had while the timer ran cannot start it again", async () => {
    const { user, workspace, entry } = await personWithTimer("stop-then-stale-sync")
    const base = await asOwner(async (q) => (await q("select updated_at::text as v from timetrack_entries where id = $1", [entry]))[0]!.v as string)
    await as(user)
    expect((await stopRunningTimer(user.id, entry, TAP)).outcome).toBe("stopped")

    // The phone renamed the entry while it still believed it was running, and syncs now.
    const result = await pushTimetrackRows(
      user.id,
      {
        timetrack_entries: [
          {
            id: entry,
            user_id: user.id,
            workspace_id: workspace,
            description: "Gym, legs",
            started_at: START,
            stopped_at: null,
            duration_seconds: null,
            running_device_id: "phone-1",
          } as never,
        ],
      },
      { bases: { timetrack_entries: { [entry]: base } } },
    )

    expect(result.conflicts?.timetrack_entries?.map((r) => (r as { id: string }).id)).toEqual([entry])
    const after = await stored(entry)
    expect(after.stopped_at, "still stopped").not.toBeNull()
    expect(after.description, "the stale copy was refused whole").toBe("Gym")
  })

  it("leaves an entry already stopped alone, and says when it stopped", async () => {
    const { user, entry } = await personWithTimer("stop-already", { stoppedAt: "2026-11-04T17:00:00.000Z" })
    const before = await stored(entry)
    await as(user)

    const answer = await stopRunningTimer(user.id, entry, TAP)

    expect(answer).toMatchObject({ outcome: "already-stopped" })
    expect(answer.outcome === "already-stopped" && new Date(answer.entry.stoppedAt!).toISOString()).toBe("2026-11-04T17:00:00.000Z")
    expect(await stored(entry)).toEqual(before)
  })

  it("cannot stop somebody else's timer: it is not found, and keeps running", async () => {
    const { entry } = await personWithTimer("stop-owner")
    const stranger = await as(await newUser("stop-stranger"))

    expect(await stopRunningTimer(stranger.id, entry, TAP)).toEqual({ outcome: "not-found" })
    expect((await stored(entry)).stopped_at).toBeNull()
  })

  it("refuses a stop before the entry started, and changes nothing", async () => {
    const { user, entry } = await personWithTimer("stop-before-start")
    const before = await stored(entry)
    await as(user)

    expect((await stopRunningTimer(user.id, entry, "2026-11-04T16:00:00.000Z")).outcome).toBe("before-start")
    expect(await stored(entry)).toEqual(before)
  })

  it("does not stop a deleted entry", async () => {
    const { user, entry } = await personWithTimer("stop-deleted", { deletedAt: "2026-11-04T17:00:00.000Z" })
    await as(user)
    expect((await stopRunningTimer(user.id, entry, TAP)).outcome).toBe("deleted")
    expect((await stored(entry)).stopped_at).toBeNull()
  })

  it("the stop's own write is refused when the entry changed since it was read (D1), and changes nothing", async () => {
    const { user, entry } = await personWithTimer("stop-write-stale")
    await as(user)
    const read = (await readTimerEntry(user.id, entry))!
    // another device's sync lands between the read and the write
    await asOwner((q) => q("update timetrack_entries set description = 'Gym, legs' where id = $1", [entry]))
    const before = await stored(entry)

    expect(await writeTimerStop(read, TAP)).toBe("conflict")
    expect(await stored(entry)).toEqual(before)

    const fresh = (await readTimerEntry(user.id, entry))!
    expect(await writeTimerStop(fresh, TAP)).toBe("written")
    expect((await stored(entry)).duration_seconds).toBe(72 * 60)
  })
})

describe("the stop route answers in words the notification shows", () => {
  it("stops, then says 'already stopped at' in the person's own zone", async () => {
    // the route takes a tap up to now, so this entry runs from 72 minutes before it
    const tap = new Date(Date.now() - 60_000).toISOString()
    const { user, entry } = await personWithTimer("stop-route", { startedAt: new Date(Date.parse(tap) - 72 * 60_000).toISOString() })
    await as(user)
    await updateTimezone(user.id, "Europe/Copenhagen")
    const first = await call<{ outcome: string; title: string; body: string }>(stopRoute.POST, "/api/timetrack/stop", {
      method: "POST",
      body: { entryId: entry, at: tap },
    })
    expect(first.status, JSON.stringify(first.body)).toBe(200)
    expect(first.body.outcome).toBe("stopped")
    expect(first.body.title).toBe("Stopped · Gym 1:12")

    const second = await call<{ outcome: string; title: string }>(stopRoute.POST, "/api/timetrack/stop", {
      method: "POST",
      body: { entryId: entry, at: new Date().toISOString() },
    })
    expect(second.status).toBe(409)
    const local = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(tap))
    expect(second.body).toMatchObject({ outcome: "already-stopped", title: `Already stopped at ${local}` })
  })

  it("answers 404 for an entry that is not yours, in the same words as one that does not exist", async () => {
    const { entry } = await personWithTimer("stop-route-owner")
    await as(await newUser("stop-route-stranger"))
    const theirs = await call<{ error: string }>(stopRoute.POST, "/api/timetrack/stop", { method: "POST", body: { entryId: entry, at: new Date().toISOString() } })
    const nobodys = await call<{ error: string }>(stopRoute.POST, "/api/timetrack/stop", { method: "POST", body: { entryId: randomUUID(), at: new Date().toISOString() } })
    expect(theirs.status).toBe(404)
    expect(nobodys).toEqual(theirs)
  })
})
