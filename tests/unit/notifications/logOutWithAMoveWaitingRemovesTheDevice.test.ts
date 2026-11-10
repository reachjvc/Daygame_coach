// @vitest-environment jsdom
/**
 * LOG OUT WITH A MOVE WAITING REMOVES THE DEVICE (alpha p10-review-pings-05,
 * sev 5).
 *
 * After a key change whose first registration was lost, the device's row is
 * still at the old address, which the browser already dropped. Log Out told
 * the server to forget only the browser's current address, which has no row,
 * so the row stayed switched on and other devices' Settings listed it with
 * pings on. Log Out now also forgets the address the move is from.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NEW_KEY, OLD, OLD_KEY, aWorld, leaveTheWorld, rowsOf, world } from "./pushWorld"

vi.mock("@/src/db/notificationsRepo", async () => (await import("./pushWorld")).fakeRepo)
vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"
import { POST as FORGET } from "@/app/api/notifications/devices/forget/route"
import { MOVE_KEY, claimThisDevice, forgetThisDevice } from "@/src/notifications/pushClient"

beforeEach(() => window.localStorage.clear())
afterEach(leaveTheWorld)

describe("Log Out with a device move waiting", () => {
  it("removes the device's row at the address the move is from", async () => {
    aWorld({ key: OLD_KEY, post: POST, forget: FORGET })
    world.serverKey = OLD_KEY
    expect(await claimThisDevice()).toBe("ok")
    world.serverKey = NEW_KEY
    world.devicesFail = 500
    await claimThisDevice()
    world.devicesFail = null
    expect(window.localStorage.getItem(MOVE_KEY)).not.toBeNull()
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: OLD, enabled: true })])

    await forgetThisDevice()
    expect(rowsOf("me")).toEqual([])
  })

  it("leaves another account's row alone", async () => {
    aWorld({ key: OLD_KEY, post: POST, forget: FORGET })
    world.serverKey = OLD_KEY
    expect(await claimThisDevice()).toBe("ok")
    world.serverKey = NEW_KEY
    world.devicesFail = 500
    await claimThisDevice()
    world.devicesFail = null
    // the session ended without Log Out; someone else signs in here and logs out
    world.user = "someone-else"
    await forgetThisDevice()
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: OLD })])
  })
})
