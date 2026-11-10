// @vitest-environment jsdom
/**
 * THE PING HELP, ONCE (alpha prove-eye-03, owner note K-A4). The "turn on
 * pings" box showed on Today, in the Mute sheet and in Settings; on iPhone it
 * pushed the mute choices below the fold. The full help lives in Settings;
 * Mute says it in one line, with the way there.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { MuteSheet } from "@/src/audit/components/MuteSheet"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"

const noDevice = {
  support: "needs-install",
  permission: "default",
  thisDevice: null,
  devices: [],
  devicesKnown: true,
  busy: false,
  error: null,
  turnOn: async () => {},
  setTimer: async () => {},
  setEnabled: async () => {},
  remove: async () => {},
  sendTest: async () => "",
  reloadDevices: async () => {},
} as unknown as PushDeviceState

afterEach(cleanup)

describe("the Mute sheet with no device getting pings", () => {
  test("shows the mute choices and one line to Settings, not the install steps", () => {
    let opened = 0
    render(
      <MuteSheet open onClose={() => {}} run={{ mutedUntil: null, quietStart: 1320, quietEnd: 420 }} timezone="Europe/Copenhagen" onMute={async () => null} push={noDevice} onOpenSettings={() => opened++} />,
    )
    expect(screen.getByTestId("audit-mute-state").textContent).toContain("No device gets pings")
    expect(screen.queryByTestId("audit-pings-install")).toBeNull()
    expect(screen.queryByText("Pings need the Home Screen app")).toBeNull()
    expect(screen.getByRole("button", { name: /30 min/ })).toBeTruthy()
    fireEvent.click(screen.getByTestId("audit-mute-setup"))
    expect(opened).toBe(1)
  })
})

/**
 * THE TILE NAMES THE END THE SERVER STORES (alpha p9-sheet-03). The tiles were
 * worked out once, when the sheet drew; opened 20 s before a quarter and
 * tapped just after it, "30 min · until 08:45" stored 09:00.
 */
describe("the Mute sheet across a quarter boundary", () => {
  afterEach(() => vi.useRealTimers())

  test("each tile's end moves on at the boundary, with the sheet left open", () => {
    vi.useFakeTimers({ now: new Date("2026-11-10T08:29:40.000Z") })
    render(<MuteSheet open onClose={() => {}} run={{ mutedUntil: null, quietStart: 1320, quietEnd: 420 }} timezone="UTC" onMute={async () => null} push={noDevice} onOpenSettings={() => {}} />)
    expect(screen.getByRole("button", { name: /30 min/ }).textContent).toContain("until 08:45")
    act(() => void vi.advanceTimersByTime(24_000))
    expect(screen.getByRole("button", { name: /30 min/ }).textContent).toContain("until 09:00")
  })
})
