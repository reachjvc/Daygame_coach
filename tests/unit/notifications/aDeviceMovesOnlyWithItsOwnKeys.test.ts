/**
 * ANOTHER ACCOUNT'S DEVICE MOVES ONLY FOR A BROWSER THAT HOLDS ITS KEYS.
 *
 * Found by the security review of the account-switching fixes (2026-11-05, low).
 * Registering a browser for its push address (`POST /api/notifications/devices`,
 * "enable", "timer" or "refresh") moved a row that belonged to another account to
 * whoever posted its address — with any keys at all. So anybody who learned
 * somebody's address could take their device: that person's reminders and
 * running timer stopped reaching them, and the next pushes went out encrypted to
 * keys of the taker's choosing.
 *
 * The case the move is for — the next person signed in on a shared browser —
 * posts the very keys stored with the row, because they are that browser's. Now
 * another account's row moves only then. Otherwise nothing changes, and the
 * answer is the one an address nobody registered would get from "refresh", or an
 * unusable address from "enable" and "timer": it does not say whose it is.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const repo = vi.hoisted(() => ({
  deviceByEndpoint: vi.fn(),
  registerDevice: vi.fn(async () => "d-new"),
  moveDevice: vi.fn(async () => false),
  listDevices: vi.fn(async () => []),
}))

vi.mock("@/src/db/auth", () => ({ requireAuth: vi.fn(async () => ({ success: true, userId: "b", supabase: {} })) }))
vi.mock("@/src/db/notificationsRepo", () => repo)
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
vi.mock("@/src/timetrack/runningTimerService", () => ({ announceCurrentTimer: vi.fn() }))

import { POST } from "@/app/api/notifications/devices/route"

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123"
const A_KEYS = { p256dh: "BNcRaaaa", auth: "tBHIaaaa" }
const OTHER_KEYS = { p256dh: "BNcRzzzz", auth: "tBHIzzzz" }

async function post(intent: "enable" | "timer" | "refresh", keys: { p256dh: string; auth: string }) {
  const res = await POST(
    new NextRequest("http://x/api/notifications/devices", {
      method: "POST",
      body: JSON.stringify({ intent, label: "Android phone · installed app", subscription: { endpoint: ENDPOINT, keys } }),
    }),
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

beforeEach(() => {
  vi.clearAllMocks()
  // the address is A's device, registered with A's browser's keys
  repo.deviceByEndpoint.mockResolvedValue({ id: "d-a", userId: "a", enabled: true, timerRunning: true, ...A_KEYS })
})

describe("posting another account's address", () => {
  for (const intent of ["enable", "timer", "refresh"] as const) {
    it(`with other keys does not take the device ("${intent}")`, async () => {
      const answer = await post(intent, OTHER_KEYS)

      expect(repo.registerDevice, "A's device was moved to B with keys B chose").not.toHaveBeenCalled()
      expect(JSON.stringify(answer.body)).not.toContain("d-a")
    })
  }

  it("with other keys answers \"refresh\" as for an address nobody registered", async () => {
    const taken = await post("refresh", OTHER_KEYS)
    repo.deviceByEndpoint.mockResolvedValue(null)
    const unknown = await post("refresh", OTHER_KEYS)

    expect(taken).toEqual(unknown)
  })

  it("with the browser's own keys moves it, switched off: the next person on a shared browser", async () => {
    const answer = await post("refresh", A_KEYS)

    expect(answer.body).toMatchObject({ id: "d-new", enabled: false, timerRunning: false })
    expect(repo.registerDevice).toHaveBeenCalledWith("b", expect.objectContaining({ endpoint: ENDPOINT, ...A_KEYS }), false, false)
  })
})

describe("posting an address that is already this account's", () => {
  it("still updates its keys, whatever they are: a browser may replace them", async () => {
    repo.deviceByEndpoint.mockResolvedValue({ id: "d-b", userId: "b", enabled: true, timerRunning: false, ...A_KEYS })

    await post("refresh", OTHER_KEYS)

    expect(repo.registerDevice).toHaveBeenCalledWith("b", expect.objectContaining(OTHER_KEYS), true, false)
  })
})
