// @vitest-environment jsdom
/**
 * A DEVICE'S MOVE WAITING ON THE PHONE IS ONE ACCOUNT'S (alpha p9-pings-04,
 * sev 5).
 *
 * After a key change whose first registration was lost, the phone keeps the
 * move until the server has it. It survived Log Out and a session that ended:
 * the next person's page sent the previous person's old address, and its
 * success cleared the previous person's move.
 *
 *   - Log Out removes the move and the switches kept for it.
 *   - A session that ended without Log Out: the move names its account; the
 *     next person's page neither makes it nor clears it, nor is given the
 *     previous person's switches. The previous person's next sign-in lands it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NEW_KEY, OLD_KEY, aWorld, leaveTheWorld, ping, rowsOf, world } from "./pushWorld"

vi.mock("@/src/db/notificationsRepo", async () => (await import("./pushWorld")).fakeRepo)
vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"
import { POST as FORGET } from "@/app/api/notifications/devices/forget/route"
import { DEVICE_KEY, MOVE_KEY, claimThisDevice, forgetThisDevice } from "@/src/notifications/pushClient"

beforeEach(() => window.localStorage.clear())
afterEach(leaveTheWorld)

/** Account "me" on this phone; the key changed and the move's first registration was lost. */
async function aMoveWaiting() {
  const w = aWorld({ key: OLD_KEY, post: POST, forget: FORGET })
  world.serverKey = OLD_KEY
  expect(await claimThisDevice()).toBe("ok")
  world.serverKey = NEW_KEY
  world.devicesFail = 500
  await claimThisDevice()
  world.devicesFail = null
  expect(window.localStorage.getItem(MOVE_KEY)).not.toBeNull()
  return w
}

describe("a move waiting on the phone", () => {
  it("goes at Log Out, with the switches kept for it", async () => {
    await aMoveWaiting()
    await forgetThisDevice()
    expect(window.localStorage.getItem(MOVE_KEY)).toBeNull()
    expect(window.localStorage.getItem(DEVICE_KEY)).toBeNull()
  })

  it("is left alone by the next account's page, and lands at its own account's next sign-in", async () => {
    await aMoveWaiting()
    world.user = "someone-else"
    expect(await claimThisDevice()).toBe("ok")
    expect(rowsOf("someone-else")).toEqual([])
    expect(window.localStorage.getItem(MOVE_KEY), "the next person's page cleared the move").not.toBeNull()

    ping() // the old address is dropped: the row goes
    world.user = "me"
    expect(await claimThisDevice()).toBe("ok")
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true })])
    expect(rowsOf("someone-else")).toEqual([])
  })
})
