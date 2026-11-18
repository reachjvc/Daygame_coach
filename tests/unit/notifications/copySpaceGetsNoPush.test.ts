/**
 * THE COPY SPACE'S ACCOUNT GETS NO PUSH, FROM ANY SENDER (Plans/plan-in-steps.md, D7).
 *
 * Every sender reaches a phone through `sendToPerson`, and the two clocks that
 * write send records before it (the weekly review and the council) skip a hidden
 * account at the top of their loop. Faked at the edges, so each can be asked
 * "what if the account were hidden".
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const HIDDEN = "00000000-0000-4000-8000-0000000000c3"
const REAL = "00000000-0000-4000-8000-0000000000a1"

const repo = vi.hoisted(() => ({
  devicesForSending: vi.fn(async () => [] as unknown[]),
  devicesForTimer: vi.fn(async () => [] as unknown[]),
  openSend: vi.fn(async () => "send-1" as string | null),
  closeSend: vi.fn(async () => {}),
  readNotificationSecret: vi.fn(async () => "x"),
  recordDeviceOutcome: vi.fn(async () => {}),
}))
vi.mock("@/src/db/notificationsRepo", () => repo)
vi.mock("web-push", () => ({ default: { sendNotification: vi.fn(), setVapidDetails: vi.fn() } }))
const lookup = vi.hoisted(() => ({ fails: false }))
vi.mock("@/src/db/planSandbox", () => ({
  isSandboxUser: async (id: string) => {
    if (lookup.fails) throw new Error("lookup down")
    return id === HIDDEN
  },
}))

const reminders = vi.hoisted(() => ({
  remindersDueAsServer: vi.fn(),
  weekReviewWrittenAsServer: vi.fn(async () => true),
}))
vi.mock("@/src/db/lifePlanRemindersRepo", () => reminders)

const council = vi.hoisted(() => ({ councilRemindersDueAsServer: vi.fn(), readCouncilAsServer: vi.fn(async () => []) }))
vi.mock("@/src/db/roleModelsRepo", async (orig) => ({ ...(await orig<object>()), ...council }))

import { sendToPerson } from "@/src/notifications/pushService"
import { runPlanReviewClock } from "@/src/goals/reviewReminderService"
import { runCouncilReminderClock } from "@/src/role-models/councilReminderService"

beforeEach(() => {
  vi.clearAllMocks()
  lookup.fails = false
})

describe("sendToPerson", () => {
  it.each(["test", "plan-review", "council-daily", "audit-ping", "timetrack-running", "timetrack-alert"] as const)(
    "sends nothing of kind %s to a hidden account, and does not even look up its devices",
    async (kind) => {
      const out = await sendToPerson(HIDDEN, kind, () => ({ title: "t", body: "b", url: "/" }) as never)
      expect(out).toEqual({ sendId: null, devices: 0, delivered: 0, removed: 0 })
      expect(repo.devicesForSending).not.toHaveBeenCalled()
      expect(repo.devicesForTimer).not.toHaveBeenCalled()
      expect(repo.openSend).not.toHaveBeenCalled()
    },
  )

  it("still looks up a real account's devices", async () => {
    await sendToPerson(REAL, "plan-review", () => ({ title: "t", body: "b", url: "/" }) as never).catch(() => {})
    expect(repo.devicesForSending).toHaveBeenCalledWith(REAL)
  })
})

describe("the clocks", () => {
  it("the weekly review clock leaves a hidden account out, with no record of a send", async () => {
    reminders.remindersDueAsServer.mockResolvedValue([{ user_id: HIDDEN, local_day: "2026-11-15", review_day: 7 }])
    const out = await runPlanReviewClock(new Date("2026-11-15T18:05:00Z"))
    expect(out).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(repo.openSend).not.toHaveBeenCalled()
    expect(reminders.weekReviewWrittenAsServer).not.toHaveBeenCalled()
  })

  it("the council clock leaves a hidden account out, with no record of a send", async () => {
    council.councilRemindersDueAsServer.mockResolvedValue([{ user_id: HIDDEN, local_day: "2026-11-15", tz: "UTC" }])
    const out = await runCouncilReminderClock(new Date("2026-11-15T18:05:00Z"))
    expect(out).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(repo.openSend).not.toHaveBeenCalled()
    expect(council.readCouncilAsServer).not.toHaveBeenCalled()
  })

  it("a failed lookup counts one item as failed and does not stop the clock, or send", async () => {
    lookup.fails = true
    reminders.remindersDueAsServer.mockResolvedValue([
      { user_id: REAL, local_day: "2026-11-15", review_day: 7 },
      { user_id: HIDDEN, local_day: "2026-11-15", review_day: 7 },
    ])
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const out = await runPlanReviewClock(new Date("2026-11-15T18:05:00Z"))
    logged.mockRestore()
    expect(out).toEqual({ sent: 0, skipped: 0, failed: 2 })
    expect(repo.openSend).not.toHaveBeenCalled()
  })
})
