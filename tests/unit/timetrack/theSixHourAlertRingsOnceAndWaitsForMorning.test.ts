// @vitest-environment node
/**
 * ONE ALERT WITH SOUND WHEN A TIMER PASSES 6 H, NEVER BETWEEN 23:00 AND 07:00
 * (Plans/time-tracker-like-toggl.md, Q4 scenario 5).
 *
 * The minute clock (`/api/notifications/tick`) asks every minute. The rule is
 * one pure function, `alertDecision`, read in the PERSON's zone, so 07:00 is
 * 07:00 on both sides of a clock change. The clock itself is tested with its
 * repo and the push service faked: it sends once per entry, with sound, and
 * skips what was already alerted or is being held for the morning.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { alertDecision, ALERT_AFTER_MS } from "@/src/timetrack/runningTimerService"

const CPH = "Europe/Copenhagen"
const H = 3_600_000

describe("when the alert may ring", () => {
  test("not before 6 h", () => {
    const start = "2026-11-04T07:00:00Z" // 08:00 in Copenhagen
    expect(ALERT_AFTER_MS).toBe(6 * H)
    expect(alertDecision(start, new Date(Date.parse(start) + 6 * H - 60_000), CPH)).toBe("not-yet")
    expect(alertDecision(start, new Date(Date.parse(start) + 6 * H), CPH)).toBe("send")
  })

  test("held from 23:00 until 07:00 local", () => {
    const start = "2026-11-04T10:00:00Z" // 11:00 local, 6 h at 17:00
    expect(alertDecision(start, new Date("2026-11-04T21:59:00Z"), CPH)).toBe("send") // 22:59
    expect(alertDecision(start, new Date("2026-11-04T22:00:00Z"), CPH)).toBe("hold") // 23:00
    expect(alertDecision(start, new Date("2026-11-05T05:59:00Z"), CPH)).toBe("hold") // 06:59
    expect(alertDecision(start, new Date("2026-11-05T06:00:00Z"), CPH)).toBe("send") // 07:00
  })

  /** Ticks every minute from the 6 h mark and returns the first instant the alert may ring. */
  function firstRing(start: string, zone: string): string {
    for (let t = Date.parse(start) + ALERT_AFTER_MS; t < Date.parse(start) + 30 * H; t += 60_000) {
      if (alertDecision(start, new Date(t), zone) === "send") return new Date(t).toISOString()
    }
    throw new Error("never rang")
  }

  test("a timer forgotten in the evening rings at 07:00, not at 6 h in the night", () => {
    // 20:00 local → 6 h at 02:00 → held → 07:00 CET is 06:00Z
    expect(firstRing("2026-11-04T19:00:00Z", CPH)).toBe("2026-11-05T06:00:00.000Z")
  })

  test("the night the clocks go back (Copenhagen, 25 Oct 2026) still waits for 07:00 local", () => {
    // 22:00 CEST on the 24th; the clocks fall back at 03:00 CEST; 07:00 CET is 06:00Z
    expect(firstRing("2026-10-24T20:00:00Z", CPH)).toBe("2026-10-25T06:00:00.000Z")
  })

  test("the night the clocks go forward (Copenhagen, 29 Mar 2026) still waits for 07:00 local", () => {
    // 21:00 CET on the 28th; the clocks jump at 02:00 CET; 07:00 CEST is 05:00Z
    expect(firstRing("2026-03-28T20:00:00Z", CPH)).toBe("2026-03-29T05:00:00.000Z")
  })

  test("it is the person's zone, not the server's (New York, the night US clocks go back)", () => {
    // 19:00 EDT on 31 Oct; 6 h at 01:00 EDT; clocks fall back at 02:00 EDT; 07:00 EST is 12:00Z
    expect(firstRing("2026-10-31T23:00:00Z", "America/New_York")).toBe("2026-11-01T12:00:00.000Z")
  })
})

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

interface Candidate {
  id: string
  userId: string
  description: string
  projectName: string | null
  startedAt: string
}

const sends: { userId: string; kind: string; entryId?: string; payload: Record<string, unknown> }[] = []

beforeEach(() => {
  vi.resetModules()
  sends.length = 0
})
afterEach(() => {
  vi.doUnmock("@/src/db/notificationsRepo")
  vi.doUnmock("@/src/notifications/pushService")
})

async function tick(now: Date, candidates: Candidate[], alerted: string[], zones: Record<string, string>, already: string[] = []) {
  vi.doMock("@/src/db/notificationsRepo", () => ({
    runningTimersPastAsServer: async (cutoff: Date) => candidates.filter((c) => Date.parse(c.startedAt) <= cutoff.getTime()),
    alertedEntryIds: async (ids: string[]) => new Set(ids.filter((id) => alerted.includes(id))),
    timezoneAsServer: async (userId: string) => zones[userId] ?? "UTC",
  }))
  vi.doMock("@/src/notifications/pushService", () => ({
    sendToPerson: async (userId: string, kind: string, build: (id: string) => Record<string, unknown>, _now: Date, options?: { entryId?: string }) => {
      if (options?.entryId && already.includes(options.entryId)) return { sendId: null, devices: 1, delivered: 0, removed: 0, alreadySent: true }
      sends.push({ userId, kind, entryId: options?.entryId, payload: build("send-1") })
      return { sendId: "send-1", devices: 1, delivered: 1, removed: 0 }
    },
  }))
  const { runTimerAlertClock } = await import("@/src/timetrack/runningTimerService")
  return runTimerAlertClock(now)
}

describe("one tick of the alert clock", () => {
  const now = new Date("2026-11-04T15:00:00Z") // 16:00 in Copenhagen, 10:00 in New York

  test("rings once for a timer past 6 h, with sound, carrying Stop", async () => {
    const result = await tick(
      now,
      [{ id: "gym", userId: "u1", description: "Gym", projectName: null, startedAt: "2026-11-04T08:00:00Z" }],
      [],
      { u1: CPH },
    )
    expect(sends).toHaveLength(1)
    expect(sends[0]).toMatchObject({ userId: "u1", kind: "timetrack-alert", entryId: "gym" })
    expect(sends[0].payload).toMatchObject({
      title: "● Gym · since 09:00",
      tag: "timer-running",
      silent: false,
      renotify: true,
      actions: [{ id: "stop", title: "Stop" }],
    })
    expect(result).toMatchObject({ sent: 1, held: 0 })
  })

  test("does not ring for a timer already alerted, nor one under 6 h", async () => {
    await tick(
      now,
      [
        { id: "old", userId: "u1", description: "Old", projectName: null, startedAt: "2026-11-04T07:00:00Z" },
        { id: "young", userId: "u1", description: "Young", projectName: null, startedAt: "2026-11-04T10:00:00Z" },
      ],
      ["old"],
      { u1: CPH },
    )
    expect(sends).toEqual([])
  })

  test("holds a person whose night it is, and rings for the one whose day it is", async () => {
    const result = await tick(
      new Date("2026-11-05T04:00:00Z"), // 05:00 in Copenhagen, 15:00 in Sydney
      [
        { id: "cph", userId: "u1", description: "Late work", projectName: null, startedAt: "2026-11-04T18:00:00Z" },
        { id: "syd", userId: "u2", description: "Surf", projectName: null, startedAt: "2026-11-04T20:00:00Z" },
      ],
      [],
      { u1: CPH, u2: "Australia/Sydney" },
    )
    expect(sends.map((s) => s.entryId)).toEqual(["syd"])
    expect(result).toMatchObject({ sent: 1, held: 1 })
  })

  test("a send the database already recorded for that entry is not counted as sent", async () => {
    const result = await tick(
      now,
      [{ id: "gym", userId: "u1", description: "Gym", projectName: null, startedAt: "2026-11-04T08:00:00Z" }],
      [],
      { u1: CPH },
      ["gym"],
    )
    expect(sends).toEqual([])
    expect(result).toMatchObject({ sent: 0 })
  })
})
