// @vitest-environment jsdom
/**
 * PINGS SWITCHED OFF BY A KEY CHANGE COME BACK WHEN THE PHONE HEALS IT
 * (alpha p9-pings-03, sev 4).
 *
 * A phone left unopened for five hours after the server's push key changed
 * had twenty pings refused (403), and a device that fails twenty times in a
 * row is switched off. The next open healed the key, but both switches stayed
 * off and Settings said "No device gets pings yet" with no reason.
 *
 * The heal is the move to the new address; it now brings the switches back to
 * what the phone last heard from the server. A switch the person turned off
 * stays off.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NEW_KEY, OLD_KEY, aWorld, leaveTheWorld, ping, rowsOf, world } from "./pushWorld"

vi.mock("@/src/db/notificationsRepo", async () => (await import("./pushWorld")).fakeRepo)
vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"
import { claimThisDevice } from "@/src/notifications/pushClient"

beforeEach(() => window.localStorage.clear())
afterEach(leaveTheWorld)

async function fiveHoursAway(row: { enabled: boolean; timerRunning: boolean }) {
  aWorld({ key: OLD_KEY, post: POST, row })
  world.serverKey = OLD_KEY
  expect(await claimThisDevice()).toBe("ok")
  world.serverKey = NEW_KEY
  for (let i = 0; i < 20; i++) ping()
}

describe("a phone opened after twenty pings were refused for its old key", () => {
  it("gets its pings and its running timer back", async () => {
    await fiveHoursAway({ enabled: true, timerRunning: true })
    expect(rowsOf("me")[0]).toMatchObject({ enabled: false, timerRunning: false })

    expect(await claimThisDevice()).toBe("ok")
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true, failures: 0 })])
    expect(ping().delivered).toBe(1)
  })

  it("keeps off a switch the person had turned off", async () => {
    await fiveHoursAway({ enabled: true, timerRunning: false })
    await claimThisDevice()
    expect(rowsOf("me")[0]).toMatchObject({ enabled: true, timerRunning: false })
  })
})
