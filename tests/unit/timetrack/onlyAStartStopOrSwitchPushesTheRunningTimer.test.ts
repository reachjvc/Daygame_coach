// @vitest-environment node
/**
 * THE RUNNING-TIMER NOTIFICATION FOLLOWS STARTS, STOPS AND SWITCHES — NOTHING ELSE
 * (Plans/time-tracker-like-toggl.md, Phase 7, Q4 scenarios 1–4).
 *
 * The sync route is where every device's writes land, so it is where a running
 * entry appears or ends. It reads the running entries before the write and
 * again after it, and the difference decides the push:
 *
 *   - a timer starts                  "● Gym · since 17:05", silent, with Stop;
 *   - it stops                        "Stopped · Gym 1:12", silent;
 *   - one ends and the next starts    the next one's notification replaces it;
 *   - only the description changed    nothing at all (scenario 3: twelve buzzes a
 *                                     day would be unbearable, and an edit is
 *                                     not a buzz-worthy event either).
 *
 * The pure half (`timerChange` and the payloads) is tested as functions; the
 * route half with its repo and the push service faked, the way
 * tests/unit/db/thePushRouteCapsWhatItAccepts.test.ts fakes them.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { runningPayload, stoppedPayload, timerChange, type TimerRow } from "@/src/timetrack/runningTimerService"

const ZONE = "Europe/Copenhagen"

function row(over: Partial<TimerRow> = {}): TimerRow {
  return {
    id: "gym",
    description: "Gym",
    projectName: null,
    startedAt: "2026-11-04T16:05:00.000000+00:00",
    stoppedAt: null,
    deletedAt: null,
    updatedAt: "2026-11-04T16:05:00.123456+00:00",
    ...over,
  }
}

describe("which changes are a start, a stop or a switch", () => {
  test("a timer that appears is a start", () => {
    expect(timerChange([], [row()])).toEqual({ kind: "running", entry: row() })
  })

  test("a timer that ends is a stop, carrying the stored stop time", () => {
    const stopped = row({ stoppedAt: "2026-11-04T17:17:00+00:00" })
    expect(timerChange([row()], [stopped])).toEqual({ kind: "stopped", entry: stopped })
  })

  test("one ending and the next starting is the next one running", () => {
    const next = row({ id: "email", description: "Email", startedAt: "2026-11-04T17:17:00+00:00" })
    expect(timerChange([row()], [row({ stoppedAt: "2026-11-04T17:17:00+00:00" }), next])).toEqual({ kind: "running", entry: next })
  })

  test("a running timer that is deleted is said to be deleted, not stopped", () => {
    const gone = row({ deletedAt: "2026-11-04T17:00:00+00:00" })
    expect(timerChange([row()], [gone])).toEqual({ kind: "deleted", entry: gone })
  })

  test("an edit of only the description or the project pushes nothing", () => {
    expect(timerChange([row()], [row({ description: "Gym, legs", updatedAt: "2026-11-04T16:30:00+00:00" })])).toBeNull()
    expect(timerChange([row()], [row({ projectName: "Health" })])).toBeNull()
  })

  test("a running timer whose start moved is pushed again, because the notification says 'since'", () => {
    const earlier = row({ startedAt: "2026-11-04T16:00:00+00:00" })
    expect(timerChange([row()], [earlier])).toEqual({ kind: "running", entry: earlier })
  })

  test("nothing running before or after pushes nothing", () => {
    expect(timerChange([], [])).toBeNull()
  })
})

describe("what the notification says", () => {
  const now = new Date("2026-11-04T16:30:00Z")

  test("a running timer: its name and its local start, silent, not renotifying, one Stop button", () => {
    const p = runningPayload(row(), ZONE, now)
    expect(p).toMatchObject({
      title: "● Gym · since 17:05",
      tag: "timer-running",
      kind: "timetrack-running",
      entryId: "gym",
      silent: true,
      renotify: false,
      url: "/time?view=timer",
      actions: [{ id: "stop", title: "Stop" }],
    })
    expect(p.body.length).toBeGreaterThan(0)
  })

  test("a timer with no description is named after its project, or said to be running", () => {
    expect(runningPayload(row({ description: "", projectName: "Health" }), ZONE, now).title).toBe("● Health · since 17:05")
    expect(runningPayload(row({ description: "  " }), ZONE, now).title).toBe("● Timer running · since 17:05")
  })

  test("a timer started on another day names the day", () => {
    const tomorrow = new Date("2026-11-05T09:00:00Z")
    expect(runningPayload(row(), ZONE, tomorrow).title).toBe("● Gym · since Wed 17:05")
  })

  test("a stopped timer: its name and its length, silent, no buttons", () => {
    const p = stoppedPayload(row({ stoppedAt: "2026-11-04T17:17:00+00:00" }), ZONE)
    expect(p).toMatchObject({ title: "Stopped · Gym 1:12", tag: "timer-running", silent: true, renotify: false })
    expect(p.actions ?? []).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

const USER = "user-1"
const tasks: (() => Promise<unknown>)[] = []
const sends: { kind: string; payload: Record<string, unknown> }[] = []

beforeEach(() => {
  vi.resetModules()
  tasks.length = 0
  sends.length = 0
  // The route reads the real clock for "since 17:05" vs "since Wed 17:05": pin
  // it to the rows' day, or the titles change at midnight after this was written.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-04T18:30:00Z"))
})
afterEach(() => {
  vi.useRealTimers()
  vi.doUnmock("@/src/db/auth")
  vi.doUnmock("@/src/db/timetrackRepo")
  vi.doUnmock("@/src/db/settingsRepo")
  vi.doUnmock("@/src/notifications/pushService")
  vi.doUnmock("@/src/shared/afterResponse")
})

/**
 * POST rows to the sync route, with the stored running entries `before` and
 * `after` the write, and `later`: what another device's write left by the
 * moment the push is about to go (the same as `after` unless given).
 */
async function sync(rows: Record<string, unknown[]>, before: TimerRow[], after: TimerRow[], later: TimerRow[] = after) {
  const reads: string[][] = []
  let written = false
  let readsAfter = 0
  vi.doMock("@/src/db/auth", () => ({ requireAuth: async () => ({ success: true, userId: USER }) }))
  vi.doMock("@/src/db/settingsRepo", () => ({ getUserTimezone: async () => ZONE }))
  vi.doMock("@/src/shared/afterResponse", () => ({ afterResponse: (task: () => Promise<unknown>) => void tasks.push(task) }))
  vi.doMock("@/src/notifications/pushService", () => ({
    sendToPerson: async (_u: string, kind: string, build: (id: string) => Record<string, unknown>) => {
      sends.push({ kind, payload: build("send-1") })
      return { sendId: "send-1", devices: 1, delivered: 1, removed: 0 }
    },
  }))
  vi.doMock("@/src/db/timetrackRepo", () => ({
    TimetrackWriteRefused: class extends Error {},
    pullTimetrackRows: async () => ({ rows: {}, cursor: "" }),
    timetrackIsEmpty: async () => false,
    readTimerState: async (_u: string, also: string[]) => {
      reads.push(also)
      if (!written) return before
      return readsAfter++ === 0 ? after : later
    },
    pushTimetrackRows: async () => {
      written = true
      return { applied: 1 }
    },
  }))
  const route = await import("@/app/api/timetrack/sync/route")
  const response = await route.POST(
    new Request("http://localhost/api/timetrack/sync", { method: "POST", body: JSON.stringify({ rows }) }),
  )
  expect(response.status).toBe(200)
  for (const task of tasks) await task()
  return { reads }
}

describe("the sync route pushes after the write lands", () => {
  test("a start sends the running notification", async () => {
    await sync({ timetrack_entries: [{ id: "gym" }] }, [], [row()])
    expect(sends).toHaveLength(1)
    expect(sends[0].kind).toBe("timetrack-running")
    expect(sends[0].payload).toMatchObject({ title: "● Gym · since 17:05", silent: true, renotify: false })
  })

  test("a stop sends the stopped notification", async () => {
    await sync({ timetrack_entries: [{ id: "gym" }] }, [row()], [row({ stoppedAt: "2026-11-04T17:17:00+00:00" })])
    expect(sends.map((s) => s.payload.title)).toEqual(["Stopped · Gym 1:12"])
  })

  test("a switch sends only the new timer", async () => {
    const next = row({ id: "email", description: "Email", startedAt: "2026-11-04T17:17:00+00:00" })
    await sync({ timetrack_entries: [{ id: "gym" }, { id: "email" }] }, [row()], [row({ stoppedAt: "2026-11-04T17:17:00+00:00" }), next])
    expect(sends.map((s) => s.payload.title)).toEqual(["● Email · since 18:17"])
  })

  test("an edit of only the description sends nothing", async () => {
    await sync({ timetrack_entries: [{ id: "gym" }] }, [row()], [row({ description: "Gym, legs" })])
    expect(sends).toEqual([])
  })

  test("the stop is looked for on the timer that was running, so its stop time is the stored one", async () => {
    const { reads } = await sync({ timetrack_entries: [{ id: "gym" }] }, [row()], [row({ stoppedAt: "2026-11-04T17:17:00+00:00" })])
    expect(reads.slice(0, 2)).toEqual([[], ["gym"]])
  })

  test("a stop overtaken by a newer start before its push goes sends nothing: the start's push says what is true", async () => {
    const email = row({ id: "email", description: "Email", startedAt: "2026-11-04T17:17:00+00:00" })
    await sync({ timetrack_entries: [{ id: "gym" }] }, [row()], [row({ stoppedAt: "2026-11-04T17:17:00+00:00" })], [email])
    expect(sends).toEqual([])
  })

  test("a start overtaken by its own stop sends nothing: the stop's push says what is true", async () => {
    await sync({ timetrack_entries: [{ id: "gym" }] }, [], [row()], [])
    expect(sends).toEqual([])
  })

  test("a start overtaken by a switch sends the newer timer", async () => {
    const email = row({ id: "email", description: "Email", startedAt: "2026-11-04T17:17:00+00:00" })
    await sync({ timetrack_entries: [{ id: "gym" }] }, [], [row()], [email])
    expect(sends.map((s) => s.payload.title)).toEqual(["● Email · since 18:17"])
  })

  test("a push carrying no entries reads nothing and sends nothing", async () => {
    const { reads } = await sync({ timetrack_tags: [{ id: "t1" }] }, [], [row()])
    expect(reads).toEqual([])
    expect(tasks).toEqual([])
    expect(sends).toEqual([])
  })
})
