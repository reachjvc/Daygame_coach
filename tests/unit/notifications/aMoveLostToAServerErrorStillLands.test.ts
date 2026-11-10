// @vitest-environment jsdom
/**
 * A DEVICE'S MOVE TO A NEW ADDRESS LANDS EVEN WHEN THE FIRST TRY IS LOST
 * (alpha p9-pings-01, sev 2).
 *
 * After the server's push key changes, the page replaces the browser's
 * subscription: the old address is dropped at the push service at once. If
 * the registration naming the move is lost (no signal, a 500, a 403), the next
 * ping finds the old address gone (410) and deletes the device's row. The
 * retried move then found nothing to move: the device and its timer switch
 * were lost until the person tapped "Turn on" again.
 *
 * Now the phone keeps the device's switches as the server last said them,
 * with the move, and names them when it sends the move again. A row gone in
 * the meantime is made again at the new address with those switches. Only the
 * person's own row, and never a second one.
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

/** The phone opened a page while the server still had the earlier key: all was well. */
async function aPhoneThatWorked() {
  const w = aWorld({ key: OLD_KEY, post: POST })
  world.serverKey = OLD_KEY
  expect(await claimThisDevice()).toBe("ok")
  world.serverKey = NEW_KEY
  return w
}

describe("a move whose first registration is lost, then a ping", () => {
  for (const lost of [500, 403, "abort"] as const) {
    it(`still lands at the next open, switches kept (${lost})`, async () => {
      await aPhoneThatWorked()
      world.devicesFail = lost
      expect(await claimThisDevice()).toBe("failed")
      // the old address is dropped: the ping deletes the row
      expect(ping().removed).toBe(1)
      expect(rowsOf("me")).toEqual([])

      world.devicesFail = null
      expect(await claimThisDevice()).toBe("ok")
      expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true })])
      expect(ping()).toEqual({ delivered: 1, removed: 0 })
    })
  }

  it("never makes a second row: the move made again, opened again, is still one device", async () => {
    await aPhoneThatWorked()
    world.devicesFail = 500
    await claimThisDevice()
    world.devicesFail = null
    // no ping in between: the row is still at the old address and simply moves
    await claimThisDevice()
    await claimThisDevice()
    expect(rowsOf("me")).toEqual([expect.objectContaining({ id: "d0", endpoint: world.current?.endpoint, enabled: true, timerRunning: true })])
  })

  it("makes nothing again for a row the server never had (the phone remembers no switches)", async () => {
    aWorld({ key: OLD_KEY, row: null, post: POST })
    await claimThisDevice()
    expect(rowsOf("me")).toEqual([])
  })
})
