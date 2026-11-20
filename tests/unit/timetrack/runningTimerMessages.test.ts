// @vitest-environment node
/**
 * What the lock-screen timer says and does, asserted on its outputs: which timer
 * counts as the running one, the words on the notification, the Stop button's
 * answers, and when the 6 h alert fires. The request parsing sits in
 * aStopFromTheShadeIsCheckedBeforeItCounts.
 */
import { beforeEach, describe, expect, test, vi } from "vitest"

const repo = vi.hoisted(() => ({
  readTimerEntry: vi.fn(),
  readTimerState: vi.fn(),
  writeTimerStop: vi.fn(),
  timerAlertsDueAsServer: vi.fn(),
  timezoneAsServer: vi.fn(),
  sendToPerson: vi.fn(),
}))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: async () => "UTC" }))
vi.mock("@/src/db/timetrackRepo", () => ({
  readTimerEntry: repo.readTimerEntry,
  readTimerState: repo.readTimerState,
  writeTimerStop: repo.writeTimerStop,
}))
vi.mock("@/src/db/notificationsRepo", () => ({
  timerAlertsDueAsServer: repo.timerAlertsDueAsServer,
  timezoneAsServer: repo.timezoneAsServer,
}))
vi.mock("@/src/notifications/pushService", () => ({ sendToPerson: repo.sendToPerson }))

import {
  alertDecision,
  announceTimerChange,
  deletedPayload,
  readStopRequest,
  runTimerAlertClock,
  runningPayload,
  stopRunningTimer,
  stoppedPayload,
  timerChange,
  timerName,
  type TimerRow,
} from "@/src/timetrack/runningTimerService"

const row = (id: string, startedAt: string, extra: Partial<TimerRow> = {}): TimerRow => ({
  id,
  description: "Gym",
  projectName: null,
  startedAt,
  stoppedAt: null,
  deletedAt: null,
  updatedAt: startedAt,
  ...extra,
})

beforeEach(() => vi.clearAllMocks())

describe("which timer is the running one", () => {
  test("which timer is the running one, and how a change is told", () => {
    { // the newest start, ties broken by id; the same timer again says nothing new
      vi.resetAllMocks()
      const old = row("a", "2026-11-19T08:00:00Z")
      const fresh = row("b", "2026-11-19T09:00:00Z")
      expect(timerChange([old], [old, fresh])).toEqual({ kind: "running", entry: fresh })
      expect(timerChange([old, fresh], [fresh, old])).toBeNull()
      const sameMoment = [row("z", "2026-11-19T09:00:00Z"), row("m", "2026-11-19T09:00:00Z")]
      expect(timerChange([], sameMoment)).toEqual({ kind: "running", entry: sameMoment[1] })
    }
    { // a stopped timer is told as stopped, a deleted or vanished one as deleted, nothing running before or after as nothing
      vi.resetAllMocks()
      const running = row("a", "2026-11-19T08:00:00Z")
      const stopped = { ...running, stoppedAt: "2026-11-19T09:00:00Z" }
      const deleted = { ...running, deletedAt: "2026-11-19T09:00:00Z" }
      expect(timerChange([running], [stopped])).toEqual({ kind: "stopped", entry: stopped })
      expect(timerChange([running], [deleted])).toEqual({ kind: "deleted", entry: deleted })
      expect(timerChange([running], [])).toEqual({ kind: "deleted", entry: running })
      expect(timerChange([stopped], [stopped])).toBeNull()
    }
  })
})

describe("the words on the notification", () => {
  test("the words on the notification", () => {
    { // a timer is named by what was typed, else its project, else a plain default; long names are cut with an ellipsis
      vi.resetAllMocks()
      expect(timerName({ description: "  Gym  ", projectName: "Health" })).toBe("Gym")
      expect(timerName({ description: " ", projectName: " Health " })).toBe("Health")
      expect(timerName({ description: "", projectName: null })).toBe("Timer running")
      expect(timerName({ description: "x".repeat(60), projectName: null })).toBe("x".repeat(60))
      expect(timerName({ description: "x".repeat(61), projectName: null })).toBe(`${"x".repeat(59)}…`)
    }
    { // running says since when (with the weekday if it began on another day), and the alert asks if it is still going
      vi.resetAllMocks()
      const now = new Date("2026-11-19T12:00:00Z")
      const today = runningPayload(row("a", "2026-11-19T09:05:00Z", { projectName: "Health" }), "UTC", now)
      expect(today).toMatchObject({ title: "● Gym · since 09:05", body: "Health", silent: true, renotify: false, entryId: "a", name: "Gym" })
      expect(today.actions).toEqual([{ id: "stop", title: "Stop" }])
      const earlier = runningPayload(row("a", "2026-11-18T22:30:00Z", { description: "" }), "UTC", now)
      expect(earlier).toMatchObject({ title: "● Timer running · since Wed 22:30", body: "Time Log" })
      const alert = runningPayload(row("a", "2026-11-19T05:00:00Z"), "UTC", now, { alert: true })
      expect(alert).toMatchObject({ body: "Running for over 6 h. Still going?", silent: false, renotify: true })
    }
    { // stopped says the length and the clock range; deleted says no timer is running; neither has buttons or sound
      vi.resetAllMocks()
      const stopped = stoppedPayload(row("a", "2026-11-19T09:05:00Z", { stoppedAt: "2026-11-19T10:50:00Z" }), "UTC")
      expect(stopped).toMatchObject({ title: "Stopped · Gym 1:45", body: "09:05–10:50", silent: true, renotify: false, actions: [] })
      expect(deletedPayload(row("a", "2026-11-19T09:05:00Z"))).toMatchObject({
        title: "Deleted · Gym",
        body: "No timer is running",
        silent: true,
        renotify: false,
        actions: [],
        tag: "timer-running",
      })
    }
  })


})

describe("the Stop button", () => {
  const at = "2026-11-19T10:00:00.000Z"

  test("the Stop button answers, retries and refuses", async () => {
    { // answers not-found, deleted, already-stopped and before-start without writing
      vi.resetAllMocks()
      repo.readTimerEntry.mockResolvedValueOnce(null)
      expect(await stopRunningTimer("u", "e", at)).toEqual({ outcome: "not-found" })
      const base = row("e", "2026-11-19T09:00:00.000Z")
      repo.readTimerEntry.mockResolvedValueOnce({ ...base, deletedAt: at })
      expect((await stopRunningTimer("u", "e", at)).outcome).toBe("deleted")
      repo.readTimerEntry.mockResolvedValueOnce({ ...base, stoppedAt: at })
      expect((await stopRunningTimer("u", "e", at)).outcome).toBe("already-stopped")
      repo.readTimerEntry.mockResolvedValueOnce({ ...base, startedAt: "2026-11-19T10:30:00.000Z" })
      expect((await stopRunningTimer("u", "e", at)).outcome).toBe("before-start")
      expect(repo.writeTimerStop).not.toHaveBeenCalled()
    }
    { // stops a running timer at the tap time; a stop at the very start is allowed
      vi.resetAllMocks()
      const entry = row("e", at)
      repo.readTimerEntry.mockResolvedValue(entry)
      repo.writeTimerStop.mockResolvedValue("written")
      expect(await stopRunningTimer("u", "e", at)).toEqual({ outcome: "stopped", entry: { ...entry, stoppedAt: at } })
    }
    { // looks again when the timer changed under it, and gives up after three tries instead of claiming a stop
      vi.resetAllMocks()
      const entry = row("e", "2026-11-19T09:00:00.000Z")
      repo.readTimerEntry.mockResolvedValue(entry)
      repo.writeTimerStop.mockResolvedValueOnce("changed").mockResolvedValueOnce("written")
      expect((await stopRunningTimer("u", "e", at)).outcome).toBe("stopped")
      expect(repo.readTimerEntry).toHaveBeenCalledTimes(2)

      vi.clearAllMocks()
      repo.readTimerEntry.mockResolvedValue(entry)
      repo.writeTimerStop.mockResolvedValue("changed")
      await expect(stopRunningTimer("u", "e", at)).rejects.toThrow(/kept changing/)
      expect(repo.writeTimerStop).toHaveBeenCalledTimes(3)
    }
    { // a request is refused for an id that only starts or ends like one, a date that does not exist, or a stop a day off the clock
      vi.resetAllMocks()
      const now = new Date("2026-11-19T12:00:00.000Z")
      const at = "2026-11-19T11:00:00.000Z"
      expect(readStopRequest({ entryId: "ok id", at }, now)).toHaveProperty("error")
      expect(readStopRequest({ entryId: "ok\nid", at }, now)).toHaveProperty("error")
      expect(readStopRequest({ entryId: "gym", at: "2026-02-31T10:00:00Z" }, now)).toHaveProperty("error")
      expect(readStopRequest({ entryId: "gym", at: "x2026-11-19T11:00:00Z" }, now)).toHaveProperty("error")
      expect(readStopRequest({ entryId: "gym", at: "2026-11-19T11:00:00Zjunk" }, now)).toHaveProperty("error")
      // a phone clock 2 days off is not trusted to correct the time; one 20 hours off is
      const wrong = readStopRequest({ entryId: "gym", at, sentAt: "2026-11-21T12:00:00.000Z" }, now)
      expect(wrong).toEqual({ entryId: "gym", at })
      const nearly = readStopRequest({ entryId: "gym", at: "2026-11-18T16:00:00.000Z", sentAt: "2026-11-18T16:00:00.000Z" }, now)
      expect(nearly).toEqual({ entryId: "gym", at: "2026-11-19T12:00:00.000Z" })
    }
  })



})

describe("the 6 h alert", () => {
  test("the 6 h alert waits, holds at night and counts failures; a change is announced once", async () => {
    { // the 6 h alert waits, holds at night, and one failure does not stop the others
      vi.resetAllMocks()
      { // waits for six hours, holds from 23:00 to 07:00 in the person's own zone, sends otherwise
        vi.resetAllMocks()
        const started = "2026-11-19T10:00:00.000Z"
        expect(alertDecision(started, new Date("2026-11-19T15:59:59.000Z"), "UTC")).toBe("not-yet")
        expect(alertDecision(started, new Date("2026-11-19T16:00:00.000Z"), "UTC")).toBe("send")
        expect(alertDecision(started, new Date("2026-11-19T22:59:00.000Z"), "UTC")).toBe("send")
        expect(alertDecision(started, new Date("2026-11-19T23:00:00.000Z"), "UTC")).toBe("hold")
        expect(alertDecision(started, new Date("2026-11-20T06:59:00.000Z"), "UTC")).toBe("hold")
        expect(alertDecision(started, new Date("2026-11-20T07:00:00.000Z"), "UTC")).toBe("send")
        // 07:30 in Copenhagen is 06:30 UTC: past the night there, though still night in UTC
        expect(alertDecision(started, new Date("2026-11-20T06:30:00.000Z"), "Europe/Copenhagen")).toBe("send")
      }
      { // counts what it sent, held and could not send, and one failure does not stop the others
        vi.resetAllMocks()
        const now = new Date("2026-11-20T12:00:00.000Z")
        const c = (userId: string, id: string, startedAt: string) => ({ userId, id, description: "Gym", projectName: null, startedAt })
        repo.timerAlertsDueAsServer.mockResolvedValue([
          c("u1", "a", "2026-11-20T05:00:00.000Z"),
          c("u2", "b", "2026-11-20T05:00:00.000Z"),
          c("u3", "c", "2026-11-20T09:00:00.000Z"),
          c("u4", "d", "2026-11-20T05:00:00.000Z"),
        ])
        repo.timezoneAsServer.mockImplementation(async (u: string) => (u === "u2" ? "Pacific/Auckland" : "UTC"))
        repo.sendToPerson.mockImplementation(async (u: string) => {
          if (u === "u4") throw new Error("push down")
          return { sendId: "s" }
        })
        vi.spyOn(console, "error").mockImplementation(() => {})
        expect(await runTimerAlertClock(now)).toEqual({ candidates: 4, sent: 1, held: 1, failed: 1 })
      }
    }
    { // announces a stop only when no other timer is running, and the running one when a new one began
      vi.resetAllMocks()
      const stopped = row("a", "2026-11-19T08:00:00Z", { stoppedAt: "2026-11-19T09:00:00Z" })
      const was = row("a", "2026-11-19T08:00:00Z")
      repo.readTimerState.mockResolvedValueOnce([stopped]).mockResolvedValueOnce([stopped])
      repo.sendToPerson.mockResolvedValue({ sendId: "s" })
      await announceTimerChange("u", [was], new Date("2026-11-19T09:00:00Z"))
      expect(repo.sendToPerson).toHaveBeenCalledTimes(1)
      expect(repo.sendToPerson.mock.calls[0][3]).toBeInstanceOf(Date)

      vi.clearAllMocks()
      const other = row("b", "2026-11-19T08:30:00Z")
      repo.readTimerState.mockResolvedValueOnce([stopped, other]).mockResolvedValueOnce([stopped, other])
      await announceTimerChange("u", [was], new Date("2026-11-19T09:00:00Z"))
      expect(repo.sendToPerson).toHaveBeenCalledTimes(1)
      const payload = repo.sendToPerson.mock.calls[0][2]()
      expect(payload.title).toContain("Gym")
      expect(payload.silent).toBe(true)
      expect(payload.actions).toEqual([{ id: "stop", title: "Stop" }])

      vi.clearAllMocks()
      repo.readTimerState.mockResolvedValue([was])
      await announceTimerChange("u", [was])
      expect(repo.sendToPerson).not.toHaveBeenCalled()
    }
  })
})
