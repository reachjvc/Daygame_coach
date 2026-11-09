/**
 * "TURN ON" AFTER A KEY CHANGE MOVES THE DEVICE, IT DOES NOT START IT AGAIN
 * (security review of prove-slow-01, sev 5).
 *
 * A subscription made with an earlier server key is replaced when the person
 * taps "Turn on pings" or the running-timer switch. The browser names the
 * address it had (`oldEndpoint`), and the person's own row there moves to the
 * new address: its timer switch and label stay as they were, rather than a
 * second row starting with defaults while the first points at a dead address.
 * Only to an address no device has yet: an address that is somebody's keeps
 * the checks it always had (`aDeviceMovesOnlyWithItsOwnKeys`).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const OLD = "https://fcm.googleapis.com/fcm/send/old"
const NEW = "https://fcm.googleapis.com/fcm/send/new"
const KEYS = { p256dh: "BNcRnew", auth: "tBHInew" }

const rows = vi.hoisted(() => new Map<string, { id: string; userId: string; enabled: boolean; timerRunning: boolean; p256dh: string; auth: string }>())
const repo = vi.hoisted(() => ({
  deviceByEndpoint: vi.fn(async (endpoint: string) => rows.get(endpoint) ?? null),
  registerDevice: vi.fn(async () => "d-row"),
  moveDevice: vi.fn(async (userId: string, from: string, next: { endpoint: string; p256dh: string; auth: string }) => {
    const row = rows.get(from)
    if (!row || row.userId !== userId) return false
    rows.delete(from)
    rows.set(next.endpoint, { ...row, p256dh: next.p256dh, auth: next.auth })
    return true
  }),
  listDevices: vi.fn(async () => []),
}))

vi.mock("@/src/db/auth", () => ({ requireAuth: vi.fn(async () => ({ success: true, userId: "me", supabase: {} })) }))
vi.mock("@/src/db/notificationsRepo", () => repo)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"

async function post(intent: "enable" | "timer", oldEndpoint?: string) {
  const res = await POST(
    new NextRequest("http://x/api/notifications/devices", {
      method: "POST",
      body: JSON.stringify({ intent, label: "Android phone · Chrome", subscription: { endpoint: NEW, keys: KEYS }, ...(oldEndpoint ? { oldEndpoint } : {}) }),
    }),
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

beforeEach(() => {
  vi.clearAllMocks()
  rows.clear()
  // the phone's own row at its old address: pings off, the running timer on
  rows.set(OLD, { id: "d-phone", userId: "me", enabled: false, timerRunning: true, p256dh: "BNcRold", auth: "tBHIold" })
})

describe("turning pings on with a subscription replaced for a new key", () => {
  it("moves the person's own row to the new address and keeps its timer switch", async () => {
    const answer = await post("enable", OLD)
    expect(repo.moveDevice).toHaveBeenCalledWith("me", OLD, expect.objectContaining({ endpoint: NEW, ...KEYS }))
    expect(answer.body).toMatchObject({ enabled: true, timerRunning: true })
    expect(repo.registerDevice).toHaveBeenCalledWith("me", expect.objectContaining({ endpoint: NEW }), true, true)
  })

  it("the timer switch, too, keeps the row's pings switch", async () => {
    rows.set(OLD, { id: "d-phone", userId: "me", enabled: true, timerRunning: false, p256dh: "BNcRold", auth: "tBHIold" })
    const answer = await post("timer", OLD)
    expect(answer.body).toMatchObject({ enabled: true, timerRunning: true })
  })

  it("does not move a row onto an address some device already has", async () => {
    rows.set(NEW, { id: "d-other", userId: "someone", enabled: true, timerRunning: false, p256dh: "x", auth: "y" })
    await post("enable", OLD)
    expect(repo.moveDevice).not.toHaveBeenCalled()
  })
})
