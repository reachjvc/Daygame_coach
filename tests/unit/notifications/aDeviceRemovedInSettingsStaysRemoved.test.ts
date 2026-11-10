// @vitest-environment jsdom
/**
 * A DEVICE REMOVED IN SETTINGS STAYS REMOVED (review of 7d1e7328, sev 4).
 *
 * The move after a lost registration made a device's row again when it found
 * none, for the case where a ping had deleted it (410). It could not tell that
 * from the person removing the device in Settings on another device, so the
 * removed device came back with its pings. Now a 410 marks the row gone
 * instead of deleting it, the move brings a gone row back, and a row the
 * person removed is never made again.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NEW_KEY, OLD_KEY, aWorld, leaveTheWorld, ping, rowsOf, world } from "./pushWorld"

vi.mock("@/src/db/notificationsRepo", async () => (await import("./pushWorld")).fakeRepo)
vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"
import { fakeRepo } from "./pushWorld"
import { claimThisDevice } from "@/src/notifications/pushClient"

beforeEach(() => window.localStorage.clear())
afterEach(leaveTheWorld)

describe("a device whose move is waiting", () => {
  it("is not made again after the person removed it on another device", async () => {
    aWorld({ key: OLD_KEY, post: POST })
    world.serverKey = OLD_KEY
    expect(await claimThisDevice()).toBe("ok")
    world.serverKey = NEW_KEY
    world.devicesFail = 500
    expect(await claimThisDevice()).toBe("failed")
    // removed in Settings on the laptop
    await fakeRepo.removeDevice("me", { id: "d0" })
    world.devicesFail = null
    await claimThisDevice()
    expect([...world.rows.values()]).toEqual([])
  })

  it("comes back with its switches when a ping had only found its old address gone", async () => {
    aWorld({ key: OLD_KEY, row: { enabled: true, timerRunning: false }, post: POST })
    world.serverKey = OLD_KEY
    expect(await claimThisDevice()).toBe("ok")
    world.serverKey = NEW_KEY
    world.devicesFail = 500
    await claimThisDevice()
    expect(ping().removed).toBe(1)
    world.devicesFail = null
    expect(await claimThisDevice()).toBe("ok")
    expect(rowsOf("me")).toEqual([expect.objectContaining({ id: "d0", endpoint: world.current?.endpoint, enabled: true, timerRunning: false })])
  })
})
