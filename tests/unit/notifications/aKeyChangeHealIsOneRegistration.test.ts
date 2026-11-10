// @vitest-environment jsdom
/**
 * A KEY-CHANGE HEAL IS ONE REGISTRATION, AND THE SWITCHES COME BACK
 * (alpha p10-review-pings-04, = p9-pings-03).
 *
 * After twenty refused sends switched the device off, the page opened and two
 * of its parts (the layout's claim and the audit's device hook) each posted
 * the same move at once. One moved the row and put the switches back, the
 * other read the moved row while it was still off and registered it off
 * again: 6 runs in 8 ended healed with both switches off. Now a page sends one
 * registration however many parts ask, and the server moves the row and
 * restores its switches in one write, so a second post can never read it
 * half done.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NEW_KEY, OLD_KEY, aWorld, leaveTheWorld, ping, rowsOf, world } from "./pushWorld"

// Each write takes a moment, as a database does, so two posts can overlap.
vi.mock("@/src/db/notificationsRepo", async () => {
  const { fakeRepo } = await import("./pushWorld")
  const slow =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A) => {
      await new Promise((r) => setTimeout(r, 5))
      return fn(...a)
    }
  return { ...fakeRepo, registerDevice: slow(fakeRepo.registerDevice), moveDevice: slow(fakeRepo.moveDevice) }
})
vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"
import { claimThisDevice } from "@/src/notifications/pushClient"

beforeEach(() => window.localStorage.clear())
afterEach(leaveTheWorld)

async function fiveHoursAway(row: { enabled: boolean; timerRunning: boolean }) {
  const w = aWorld({ key: OLD_KEY, post: POST, row })
  world.serverKey = OLD_KEY
  expect(await claimThisDevice()).toBe("ok")
  world.serverKey = NEW_KEY
  for (let i = 0; i < 20; i++) ping()
  expect(rowsOf("me")[0]).toMatchObject({ enabled: false, timerRunning: false })
  w.fetch.mockClear()
  return w
}

describe("a page whose two parts heal a key change at the same moment", () => {
  it("sends one registration, and the device gets its pings and its timer back", async () => {
    const w = await fiveHoursAway({ enabled: true, timerRunning: true })
    expect(await Promise.all([claimThisDevice(), claimThisDevice()])).toEqual(["ok", "ok"])
    expect(w.posted()).toHaveLength(1)
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: world.current?.endpoint, enabled: true, timerRunning: true, failures: 0 })])
    expect(ping().delivered).toBe(1)
  })
})

describe("two posts of the same move racing at the server (two tabs without Web Locks)", () => {
  it("leave the switches as the phone last heard them", async () => {
    await fiveHoursAway({ enabled: true, timerRunning: true })
    // the new subscription, as the page would post it
    const { subscriptionForPage } = await import("@/src/notifications/pushClient")
    const registration = await navigator.serviceWorker.getRegistration()
    const here = await subscriptionForPage(registration!)
    const body = JSON.stringify({ subscription: here!.subscription.toJSON(), intent: "refresh", label: "", oldEndpoint: here!.oldEndpoint, was: here!.was })
    const post = () => POST(new Request("http://x/api/notifications/devices", { method: "POST", body, headers: { "Content-Type": "application/json" } }))
    const answers = await Promise.all([post(), post()])
    expect(answers.map((a) => a.status)).toEqual([200, 200])
    expect(rowsOf("me")).toEqual([expect.objectContaining({ endpoint: here!.subscription.endpoint, enabled: true, timerRunning: true })])
    for (const a of answers) expect(await a.json()).toMatchObject({ enabled: true, timerRunning: true })
  })
})
