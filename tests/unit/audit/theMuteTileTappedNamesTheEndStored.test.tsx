// @vitest-environment jsdom
/**
 * THE MUTE TILE TAPPED NAMES THE END STORED, EVEN RIGHT AT A QUARTER (alpha
 * p10-sheets-03).
 *
 * Firefox redrew the open sheet's tiles 57-65 ms after a quarter: a tap in that
 * gap said "until 19:15" and the server, working the end out from its own
 * clock, stored 19:30. Now the sheet sends the end the tile showed, and the
 * server stores it when it is the option's end at a moment just before now.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { muteEnd, muteUntil, MUTE_SHOWN_GRACE_MS } from "@/src/audit/auditService"
import { MuteSheet } from "@/src/audit/components/MuteSheet"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"

const run = { mutedUntil: null, quietStart: 1320, quietEnd: 420 }
const push = { support: "needs-install", permission: "default", thisDevice: null, devices: [], devicesKnown: true, busy: false, error: null } as unknown as PushDeviceState

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("the end a mute stores", () => {
  test("a tap 60 ms after the quarter stores the end its tile showed, not the next quarter's", () => {
    const now = new Date("2026-11-10T19:00:00.060Z")
    expect(muteUntil("30m", run, now, "UTC")!.toISOString()).toBe("2026-11-10T19:30:00.000Z")
    expect(muteEnd("30m", run, now, "UTC", "2026-11-10T19:15:00.000Z")!.toISOString()).toBe("2026-11-10T19:15:00.000Z")
  })

  test("an end no tile could have shown just now is not taken: the server's own is stored", () => {
    const now = new Date("2026-11-10T19:00:00.060Z")
    expect(muteEnd("30m", run, now, "UTC", "2026-11-10T23:00:00.000Z")!.toISOString()).toBe("2026-11-10T19:30:00.000Z")
    const stale = new Date(now.getTime() - MUTE_SHOWN_GRACE_MS - 15 * 60_000)
    expect(muteEnd("30m", run, now, "UTC", muteUntil("30m", run, stale, "UTC")!.toISOString())!.toISOString()).toBe("2026-11-10T19:30:00.000Z")
    expect(muteEnd("30m", run, now, "UTC", "not a time")!.toISOString()).toBe("2026-11-10T19:30:00.000Z")
    expect(muteEnd("off", run, now, "UTC", "2026-11-10T19:15:00.000Z")).toBeNull()
  })

  test("the sheet sends the end its tile shows, though the quarter passed before it was redrawn", () => {
    vi.useFakeTimers({ now: new Date("2026-11-10T18:59:59.990Z") })
    const onMute = vi.fn(async () => null)
    render(<MuteSheet open onClose={() => {}} run={run} timezone="UTC" onMute={onMute} push={push} onOpenSettings={() => {}} />)
    const tile = screen.getByRole("button", { name: /30 min/ })
    expect(tile.textContent).toContain("until 19:15")
    // the quarter passes; this browser has not redrawn yet
    vi.setSystemTime(new Date("2026-11-10T19:00:00.060Z"))
    fireEvent.click(tile)
    expect(onMute).toHaveBeenCalledWith("30m", "2026-11-10T19:15:00.000Z")
  })
})
