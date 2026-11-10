// @vitest-environment jsdom
/**
 * TWO TABS OPENING TOGETHER AFTER A KEY CHANGE KEEP THE DEVICE (alpha
 * p9-pings-02, sev 2).
 *
 * A browser restoring its tabs, or the installed app and a tab, opened /audit
 * at the same moment. Each page checked the subscription on its own, so both
 * replaced it: the row moved to the address the other tab then dropped, the
 * next ping deleted it, and later opens never noticed.
 *
 *   - The check runs one tab at a time across the browser (Web Locks): the
 *     second tab finds the first one's new subscription and keeps it.
 *   - A browser without Web Locks may still race; a later open then sees that
 *     the address the server last named is not the browser's own and moves (or
 *     makes again) the row there, switches kept.
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

/** A second tab: the client module loaded again, sharing the browser and its storage. */
async function anotherTab(): Promise<typeof import("@/src/notifications/pushClient")> {
  vi.resetModules()
  return import("@/src/notifications/pushClient")
}

async function aPhoneThatWorked(locks: boolean) {
  aWorld({ key: OLD_KEY, post: POST, locks })
  world.serverKey = OLD_KEY
  expect(await claimThisDevice()).toBe("ok")
  world.serverKey = NEW_KEY
}

describe("two tabs opening at once after a key change", () => {
  it("make one new subscription, and the device's row is at it", async () => {
    await aPhoneThatWorked(true)
    const tab2 = await anotherTab()
    await Promise.all([claimThisDevice(), tab2.claimThisDevice()])

    expect(world.made).toBe(1)
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true })])
    expect(ping()).toEqual({ delivered: 1, removed: 0 })
    expect(ping()).toEqual({ delivered: 1, removed: 0 })
  })

  it("without Web Locks, a later open puts the row back at the browser's address", async () => {
    await aPhoneThatWorked(false)
    const tab2 = await anotherTab()
    await Promise.all([claimThisDevice(), tab2.claimThisDevice()])
    ping()
    ping()

    const tab3 = await anotherTab()
    expect(await tab3.claimThisDevice()).toBe("ok")
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true })])
    expect(ping()).toEqual({ delivered: 1, removed: 0 })
  })
})
