// @vitest-environment jsdom
/**
 * "SHOW THE RUNNING TIMER ON THIS DEVICE" IS THIS DEVICE'S OWN SWITCH
 * (Plans/time-tracker-like-toggl.md, Phase 7, item 4).
 *
 * Rendered with the real `usePushDevice` hook and the server faked at `fetch`;
 * the browser's push plumbing (`pushClient`) is faked too, since jsdom has no
 * worker. What is checked is what the person sees and what is sent:
 *
 *   - the switch shows what the SERVER holds for this device;
 *   - switching it off PATCHes `timerRunning: false` for this device only, and
 *     takes the timer off this screen at once;
 *   - switching it on in a browser not registered yet asks for permission and
 *     registers with intent "timer", never switching reminders on;
 *   - the one line about Android's lock-screen setting is there;
 *   - an iPhone outside the Home Screen app is told why it cannot work.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const client = vi.hoisted(() => ({
  support: "ready" as "ready" | "needs-install" | "unsupported" | "dev",
  permission: "granted" as NotificationPermission,
  installed: true,
  subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcR", auth: "tBHI" } }) },
}))

vi.mock("@/src/notifications/pushClient", () => ({
  pushSupport: () => client.support,
  permission: () => client.permission,
  isInstalledApp: () => client.installed,
  isAppleTouch: () => false,
  workerRegistration: async () => ({ pushManager: { getSubscription: async () => client.subscription } }),
  subscribe: async () => client.subscription,
}))

import { LOCK_SCREEN_NOTE, RunningTimerSetting } from "@/src/timetrack/components/RunningTimerSetting"

type Call = { url: string; method: string; body: Record<string, unknown> | null }
let calls: Call[] = []
let device: { id: string | null; enabled: boolean; timerRunning: boolean }
const closed: string[] = []

beforeEach(() => {
  calls = []
  closed.length = 0
  client.support = "ready"
  client.permission = "granted"
  client.installed = true
  device = { id: "6f1c2a8e-1b2c-4d3e-8f4a-5b6c7d8e9f00", enabled: true, timerRunning: true }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null
      calls.push({ url, method: init?.method ?? "GET", body })
      if (url === "/api/notifications/devices" && init?.method === "POST") {
        if (body?.intent === "timer") device = { id: "7a1c2a8e-1b2c-4d3e-8f4a-5b6c7d8e9f00", enabled: false, timerRunning: true }
        return Response.json(device)
      }
      if (url === "/api/notifications/devices") return Response.json({ devices: [] })
      if (url === "/api/notifications/key") return Response.json({ publicKey: "BPub" })
      return Response.json({ ok: true })
    }),
  )
  vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn(async () => "granted") })
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        getNotifications: async ({ tag }: { tag: string }) => [{ close: () => void closed.push(tag) }],
      }),
    },
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const theSwitch = () => screen.getByRole("switch", { name: "Show the running timer on this device" })

describe("the running timer switch", () => {
  test("shows what the server holds for this device, with the lock-screen line", async () => {
    render(<RunningTimerSetting />)
    await waitFor(() => expect(theSwitch()).toHaveAttribute("aria-checked", "true"))
    expect(screen.getByText(LOCK_SCREEN_NOTE)).toBeInTheDocument()
    expect(LOCK_SCREEN_NOTE).toMatch(/Android/)
  })

  test("off: PATCHes this device's timer only, and takes the timer off this screen", async () => {
    render(<RunningTimerSetting />)
    await waitFor(() => expect(theSwitch()).toHaveAttribute("aria-checked", "true"))
    await userEvent.click(theSwitch())

    await waitFor(() => expect(theSwitch()).toHaveAttribute("aria-checked", "false"))
    const patch = calls.find((c) => c.method === "PATCH")
    expect(patch).toEqual({ url: `/api/notifications/devices/${device.id}`, method: "PATCH", body: { timerRunning: false } })
    expect(closed).toEqual(["timer-running"])
  })

  test("on, in a desktop browser not registered yet: asks, then registers for the timer only", async () => {
    client.installed = false
    client.permission = "default"
    device = { id: null, enabled: false, timerRunning: false }
    render(<RunningTimerSetting />)
    expect(theSwitch()).toHaveAttribute("aria-checked", "false")
    expect(screen.getByText(/Off by default in a desktop browser/)).toBeInTheDocument()

    client.permission = "granted"
    await userEvent.click(theSwitch())

    await waitFor(() => expect(theSwitch()).toHaveAttribute("aria-checked", "true"))
    const registered = calls.find((c) => c.method === "POST" && c.url === "/api/notifications/devices")
    expect(registered?.body).toMatchObject({ intent: "timer" })
    expect(calls.some((c) => c.url === "/api/notifications/test"), "no test reminder: reminders were not asked for").toBe(false)
  })

  test("signing out takes the timer off this screen and drops a stop still waiting for signal", async () => {
    const deleted: string[] = []
    vi.stubGlobal("indexedDB", { deleteDatabase: (name: string) => void deleted.push(name) })
    const { forgetTimerOnThisDevice } = await vi.importActual<typeof import("@/src/notifications/pushClient")>("@/src/notifications/pushClient")

    await forgetTimerOnThisDevice()

    expect(closed).toEqual(["timer-running"])
    expect(deleted).toEqual(["timer-stops"])
  })

  test("an iPhone outside the Home Screen app is told why, and the switch does nothing", async () => {
    client.support = "needs-install"
    client.permission = "default"
    device = { id: null, enabled: false, timerRunning: false }
    render(<RunningTimerSetting />)
    await waitFor(() => expect(screen.getByText(/add the app to the Home Screen/)).toBeInTheDocument())
    await userEvent.click(theSwitch())
    expect(calls.filter((c) => c.method !== "GET")).toEqual([])
  })
})
