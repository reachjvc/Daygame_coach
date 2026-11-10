// @vitest-environment jsdom
/**
 * WITH NO SIGNAL, THE PAGE STILL KNOWS WHERE PINGS GO (alpha prove-slow-02).
 *
 * A phone that gets pings, in airplane mode, opened /audit: the device list
 * could not be read, so "no device gets pings" was assumed and the big
 * "Turn on pings for this device" offer showed above "No signal: this is what
 * this phone last read".
 *
 * Now the hook keeps the last list it read on the phone and answers with it
 * when the server cannot be reached, still saying the list was not read now
 * (`devicesKnown` false), so no screen offers to turn pings on from it. The
 * kept list goes at sign-out with the other copies, and is used only by the
 * account it was read for: another account signed in here (a session that
 * ended without Log Out, a sign-up) has it removed unseen.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("@/src/notifications/pushClient", () => ({
  pushSupport: () => "ready",
  permission: () => "default",
  isInstalledApp: () => false,
  isAppleTouch: () => false,
  workerRegistration: async () => null,
  subscribe: async () => null,
  subscriptionForPage: async () => null,
  movedFrom: () => null,
  moveSettled: () => {},
  moveFor: () => ({}),
  registrationAnswered: () => {},
  switchesChanged: () => {},
  deviceRemoved: () => {},
  forgetThisDevice: async () => {},
  forgetTimerOnThisDevice: async () => {},
}))

import { usePushDevice } from "@/src/notifications/hooks/usePushDevice"
import { noPingDevice } from "@/src/audit/components/PingDevices"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"

const PHONE = {
  id: "6f1c2a8e-1b2c-4d3e-8f4a-5b6c7d8e9f00",
  label: "Android phone · Chrome",
  enabled: true,
  timerRunning: false,
  lastSuccessAt: null,
  createdAt: "2026-11-09T20:00:00.000Z",
}

let online = true
const A = "a1c2a8e0-0000-4000-8000-00000000000a"
const B = "b1c2a8e0-0000-4000-8000-00000000000b"

beforeEach(() => {
  online = true
  window.localStorage.clear()
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!online) throw new TypeError("Failed to fetch")
      if (url === "/api/notifications/devices") return Response.json({ devices: [PHONE] })
      return Response.json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe("the device list with no signal", () => {
  it("is the last list this phone read, not known as read now", async () => {
    const first = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(first.result.current.devicesKnown).toBe(true))
    first.unmount()

    online = false
    const offline = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(offline.result.current.devices).toEqual([PHONE]))
    expect(offline.result.current.devicesKnown).toBe(false)
    expect(noPingDevice(offline.result.current)).toBe(false)
  })

  it("is empty and unknown when this phone never read one", async () => {
    online = false
    const offline = renderHook(() => usePushDevice({ account: A }))
    // the read was tried and failed
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(offline.result.current.devices).toEqual([])
    expect(offline.result.current.devicesKnown).toBe(false)
  })

  it("goes at sign-out", async () => {
    const first = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(first.result.current.devicesKnown).toBe(true))
    first.unmount()
    await forgetOfflineCopies()

    online = false
    const offline = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(offline.result.current.devices).toEqual([])
  })

  it("is never another account's: a different account signed in here removes it unseen", async () => {
    const first = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(first.result.current.devicesKnown).toBe(true))
    first.unmount()

    online = false
    const other = renderHook(() => usePushDevice({ account: B }))
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(other.result.current.devices).toEqual([])
    expect(window.localStorage.getItem("push-devices-copy-v1")).toBeNull()
  })

  it("is not used by a page that names no account", async () => {
    const first = renderHook(() => usePushDevice({ account: A }))
    await waitFor(() => expect(first.result.current.devicesKnown).toBe(true))
    first.unmount()
    online = false
    const anon = renderHook(() => usePushDevice())
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(anon.result.current.devices).toEqual([])
  })
})
